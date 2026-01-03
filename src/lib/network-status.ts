// Network status detection and monitoring

export type NetworkStatus = 'online' | 'offline' | 'unknown';
export type ConnectionQuality = 'good' | 'poor' | 'offline';

interface NetworkStatusListener {
    (status: NetworkStatus, quality: ConnectionQuality): void;
}

class NetworkStatusManager {
    private listeners: Set<NetworkStatusListener> = new Set();
    private currentStatus: NetworkStatus = 'unknown';
    private currentQuality: ConnectionQuality = 'offline';
    private checkInterval: number | null = null;

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Initial status check
        this.updateStatus();

        // Listen to online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());

            // Listen to connection change events (for mobile)
            if ('connection' in navigator) {
                const connection = (navigator as any).connection;
                connection?.addEventListener('change', () => this.updateStatus());
            }
        }

        // Periodic connectivity check (every 30 seconds)
        this.startPeriodicCheck();
    }

    private handleOnline() {
        console.log('🌐 Network: Online');
        this.updateStatus();
    }

    private handleOffline() {
        console.log('📴 Network: Offline');
        this.currentStatus = 'offline';
        this.currentQuality = 'offline';
        this.notifyListeners();
    }

    private async updateStatus() {
        const wasOffline = this.currentStatus === 'offline';

        // Check navigator.onLine first
        if (!navigator.onLine) {
            this.currentStatus = 'offline';
            this.currentQuality = 'offline';
            this.notifyListeners();
            return;
        }

        // Try to ping a reliable endpoint to verify actual connectivity
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const startTime = Date.now();
            const response = await fetch('/favicon.ico', {
                method: 'HEAD',
                cache: 'no-cache',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const latency = Date.now() - startTime;

            if (response.ok) {
                this.currentStatus = 'online';

                // Determine connection quality based on latency
                if (latency < 500) {
                    this.currentQuality = 'good';
                } else {
                    this.currentQuality = 'poor';
                }

                if (wasOffline) {
                    console.log('✅ Network: Back online');
                }
            } else {
                this.currentStatus = 'offline';
                this.currentQuality = 'offline';
            }
        } catch (error) {
            this.currentStatus = 'offline';
            this.currentQuality = 'offline';
        }

        this.notifyListeners();
    }

    private startPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Check every 30 seconds
        this.checkInterval = window.setInterval(() => {
            this.updateStatus();
        }, 30000);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.currentStatus, this.currentQuality);
            } catch (error) {
                console.error('Error in network status listener:', error);
            }
        });
    }

    // Public API
    public getStatus(): NetworkStatus {
        return this.currentStatus;
    }

    public getQuality(): ConnectionQuality {
        return this.currentQuality;
    }

    public isOnline(): boolean {
        return this.currentStatus === 'online';
    }

    public isOffline(): boolean {
        return this.currentStatus === 'offline';
    }

    public subscribe(listener: NetworkStatusListener): () => void {
        this.listeners.add(listener);

        // Immediately call listener with current status
        listener(this.currentStatus, this.currentQuality);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    public async checkNow(): Promise<void> {
        await this.updateStatus();
    }

    public destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('online', () => this.handleOnline());
            window.removeEventListener('offline', () => this.handleOffline());
        }

        this.listeners.clear();
    }
}

// Singleton instance
export const networkStatus = new NetworkStatusManager();

// Helper function to wait for online status
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
        if (networkStatus.isOnline()) {
            resolve(true);
            return;
        }

        const timeout = setTimeout(() => {
            unsubscribe();
            resolve(false);
        }, timeoutMs);

        const unsubscribe = networkStatus.subscribe((status) => {
            if (status === 'online') {
                clearTimeout(timeout);
                unsubscribe();
                resolve(true);
            }
        });
    });
}
