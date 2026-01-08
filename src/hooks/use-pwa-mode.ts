import { useState, useEffect } from "react";

export type DisplayMode = "standalone" | "browser" | "minimal-ui" | "fullscreen";

/**
 * Hook to detect if the app is running as a PWA (installed) or in the browser
 */
export function usePWAMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("browser");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check various methods to detect PWA mode
    const checkDisplayMode = () => {
      // Check if running in Capacitor (native Android/iOS app)
      // @ts-ignore - Capacitor is available globally when running as native app
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        setDisplayMode("standalone");
        setIsInstalled(true);
        return;
      }

      // Check for standalone mode (iOS Safari and most browsers)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setDisplayMode("standalone");
        setIsInstalled(true);
        return;
      }

      // Check for minimal-ui mode
      if (window.matchMedia("(display-mode: minimal-ui)").matches) {
        setDisplayMode("minimal-ui");
        setIsInstalled(true);
        return;
      }

      // Check for fullscreen mode
      if (window.matchMedia("(display-mode: fullscreen)").matches) {
        setDisplayMode("fullscreen");
        setIsInstalled(true);
        return;
      }

      // iOS Safari specific check
      if ((navigator as any).standalone === true) {
        setDisplayMode("standalone");
        setIsInstalled(true);
        return;
      }

      // Check if running in TWA (Trusted Web Activity) on Android
      if (document.referrer.includes("android-app://")) {
        setDisplayMode("standalone");
        setIsInstalled(true);
        return;
      }

      setDisplayMode("browser");
      setIsInstalled(false);
    };

    checkDisplayMode();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => checkDisplayMode();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return { displayMode, isInstalled, isPWA: isInstalled };
}
