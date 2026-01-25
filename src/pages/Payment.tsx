import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePesapalPayment } from '@/hooks/use-pesapal-payment';
import { PaymentPackageSelector } from '@/components/payment/PaymentPackageSelector';
import { PesapalCheckout } from '@/components/payment/PesapalCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { SubscriptionPackage } from '@/types/payment-types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PaymentStep = 'select-package' | 'billing-info' | 'checkout';

export default function PaymentPage() {
    const navigate = useNavigate();
    const { initiatePayment, isInitiating } = usePesapalPayment();

    const [step, setStep] = useState<PaymentStep>('select-package');
    const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [checkoutData, setCheckoutData] = useState<{
        redirectUrl: string;
        merchantReference: string;
        trackingId: string;
        amount: number;
    } | null>(null);

    const [billingInfo, setBillingInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });

    // Get user info to pre-fill billing
    const { data: userProfile } = useQuery({
        queryKey: ['user-profile-for-billing'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', user.id)
                .single();

            if (profile) {
                const [firstName = '', lastName = ''] = (profile.full_name || '').split(' ');
                setBillingInfo({
                    firstName,
                    lastName: lastName || firstName,
                    email: user.email || '',
                    phone: profile.phone || '',
                });
            }

            return profile;
        },
    });

    const handleSelectPackage = (pkg: SubscriptionPackage, cycle: 'monthly' | 'yearly') => {
        setSelectedPackage(pkg);
        setBillingCycle(cycle);
        setStep('billing-info');
    };

    const handleSubmitBilling = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPackage) return;

        const amount = billingCycle === 'monthly' ? selectedPackage.price_monthly : selectedPackage.price_yearly;

        try {
            const result = await initiatePayment.mutateAsync({
                packageId: selectedPackage.id,
                amount,
                billingEmail: billingInfo.email,
                billingPhone: billingInfo.phone,
                firstName: billingInfo.firstName,
                lastName: billingInfo.lastName,
            });

            setCheckoutData({
                redirectUrl: result.redirectUrl,
                merchantReference: result.merchantReference,
                trackingId: result.trackingId,
                amount,
            });

            setStep('checkout');
        } catch (error) {
            console.error('Payment initiation failed:', error);
        }
    };

    const handlePaymentSuccess = () => {
        navigate('/dashboard');
    };

    const handlePaymentCancel = () => {
        setStep('select-package');
        setCheckoutData(null);
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    {step !== 'select-package' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (step === 'billing-info') setStep('select-package');
                                else if (step === 'checkout') setStep('billing-info');
                            }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold">Upgrade Your Subscription</h1>
                        <p className="text-muted-foreground">
                            {step === 'select-package' && 'Choose a plan that fits your business'}
                            {step === 'billing-info' && 'Enter your billing information'}
                            {step === 'checkout' && 'Complete your payment securely'}
                        </p>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2">
                    {['select-package', 'billing-info', 'checkout'].map((s, idx) => (
                        <div key={s} className="flex items-center flex-1">
                            <div
                                className={`h-2 flex-1 rounded-full transition-colors ${step === s ? 'bg-primary' : idx < ['select-package', 'billing-info', 'checkout'].indexOf(step) ? 'bg-primary/50' : 'bg-muted'
                                    }`}
                            />
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                {step === 'select-package' && (
                    <PaymentPackageSelector
                        onSelectPackage={handleSelectPackage}
                        selectedPackageId={selectedPackage?.id}
                        selectedCycle={billingCycle}
                    />
                )}

                {step === 'billing-info' && selectedPackage && (
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Billing Information</CardTitle>
                            <CardDescription>
                                Complete your purchase of {selectedPackage.name} (
                                {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'})
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitBilling} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name *</Label>
                                        <Input
                                            id="firstName"
                                            value={billingInfo.firstName}
                                            onChange={(e) => setBillingInfo({ ...billingInfo, firstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name *</Label>
                                        <Input
                                            id="lastName"
                                            value={billingInfo.lastName}
                                            onChange={(e) => setBillingInfo({ ...billingInfo, lastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={billingInfo.email}
                                        onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+256 700 000 000"
                                        value={billingInfo.phone}
                                        onChange={(e) => setBillingInfo({ ...billingInfo, phone: e.target.value })}
                                        required
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Use your MTN MoMo or Airtel Money number for payment
                                    </p>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex justify-between items-center text-lg font-semibold">
                                        <span>Total Amount:</span>
                                        <span>
                                            {new Intl.NumberFormat('en-UG', {
                                                style: 'currency',
                                                currency: 'UGX',
                                                minimumFractionDigits: 0,
                                            }).format(
                                                billingCycle === 'monthly' ? selectedPackage.price_monthly : selectedPackage.price_yearly
                                            )}
                                        </span>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isInitiating}>
                                        {isInitiating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Proceed to Payment'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {step === 'checkout' && checkoutData && (
                    <div className="max-w-4xl mx-auto">
                        <PesapalCheckout
                            redirectUrl={checkoutData.redirectUrl}
                            merchantReference={checkoutData.merchantReference}
                            amount={checkoutData.amount}
                            onSuccess={handlePaymentSuccess}
                            onCancel={handlePaymentCancel}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
