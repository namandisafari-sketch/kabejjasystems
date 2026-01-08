import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscriptionCheck } from '@/hooks/use-subscription-check';
import { Loader2 } from 'lucide-react';

interface PaymentLockdownGuardProps {
    children: ReactNode;
}

/**
 * Route guard that checks subscription status
 * Redirects to subscription expired page if trial/subscription expired
 * Exempts superadmins from lockdown
 */
export function PaymentLockdownGuard({ children }: PaymentLockdownGuardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { subscriptionData, isLoading, isActive, isExpired } = useSubscriptionCheck();

    // Pages that don't require subscription check
    const publicPaths = [
        '/login',
        '/signup',
        '/subscription-expired',
        '/payment',
        '/payment/callback',
        '/landing',
        '/accept-invitation',
        '/submit-testimonial',
    ];

    const isPublicPath = publicPaths.some((path) => location.pathname.startsWith(path));

    useEffect(() => {
        // Skip check for public paths
        if (isPublicPath || isLoading) {
            return;
        }

        // If subscription is expired or inactive, redirect to expired page
        if (isExpired || !isActive) {
            navigate('/subscription-expired', { replace: true });
        }
    }, [isActive, isExpired, isLoading, isPublicPath, navigate, location.pathname]);

    // Show loading state while checking subscription
    if (!isPublicPath && isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Checking subscription status...</p>
                </div>
            </div>
        );
    }

    // If subscription is good or on public path, render children
    return <>{children}</>;
}
