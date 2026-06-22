import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentPackageSelector, type NormalizedPackage } from '@/components/payment/PaymentPackageSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, CheckCircle, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from "@/i18n";

type PaymentStep = 'select-package' | 'billing-info' | 'submitted';

export default function PaymentPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const [step, setStep] = useState<PaymentStep>('select-package');
    const [selectedPackage, setSelectedPackage] = useState<NormalizedPackage | null>(null);

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
                .select('full_name, phone, tenant_id')
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

            return { ...profile, email: user.email };
        },
    });

    // Submit subscription request mutation
    const submitRequest = useMutation({
        mutationFn: async (data: {
            packageId: string;
            amount: number;
            billingEmail: string;
            billingPhone: string;
            firstName: string;
            lastName: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { error } = await (supabase
                .from('subscription_requests')
                .insert({
                    tenant_id: profile.tenant_id,
                    package_id: data.packageId,
                    billing_cycle: 'monthly',
                    amount: data.amount,
                    billing_email: data.billingEmail,
                    billing_phone: data.billingPhone,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    status: 'pending',
                }) as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
            toast.success(t.common.success);
            setStep('submitted');
        },
        onError: (error) => {
            console.error('Failed to submit request:', error);
            toast.error(t.common.error);
        },
    });

    const handleSelectPackage = (pkg: NormalizedPackage) => {
        setSelectedPackage(pkg);
        setStep('billing-info');
    };

    const handleSubmitBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPackage) return;

        submitRequest.mutate({
            packageId: selectedPackage.id,
            amount: selectedPackage.price,
            billingEmail: billingInfo.email,
            billingPhone: billingInfo.phone,
            firstName: billingInfo.firstName,
            lastName: billingInfo.lastName,
        });
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    {step === 'billing-info' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStep('select-package')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold">{t.pages.subscriptionExpired.upgradeNow}</h1>
                        <p className="text-muted-foreground">
                            {step === 'select-package' && t.pages.pendingApproval.description}
                            {step === 'billing-info' && t.common.description}
                            {step === 'submitted' && t.common.success}
                        </p>
                    </div>
                </div>

                {/* Progress Indicator */}
                {step !== 'submitted' && (
                    <div className="flex items-center gap-2">
                        {['select-package', 'billing-info'].map((s, idx) => (
                            <div key={s} className="flex items-center flex-1">
                                <div
                                    className={`h-2 flex-1 rounded-full transition-colors ${step === s ? 'bg-primary' : idx < ['select-package', 'billing-info'].indexOf(step) ? 'bg-primary/50' : 'bg-muted'}`}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Step Content */}
                {step === 'select-package' && (
                    <PaymentPackageSelector
                        onSelectPackage={handleSelectPackage}
                        selectedPackageId={selectedPackage?.id}
                    />
                )}

                {step === 'billing-info' && selectedPackage && (
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>{t.settings.billing}</CardTitle>
                            <CardDescription>
                                {t.common.submit} {selectedPackage.name} ({selectedPackage.priceLabel.replace('/', '')})
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitBilling} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">{t.students.fullName} *</Label>
                                        <Input
                                            id="firstName"
                                            value={billingInfo.firstName}
                                            onChange={(e) => setBillingInfo({ ...billingInfo, firstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">{t.students.fullName} *</Label>
                                        <Input
                                            id="lastName"
                                            value={billingInfo.lastName}
                                            onChange={(e) => setBillingInfo({ ...billingInfo, lastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">{t.common.email} *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={billingInfo.email}
                                        onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t.common.phone} *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder={t.common.phone}
                                        value={billingInfo.phone}
                                        onChange={(e) => setBillingInfo({ ...billingInfo, phone: e.target.value })}
                                        required
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        {t.pages.pendingApproval.details}
                                    </p>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex justify-between items-center text-lg font-semibold">
                                        <span>{t.common.amount}:</span>
                                        <span>
                                            {new Intl.NumberFormat('en-UG', {
                                                style: 'currency',
                                                currency: 'UGX',
                                                minimumFractionDigits: 0,
                                            }).format(selectedPackage.price)}
                                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                                {selectedPackage.priceLabel}
                                            </span>
                                        </span>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={submitRequest.isPending}>
                                        {submitRequest.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                {t.common.submit}...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                {t.common.submit}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {step === 'submitted' && (
                    <Card className="max-w-2xl mx-auto">
                        <CardContent className="pt-8 text-center space-y-6">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">{t.common.success}</h2>
                                <p className="text-muted-foreground">
                                    {t.pages.pendingApproval.description}
                                </p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
                                <p><strong>{t.common.category}:</strong> {selectedPackage?.name}</p>
                                <p><strong>{t.common.amount}:</strong> {selectedPackage && new Intl.NumberFormat('en-UG', {
                                    style: 'currency',
                                    currency: 'UGX',
                                    minimumFractionDigits: 0,
                                }).format(selectedPackage.price)} {selectedPackage?.priceLabel}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t.pages.pendingApproval.details}
                            </p>
                            <div className="flex gap-3 justify-center pt-4">
                                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                                    {t.nav.dashboard}
                                </Button>
                                <Button onClick={() => navigate('/pending-approval')}>
                                    {t.common.view}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
