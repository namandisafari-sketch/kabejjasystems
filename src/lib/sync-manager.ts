import { offlineDB, SyncQueueItem } from './offline-db';
import { pgliteDB } from './pglite-db';
import { supabase } from '@/hooks/use-database';
import { networkStatus, waitForOnline } from './network-status';

// Feature flag
const USE_PGLITE = import.meta.env.VITE_USE_PGLITE === 'true';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncManagerListener {
    (status: SyncStatus, pendingCount: number): void;
}

class SyncManager {
    private listeners: Set<SyncManagerListener> = new Set();
    private currentStatus: SyncStatus = 'idle';
    private isSyncing = false;
    private syncInterval: number | null = null;
    private lastSyncTime: number = 0;

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Listen to network status changes
        networkStatus.subscribe((status) => {
            if (status === 'online' && !this.isSyncing) {
                // Trigger sync when coming back online
                this.syncAll();
            }
        });

        // Periodic sync every 2 minutes when online
        this.startPeriodicSync();

        // Register service worker sync if available
        this.registerBackgroundSync();
    }

    private async registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                // @ts-ignore - Background Sync API may not be in all TypeScript definitions
                await registration.sync.register('sync-offline-data');
                console.log('✅ Background sync registered');
            } catch (error) {
                console.warn('⚠️ Background sync not available:', error);
            }
        }
    }

    private startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Sync every 2 minutes if online
        this.syncInterval = window.setInterval(() => {
            if (networkStatus.isOnline() && !this.isSyncing) {
                this.syncAll();
            }
        }, 120000); // 2 minutes
    }

    private notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                if (USE_PGLITE) {
                    pgliteDB.getSyncQueueCount().then(count => {
                        listener(this.currentStatus, count);
                    });
                } else {
                    offlineDB.syncQueue.count().then(count => {
                        listener(this.currentStatus, count);
                    });
                }
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
    }

    private async processSyncQueueItem(item: SyncQueueItem): Promise<boolean> {
        try {
            const { operation, table, data } = item;

            switch (table) {
                case 'sales':
                    if (operation === 'create') {
                        const { error } = await supabase.from('sales').insert(data);
                        if (error) throw error;
                    } else if (operation === 'update') {
                        const { error } = await supabase.from('sales').update(data).eq('id', data.id);
                        if (error) throw error;
                    }
                    break;

                case 'sale_items':
                    if (operation === 'create') {
                        const { error } = await supabase.from('sale_items').insert(data);
                        if (error) throw error;
                    }
                    break;

                case 'products':
                    if (operation === 'update') {
                        const { error } = await supabase.from('products').update(data).eq('id', data.id);
                        if (error) throw error;
                    }
                    break;

                case 'customers':
                    if (operation === 'create') {
                        const { error } = await supabase.from('customers').insert(data);
                        if (error) throw error;
                    } else if (operation === 'update') {
                        const { error } = await supabase.from('customers').update(data).eq('id', data.id);
                        if (error) throw error;
                    }
                    break;

                case 'students':
                    if (operation === 'create') {
                        const { error } = await supabase.from('students').insert(data);
                        if (error) throw error;
                    } else if (operation === 'update') {
                        const { error } = await supabase.from('students').update(data).eq('id', data.id);
                        if (error) throw error;
                    }
                    break;

                default:
                    console.warn(`Unknown table for sync: ${table}`);
                    return false;
            }

            return true;
        } catch (error: any) {
            console.error(`Sync error for ${item.table}:`, error);

            // Update retry count and error message
            if (item.id) {
                if (USE_PGLITE) {
                    await pgliteDB.updateSyncQueueItem(item.id, {
                        retry_count: item.retry_count + 1,
                        last_error: error.message || 'Unknown error',
                        status: item.retry_count >= 3 ? 'failed' : 'pending',
                    });
                } else {
                    await offlineDB.updateSyncQueueItem(item.id, {
                        retry_count: item.retry_count + 1,
                        last_error: error.message || 'Unknown error',
                        status: item.retry_count >= 3 ? 'failed' : 'pending',
                    });
                }
            }

            return false;
        }
    }

    // Public API
    public async syncAll(tenantId?: string): Promise<void> {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress');
            return;
        }

        if (!networkStatus.isOnline()) {
            console.log('📴 Cannot sync: offline');
            return;
        }

        this.isSyncing = true;
        this.currentStatus = 'syncing';
        this.notifyListeners();

        try {
            console.log('🔄 Starting sync...');

            // Get all pending sync items
            const items = tenantId
                ? (USE_PGLITE
                    ? await pgliteDB.getSyncQueue(tenantId)
                    : await offlineDB.getSyncQueue(tenantId))
                : (USE_PGLITE
                    ? await pgliteDB.query<SyncQueueItem>(`
                        SELECT * FROM sync_queue
                        WHERE (status = 'pending' OR status = 'failed')
                        AND retry_count < 3
                        ORDER BY created_at ASC
                    `).then(r => r.rows)
                    : await offlineDB.syncQueue
                        .where('status')
                        .anyOf(['pending', 'failed'])
                        .and(item => item.retry_count < 3)
                        .sortBy('created_at'));

            console.log(`📦 Found ${items.length} items to sync`);

            let successCount = 0;
            let failCount = 0;

            for (const item of items) {
                if (item.id) {
                    // Mark as processing
                    if (USE_PGLITE) {
                        await pgliteDB.updateSyncQueueItem(item.id, { status: 'processing' });
                    } else {
                        await offlineDB.updateSyncQueueItem(item.id, { status: 'processing' });
                    }

                    const success = await this.processSyncQueueItem(item);

                    if (success) {
                        // Remove from queue on success
                        if (USE_PGLITE) {
                            await pgliteDB.deleteSyncQueueItem(item.id);
                        } else {
                            await offlineDB.deleteSyncQueueItem(item.id);
                        }
                        successCount++;

                        // Update local record as synced
                        if (item.table === 'sales' && item.data.id) {
                            if (USE_PGLITE) {
                                await pgliteDB.query(
                                    'UPDATE sales SET synced = true WHERE id = $1',
                                    [item.data.id]
                                );
                            } else {
                                await offlineDB.sales.update(item.data.id, { synced: true });
                            }
                        }
                    } else {
                        failCount++;
                    }
                }
            }

            console.log(`✅ Sync complete: ${successCount} synced, ${failCount} failed`);

            this.lastSyncTime = Date.now();
            this.currentStatus = failCount > 0 ? 'error' : 'idle';
        } catch (error) {
            console.error('❌ Sync failed:', error);
            this.currentStatus = 'error';
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }

    public async queueOperation(
        operation: 'create' | 'update' | 'delete',
        table: string,
        data: any,
        tenantId: string
    ): Promise<void> {
        if (USE_PGLITE) {
            await pgliteDB.addToSyncQueue({
                operation,
                table,
                data,
                tenant_id: tenantId,
            });
        } else {
            await offlineDB.addToSyncQueue({
                operation,
                table,
                data,
                tenant_id: tenantId,
            });
        }

        this.notifyListeners();

        // Try to sync immediately if online
        if (networkStatus.isOnline()) {
            setTimeout(() => this.syncAll(tenantId), 1000);
        }
    }

    public subscribe(listener: SyncManagerListener): () => void {
        this.listeners.add(listener);

        // Immediately call listener with current status
        if (USE_PGLITE) {
            pgliteDB.getSyncQueueCount().then(count => {
                listener(this.currentStatus, count);
            });
        } else {
            offlineDB.syncQueue.count().then(count => {
                listener(this.currentStatus, count);
            });
        }

        return () => {
            this.listeners.delete(listener);
        };
    }

    public getStatus(): SyncStatus {
        return this.currentStatus;
    }

    public getLastSyncTime(): number {
        return this.lastSyncTime;
    }

    public async getPendingCount(tenantId?: string): Promise<number> {
        if (USE_PGLITE) {
            if (tenantId) {
                const result = await pgliteDB.query<{ count: string }>(
                    `SELECT COUNT(*) as count FROM sync_queue 
                     WHERE tenant_id = $1 AND status != 'failed'`,
                    [tenantId]
                );
                return parseInt(result.rows[0].count, 10);
            }
            const result = await pgliteDB.query<{ count: string }>(
                `SELECT COUNT(*) as count FROM sync_queue WHERE status != 'failed'`
            );
            return parseInt(result.rows[0].count, 10);
        } else {
            if (tenantId) {
                return offlineDB.syncQueue
                    .where('tenant_id')
                    .equals(tenantId)
                    .and(item => item.status !== 'failed')
                    .count();
            }
            return offlineDB.syncQueue.where('status').notEqual('failed').count();
        }
    }

    public destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.listeners.clear();
    }
}

// Singleton instance
export const syncManager = new SyncManager();

// Helper function to sync and wait
export async function syncAndWait(tenantId?: string, timeoutMs: number = 30000): Promise<boolean> {
    if (!networkStatus.isOnline()) {
        const online = await waitForOnline(timeoutMs);
        if (!online) return false;
    }

    await syncManager.syncAll(tenantId);
    return true;
}
