import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDeviceFingerprint } from '@/hooks/use-device-fingerprint';
import { Lock, CreditCard, Calendar, Smartphone } from 'lucide-react';

/**
 * Trial Lock Screen
 * Shown when device's free trial has expired
 * Persists even after uninstall/reinstall due to device fingerprinting
 */
export function TrialLockScreen() {
    const navigate = useNavigate();
    const { trialStatus, fingerprint, loading } = useDeviceFingerprint();

    useEffect(() => {
        // If trial is still valid or paid, redirect to app
        if (!loading && trialStatus?.isValid) {
            navigate('/home');
        }
    }, [trialStatus, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Verifying device...</p>
                </div>
            </div>
        );
    }

    if (!trialStatus || trialStatus.isValid) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-6">
                {/* Lock Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full"></div>
                        <div className="relative bg-background p-6 rounded-full shadow-lg">
                            <Lock className="h-16 w-16 text-destructive" />
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <Card className="border-destructive/50">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl text-destructive">
                            Free Trial Expired
                        </CardTitle>
                        <CardDescription className="text-lg">
                            Your 14-day free trial has ended
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Trial Info */}
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Trial Period</p>
                                    <p className="text-sm text-muted-foreground">
                                        14 days free access
                                    </p>
                                </div>
                            </div>

                            {fingerprint && (
                                <div className="flex items-center gap-3">
                                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Device</p>
                                        <p className="text-sm text-muted-foreground">
                                            {fingerprint.manufacturer} {fingerprint.model}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Blocked Message */}
                        {trialStatus.isBlocked && (
                            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                                <p className="text-sm text-destructive font-medium">
                                    {trialStatus.message}
                                </p>
                            </div>
                        )}

                        {/* Features Grid */}
                        <div>
                            <h3 className="font-semibold mb-3">Continue with full access:</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-start gap-2">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs text-primary">✓</span>
                                    </div>
                                    <span>Unlimited users</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs text-primary">✓</span>
                                    </div>
                                    <span>All modules</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs text-primary">✓</span>
                                    </div>
                                    <span>Cloud backup</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs text-primary">✓</span>
                                    </div>
                                    <span>Priority support</span>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Cards */}
                        <div className="grid gap-3">
                            <Button
                                onClick={() => navigate('/payment')}
                                className="w-full h-auto py-4 bg-primary hover:bg-primary/90"
                                size="lg"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-5 w-5" />
                                        <div className="text-left">
                                            <p className="font-semibold">Subscribe Now</p>
                                            <p className="text-xs opacity-90">From UGX 50,000/month</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold">→</span>
                                </div>
                            </Button>

                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                    Plans start at UGX 50,000/month • Cancel anytime
                                </p>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <div className="border-t pt-4">
                            <p className="text-xs text-muted-foreground text-center">
                                🔒 Device fingerprinting active • Reinstalling won't reset trial
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Help Link */}
                <div className="text-center">
                    <Button variant="link" onClick={() => window.location.href = 'mailto:support@kabejjasystems.com'}>
                        Need help? Contact Support
                    </Button>
                </div>
            </div>
        </div>
    );
}
