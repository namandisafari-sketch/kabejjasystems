import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { pesapalService } from '@/lib/pesapal-service';
import type { PesapalOrderRequest, PaymentRecord } from '@/types/payment-types';
import { toast } from 'sonner';

interface InitiatePaymentParams {
    packageId: string;
    amount: number;
    billingEmail: string;
    billingPhone: string;
    firstName: string;
    lastName: string;
}

export function usePesapalPayment() {
    const queryClient = useQueryClient();

    // Get or create IPN ID (only needs to be done once per deployment)
    const { data: ipnId } = useQuery({
        queryKey: ['pesapal-ipn-id'],
        queryFn: async () => {
            const ipnUrl = import.meta.env.VITE_PESAPAL_IPN_URL;
            if (!ipnUrl) {
                throw new Error('IPN URL not configured');
            }

            // In production, you'd store this IPN ID in your database
            // For now, we'll register it each time (Pesapal handles duplicates gracefully)
            try {
                const ipnId = await pesapalService.registerIPN(ipnUrl, 'POST');
                return ipnId;
            } catch (error) {
                console.error('Failed to register IPN:', error);
                throw error;
            }
        },
        staleTime: Infinity, // IPN ID doesn't change often
        retry: 3,
    });

    // Initiate payment mutation
    const initiatePayment = useMutation({
        mutationFn: async (params: InitiatePaymentParams) => {
            if (!ipnId) {
                throw new Error('Payment system not ready. Please try again.');
            }

            // Get current user and tenant
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) {
                throw new Error('Tenant not found');
            }

            // Generate unique merchant reference
            const merchantRef = `KBJ-${profile.tenant_id.substring(0, 8)}-${Date.now()}`;

            // Create payment record in database
            const { data: paymentRecord, error: dbError } = await supabase
                .from('payments')
                .insert({
                    tenant_id: profile.tenant_id,
                    package_id: params.packageId,
                    pesapal_merchant_reference: merchantRef,
                    amount: params.amount,
                    currency: 'UGX',
                    payment_status: 'pending',
                    billing_email: params.billingEmail,
                    billing_phone: params.billingPhone,
                })
                .select()
                .single();

            if (dbError || !paymentRecord) {
                throw new Error('Failed to create payment record');
            }

            // Prepare Pesapal order request
            const callbackUrl = import.meta.env.VITE_PESAPAL_CALLBACK_URL || `${window.location.origin}/payment/callback`;

            const orderRequest: PesapalOrderRequest = {
                id: merchantRef,
                currency: 'UGX',
                amount: params.amount,
                description: `Subscription Payment - ${merchantRef}`,
                callback_url: callbackUrl,
                notification_id: ipnId,
                billing_address: {
                    email_address: params.billingEmail,
                    phone_number: params.billingPhone,
                    country_code: 'UG',
                    first_name: params.firstName,
                    last_name: params.lastName,
                },
            };

            // Submit order to Pesapal
            const orderResponse = await pesapalService.submitOrderRequest(orderRequest);

            // Update payment record with tracking ID
            await supabase
                .from('payments')
                .update({
                    pesapal_tracking_id: orderResponse.order_tracking_id,
                })
                .eq('id', paymentRecord.id);

            return {
                paymentId: paymentRecord.id,
                trackingId: orderResponse.order_tracking_id,
                redirectUrl: orderResponse.redirect_url,
                merchantReference: merchantRef,
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            toast.success('Payment initiated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to initiate payment');
        },
    });

    // Poll payment status
    const checkPaymentStatus = useQuery({
        queryKey: ['payment-status'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) return null;

            // Get latest pending payment
            const { data: payment } = await supabase
                .from('payments')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .eq('payment_status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!payment?.pesapal_tracking_id) return null;

            // Check status from Pesapal
            try {
                const status = await pesapalService.getTransactionStatus(payment.pesapal_tracking_id);
                const paymentStatus = pesapalService.getPaymentStatus(status.status_code);

                // Update local database if status changed
                if (paymentStatus !== payment.payment_status) {
                    await supabase
                        .from('payments')
                        .update({
                            payment_status: paymentStatus,
                            payment_method: status.payment_method,
                            confirmation_code: status.confirmation_code,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', payment.id);

                    // If payment completed, update tenant subscription
                    if (paymentStatus === 'completed') {
                        await updateTenantSubscription(profile.tenant_id, payment.package_id);
                        queryClient.invalidateQueries({ queryKey: ['subscription-check'] });
                        toast.success('Payment successful! Your subscription is now active.');
                    }
                }

                return {
                    ...payment,
                    payment_status: paymentStatus,
                    transaction_details: status,
                };
            } catch (error) {
                console.error('Failed to check payment status:', error);
                return payment;
            }
        },
        enabled: false, // Only run when explicitly called
        refetchInterval: false,
    });

    return {
        initiatePayment,
        checkPaymentStatus,
        isInitiating: initiatePayment.isPending,
    };
}

// Helper function to update tenant subscription after successful payment
async function updateTenantSubscription(tenantId: string, packageId: string) {
    // Get package details
    const { data: pkg } = await supabase
        .from('subscription_packages')
        .select('billing_cycle_months')
        .eq('id', packageId)
        .single();

    if (!pkg) return;

    const monthsToAdd = pkg.billing_cycle_months || 1;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    // Update tenant
    await supabase
        .from('tenants')
        .update({
            subscription_status: 'active',
            subscription_end_date: endDate.toISOString(),
            is_trial: false,
            updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);
}
