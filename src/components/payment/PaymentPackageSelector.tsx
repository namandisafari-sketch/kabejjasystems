import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';

export interface NormalizedPackage {
    id: string;
    name: string;
    description: string | null;
    price: number;
    priceLabel: string;
    features: string[];
}

interface PaymentPackageSelectorProps {
    onSelectPackage: (pkg: NormalizedPackage) => void;
    selectedPackageId?: string;
}

const SCHOOL_TYPES = ['primary_school', 'secondary_school', 'kindergarten', 'nursery', 'ecd_center'];
const RENTAL_TYPES = ['rental_management', 'property_management'];

function getSchoolLevel(businessType: string): string {
    if (businessType === 'kindergarten' || businessType === 'nursery' || businessType === 'ecd_center') return 'kindergarten';
    if (businessType === 'secondary_school') return 'secondary';
    return 'primary';
}

export function PaymentPackageSelector({
    onSelectPackage,
    selectedPackageId,
}: PaymentPackageSelectorProps) {
    const { data: tenant } = useTenant();
    const businessType = tenant?.businessType || '';

    const isSchool = SCHOOL_TYPES.includes(businessType);
    const isRental = RENTAL_TYPES.includes(businessType);

    const { data: packages, isLoading, error } = useQuery({
        queryKey: ['payment-packages', businessType],
        queryFn: async (): Promise<NormalizedPackage[]> => {
            if (isSchool) {
                const schoolLevel = getSchoolLevel(businessType);
                const { data, error } = await (supabase
                    .from('school_packages')
                    .select('*')
                    .eq('is_active', true)
                    .or(`school_level.eq.${schoolLevel},school_level.eq.all`)
                    .order('price_per_term', { ascending: true }) as any);
                if (error) throw error;
                return (data || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price_per_term,
                    priceLabel: '/term',
                    features: p.features || [],
                }));
            }

            if (isRental) {
                const { data, error } = await (supabase
                    .from('rental_packages')
                    .select('*')
                    .eq('is_active', true)
                    .order('monthly_price', { ascending: true }) as any);
                if (error) throw error;
                return (data || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.monthly_price,
                    priceLabel: '/mo',
                    features: p.features || [],
                }));
            }

            // Default: business packages
            const { data, error } = await (supabase
                .from('business_packages')
                .select('*')
                .eq('is_active', true)
                .order('monthly_price', { ascending: true }) as any);
            if (error) throw error;
            return (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.monthly_price,
                priceLabel: '/mo',
                features: p.features || [],
            }));
        },
        enabled: !!businessType,
    });

    if (isLoading || !businessType) {
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
                    <p className="text-destructive font-semibold">Error loading packages</p>
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
                    <p className="text-muted-foreground">No packages available for your business type.</p>
                </CardContent>
            </Card>
        );
    }

    const categoryLabel = isSchool ? 'School' : isRental ? 'Rental' : 'Business';

    return (
        <div className="space-y-6">
            <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                    {categoryLabel} Plans
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg, idx) => {
                    const isSelected = pkg.id === selectedPackageId;
                    const isPopular = idx === Math.min(1, packages.length - 1) && packages.length > 1;

                    return (
                        <Card
                            key={pkg.id}
                            className={`relative transition-all ${isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}
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
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold">
                                        {new Intl.NumberFormat('en-UG', {
                                            style: 'currency',
                                            currency: 'UGX',
                                            minimumFractionDigits: 0,
                                        }).format(pkg.price)}
                                    </span>
                                    <span className="text-muted-foreground">{pkg.priceLabel}</span>
                                </div>

                                <ul className="space-y-2">
                                    {pkg.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
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
                                    onClick={() => onSelectPackage(pkg)}
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
