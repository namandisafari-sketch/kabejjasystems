import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { auth, db } from '@/config/firebase';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
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

export function usePesapalPaymentFirebase() {
    const queryClient = useQueryClient();

    // Get or create IPN ID (only needs to be done once per deployment)
    const { data: ipnId } = useQuery({
        queryKey: ['pesapal-ipn-id'],
        queryFn: async () => {
            const ipnUrl = import.meta.env.VITE_PESAPAL_IPN_URL;
            if (!ipnUrl) {
                throw new Error('IPN URL not configured');
            }

            try {
                const ipnId = await pesapalService.registerIPN(ipnUrl, 'POST');
                return ipnId;
            } catch (error) {
                console.error('Failed to register IPN:', error);
                throw error;
            }
        },
        staleTime: Infinity,
        retry: 3,
    });

    // Initiate payment mutation
    const initiatePayment = useMutation({
        mutationFn: async (params: InitiatePaymentParams) => {
            if (!ipnId) {
                throw new Error('Payment system not ready. Please try again.');
            }

            // Get current user
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Get user's tenant from their profile
            const profilesRef = collection(db, 'profiles');
            const profileQuery = query(profilesRef, where('uid', '==', user.uid), limit(1));
            const profileSnapshot = await getDocs(profileQuery);

            if (profileSnapshot.empty) {
                throw new Error('User profile not found');
            }

            const profile = profileSnapshot.docs[0].data();
            const tenantId = profile.tenantId;

            if (!tenantId) {
                throw new Error('Tenant not found');
            }

            // Generate unique merchant reference
            const merchantRef = `KBJ-${tenantId.substring(0, 8)}-${Date.now()}`;

            // Create payment record in Firestore
            const paymentsRef = collection(db, 'payments');
            const paymentData = {
                tenantId,
                packageId: params.packageId,
                pesapalMerchantReference: merchantRef,
                pesapalTrackingId: '',
                amount: params.amount,
                currency: 'UGX',
                paymentStatus: 'pending',
                billingEmail: params.billingEmail,
                billingPhone: params.billingPhone,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            const paymentDoc = await addDoc(paymentsRef, paymentData);

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
            await updateDoc(doc(db, 'payments', paymentDoc.id), {
                pesapalTrackingId: orderResponse.order_tracking_id,
                updatedAt: Timestamp.now(),
            });

            return {
                paymentId: paymentDoc.id,
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
            const user = auth.currentUser;
            if (!user) return null;

            // Get user's tenant
            const profilesRef = collection(db, 'profiles');
            const profileQuery = query(profilesRef, where('uid', '==', user.uid), limit(1));
            const profileSnapshot = await getDocs(profileQuery);

            if (profileSnapshot.empty) return null;

            const profile = profileSnapshot.docs[0].data();
            const tenantId = profile.tenantId;

            if (!tenantId) return null;

            // Get latest pending payment
            const paymentsRef = collection(db, 'payments');
            const paymentsQuery = query(
                paymentsRef,
                where('tenantId', '==', tenantId),
                where('paymentStatus', '==', 'pending'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            const paymentsSnapshot = await getDocs(paymentsQuery);

            if (paymentsSnapshot.empty) return null;

            const paymentDocSnap = paymentsSnapshot.docs[0];
            const payment: any = { id: paymentDocSnap.id, ...paymentDocSnap.data() };

            if (!payment.pesapalTrackingId) return null;

            // Check status from Pesapal
            try {
                const status = await pesapalService.getTransactionStatus(payment.pesapalTrackingId);
                const paymentStatus = pesapalService.getPaymentStatus(status.status_code);

                // Update local database if status changed
                if (paymentStatus !== payment.paymentStatus) {
                    await updateDoc(doc(db, 'payments', payment.id), {
                        paymentStatus,
                        paymentMethod: status.payment_method,
                        confirmationCode: status.confirmation_code,
                        updatedAt: Timestamp.now(),
                    });

                    // If payment completed, update tenant subscription
                    if (paymentStatus === 'completed') {
                        await updateTenantSubscription(tenantId, payment.packageId);
                        queryClient.invalidateQueries({ queryKey: ['subscription-check'] });
                        toast.success('Payment successful! Your subscription is now active.');
                    }
                }

                return {
                    ...payment,
                    paymentStatus,
                    transactionDetails: status,
                };
            } catch (error) {
                console.error('Failed to check payment status:', error);
                return payment;
            }
        },
        enabled: false,
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
    const packageDoc = await getDocs(query(collection(db, 'subscriptionPackages'), where('__name__', '==', packageId), limit(1)));

    if (packageDoc.empty) return;

    const pkg = packageDoc.docs[0].data();
    const monthsToAdd = pkg.billingCycleMonths || 1;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    // Update tenant
    const tenantsQuery = query(collection(db, 'tenants'), where('__name__', '==', tenantId), limit(1));
    const tenantSnapshot = await getDocs(tenantsQuery);

    if (!tenantSnapshot.empty) {
        const tenantDocRef = tenantSnapshot.docs[0].ref;
        await updateDoc(tenantDocRef, {
            subscriptionStatus: 'active',
            subscriptionEndDate: Timestamp.fromDate(endDate),
            isTrial: false,
            updatedAt: Timestamp.now(),
        });
    }
}
