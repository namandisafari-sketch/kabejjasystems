import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import type { SubscriptionPackage } from '@/types/payment-types';

interface PaymentPackageSelectorProps {
    onSelectPackage: (pkg: SubscriptionPackage, billingCycle: 'monthly' | 'yearly') => void;
    selectedPackageId?: string;
    selectedCycle?: 'monthly' | 'yearly';
}

export function PaymentPackageSelector({
    onSelectPackage,
    selectedPackageId,
    selectedCycle = 'monthly',
}: PaymentPackageSelectorProps) {
    const { data: packages, isLoading, error } = useQuery({
        queryKey: ['subscription-packages'],
        queryFn: async () => {
            console.log('🔍 Fetching subscription packages...');

            const { data, error } = await supabase
                .from('subscription_packages')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true });

            console.log('📦 Query result:', { data, error });

            if (error) {
                console.error('❌ Error fetching packages:', error);
                throw error;
            }

            console.log('✅ Packages loaded:', data?.length || 0);
            return data as SubscriptionPackage[];
        },
    });

    // Log error if present
    if (error) {
        console.error('❌ Query error:', error);
    }


    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-32 bg-muted" />
                        <CardContent className="h-48 bg-muted/50" />
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardContent className="p-8 text-center space-y-4">
                    <p className="text-destructive font-semibold">Error loading subscription packages</p>
                    <p className="text-sm text-muted-foreground">
                        {error instanceof Error ? error.message : 'An unknown error occurred'}
                    </p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </CardContent>
            </Card>
        );
    }

    if (!packages || packages.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No subscription packages available at the moment.</p>
                </CardContent>
            </Card>
        );
    }

    const calculatePrice = (pkg: SubscriptionPackage, cycle: 'monthly' | 'yearly') => {
        if (cycle === 'yearly') {
            return pkg.price_yearly;
        }
        return pkg.price_monthly;
    };

    const calculateSavings = (pkg: SubscriptionPackage) => {
        const monthlyCost = pkg.price_monthly * 12;
        const yearlyCost = pkg.price_yearly;
        const savings = monthlyCost - yearlyCost;
        const savingsPercent = Math.round((savings / monthlyCost) * 100);
        return { amount: savings, percent: savingsPercent };
    };

    return (
        <div className="space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex justify-center gap-4">
                <Button
                    variant={selectedCycle === 'monthly' ? 'default' : 'outline'}
                    onClick={() => {
                        // Trigger re-selection with new cycle
                        if (selectedPackageId) {
                            const pkg = packages.find((p) => p.id === selectedPackageId);
                            if (pkg) onSelectPackage(pkg, 'monthly');
                        }
                    }}
                >
                    Monthly
                </Button>
                <Button
                    variant={selectedCycle === 'yearly' ? 'default' : 'outline'}
                    onClick={() => {
                        if (selectedPackageId) {
                            const pkg = packages.find((p) => p.id === selectedPackageId);
                            if (pkg) onSelectPackage(pkg, 'yearly');
                        }
                    }}
                >
                    Yearly
                    <Badge variant="secondary" className="ml-2">
                        Save up to 20%
                    </Badge>
                </Button>
            </div>

            {/* Package Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => {
                    const price = calculatePrice(pkg, selectedCycle);
                    const savings = calculateSavings(pkg);
                    const isSelected = pkg.id === selectedPackageId;
                    const isPopular = pkg.name.toLowerCase().includes('professional') || pkg.name.toLowerCase().includes('pro');

                    return (
                        <Card
                            key={pkg.id}
                            className={`relative transition-all ${isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
                                }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-gradient-to-r from-primary to-primary/80">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                                <CardDescription>{pkg.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Pricing */}
                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold">
                                            {new Intl.NumberFormat('en-UG', {
                                                style: 'currency',
                                                currency: 'UGX',
                                                minimumFractionDigits: 0,
                                            }).format(price)}
                                        </span>
                                        <span className="text-muted-foreground">/{selectedCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                    </div>
                                    {selectedCycle === 'yearly' && savings.percent > 0 && (
                                        <p className="text-sm text-green-600 dark:text-green-400">
                                            Save {savings.percent}% (UGX {savings.amount.toLocaleString()}) per year
                                        </p>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="space-y-2">
                                    {pkg.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={isSelected ? 'default' : 'outline'}
                                    onClick={() => onSelectPackage(pkg, selectedCycle)}
                                >
                                    {isSelected ? 'Selected' : 'Select Plan'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
