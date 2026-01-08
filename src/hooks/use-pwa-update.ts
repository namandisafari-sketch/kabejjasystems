import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  updateServiceWorker: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  isChecking: boolean;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Check if there's a waiting service worker
        if (reg.waiting) {
          setNeedRefresh(true);
        }

        // Listen for new service workers
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });
      });

      // Handle controller change (when a new SW takes over)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!registration) return;
    
    setIsChecking(true);
    try {
      await registration.update();
      
      // Give a small delay to detect if there's an update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (registration.waiting) {
        setNeedRefresh(true);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, [registration]);

  const updateServiceWorker = useCallback(async () => {
    if (!registration?.waiting) return;

    // Tell the waiting service worker to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  return {
    needRefresh,
    updateServiceWorker,
    checkForUpdates,
    isChecking,
  };
}
