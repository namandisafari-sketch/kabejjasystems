import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePWAMode } from "@/hooks/use-pwa-mode";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isPWA } = usePWAMode();

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isPWA || dismissed) return;

    // Check if user has dismissed before (stored in localStorage)
    const hasBeenDismissed = localStorage.getItem("pwa-install-dismissed");
    if (hasBeenDismissed) {
      const dismissedAt = new Date(hasBeenDismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isPWA, dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  if (!showPrompt || isPWA) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-in-bottom safe-bottom">
      <Card className="border-primary/20 shadow-xl bg-card/95 backdrop-blur-lg max-w-md mx-auto">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Install Kabejja App
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quick access, works offline, no app store needed
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleInstall}
                  className="flex-1 gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Install
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDismiss}
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
