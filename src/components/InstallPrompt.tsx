import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Save the event so it can be triggered later
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show custom install prompt
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        await deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`User response to install prompt: ${outcome}`);

        // Clear the deferred prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal for 7 days
        localStorage.setItem('installPromptDismissed', Date.now().toString());
    };

    // Check if user dismissed recently
    useEffect(() => {
        const dismissed = localStorage.getItem('installPromptDismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const daysSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissal < 7) {
                setShowPrompt(false);
            }
        }
    }, []);

    if (!showPrompt || !deferredPrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
            <Card className="border-primary shadow-lg">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Install Kabejja Systems</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mt-1 -mr-1"
                            onClick={handleDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <CardDescription>
                        Install our app for a better experience with offline access
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button onClick={handleInstallClick} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Install App
                    </Button>
                    <Button variant="outline" onClick={handleDismiss} className="w-full">
                        Maybe Later
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
