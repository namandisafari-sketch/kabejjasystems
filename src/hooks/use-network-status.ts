import { useState, useEffect } from 'react';
import { networkStatus, NetworkStatus, ConnectionQuality } from '@/lib/network-status';
import { syncManager, SyncStatus } from '@/lib/sync-manager';

interface NetworkStatusHook {
    isOnline: boolean;
    isOffline: boolean;
    status: NetworkStatus;
    quality: ConnectionQuality;
    syncStatus: SyncStatus;
    pendingCount: number;
    lastSyncTime: number;
    sync: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatusHook {
    const [status, setStatus] = useState<NetworkStatus>(networkStatus.getStatus());
    const [quality, setQuality] = useState<ConnectionQuality>(networkStatus.getQuality());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState(syncManager.getLastSyncTime());

    useEffect(() => {
        // Subscribe to network status changes
        const unsubscribeNetwork = networkStatus.subscribe((newStatus, newQuality) => {
            setStatus(newStatus);
            setQuality(newQuality);
        });

        // Subscribe to sync status changes
        const unsubscribeSync = syncManager.subscribe((newSyncStatus, newPendingCount) => {
            setSyncStatus(newSyncStatus);
            setPendingCount(newPendingCount);
            setLastSyncTime(syncManager.getLastSyncTime());
        });

        return () => {
            unsubscribeNetwork();
            unsubscribeSync();
        };
    }, []);

    const sync = async () => {
        await syncManager.syncAll();
    };

    return {
        isOnline: status === 'online',
        isOffline: status === 'offline',
        status,
        quality,
        syncStatus,
        pendingCount,
        lastSyncTime,
        sync,
    };
}
