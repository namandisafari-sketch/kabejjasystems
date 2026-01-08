import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PesapalCheckoutProps {
    redirectUrl: string;
    merchantReference: string;
    amount: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function PesapalCheckout({
    redirectUrl,
    merchantReference,
    amount,
    onSuccess,
    onCancel,
}: PesapalCheckoutProps) {
    const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        // Listen for postMessage from Pesapal iframe
        const handleMessage = (event: MessageEvent) => {
            // Verify origin (Pesapal domains)
            if (
                !event.origin.includes('pesapal.com') &&
                !event.origin.includes('localhost') // For development
            ) {
                return;
            }

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                if (data.status === 'success' || data.payment_status === 'completed') {
                    setStatus('success');
                    setTimeout(() => {
                        onSuccess?.();
                    }, 2000);
                } else if (data.status === 'failed' || data.status === 'cancelled') {
                    setStatus('error');
                    setErrorMessage(data.message || 'Payment was cancelled or failed');
                }
            } catch (error) {
                console.error('Error parsing message from Pesapal:', error);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSuccess]);

    useEffect(() => {
        // Set ready after iframe loads
        const timer = setTimeout(() => {
            if (status === 'loading') {
                setStatus('ready');
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [status]);

    const handleOpenInNewWindow = () => {
        const width = 800;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            redirectUrl,
            'PesapalPayment',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        setStatus('processing');
    };

    if (status === 'success') {
        return (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Payment Successful!</h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Your subscription is now active. Redirecting...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (status === 'error') {
        return (
            <Card className="border-destructive">
                <CardContent className="pt-6 space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errorMessage || 'Payment failed. Please try again.'}</AlertDescription>
                    </Alert>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onCancel} className="flex-1">
                            Go Back
                        </Button>
                        <Button onClick={() => window.location.reload()} className="flex-1">
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Complete Your Payment
                </CardTitle>
                <CardDescription>
                    Reference: {merchantReference} • Amount: UGX {amount.toLocaleString()}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {status === 'loading' && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Loading payment...</span>
                    </div>
                )}

                {status === 'processing' && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Complete the payment in the popup window. This page will update automatically.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Pesapal iframe for embedded payment */}
                <div className="relative">
                    <iframe
                        ref={iframeRef}
                        src={redirectUrl}
                        title="Pesapal Payment"
                        className={`w-full border rounded-md transition-opacity ${status === 'ready' ? 'opacity-100' : 'opacity-0'
                            }`}
                        style={{
                            height: '600px',
                            minHeight: '500px',
                        }}
                        frameBorder="0"
                        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    />

                    {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </div>

                {/* Alternative: Open in new window */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 border-t" />
                    <span className="text-sm text-muted-foreground">or</span>
                    <div className="flex-1 border-t" />
                </div>

                <Button variant="outline" onClick={handleOpenInNewWindow} className="w-full">
                    Open Payment in New Window
                </Button>

                <Button variant="ghost" onClick={onCancel} className="w-full">
                    Cancel Payment
                </Button>
            </CardContent>
        </Card>
    );
}
