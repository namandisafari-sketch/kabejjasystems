import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { offlineDB, offlineStorage } from '@/lib/offline-db';
import { networkStatus } from '@/lib/network-status';
import { useEffect, useState } from 'react';

interface OfflineQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryFn'> {
    queryFn: () => Promise<TData>;
    offlineQueryFn?: () => Promise<TData>;
    cacheToOffline?: boolean;
    tenantId?: string;
}

/**
 * Drop-in replacement for useQuery that works offline
 * - Reads from IndexedDB when offline
 * - Fetches from Supabase when online
 * - Automatically syncs data to local storage
 */
export function useOfflineQuery<TData = unknown>(
    options: OfflineQueryOptions<TData>
): UseQueryResult<TData> {
    const {
        queryFn,
        offlineQueryFn,
        cacheToOffline = true,
        tenantId,
        ...queryOptions
    } = options;

    const [isOnline, setIsOnline] = useState(networkStatus.isOnline());

    useEffect(() => {
        const unsubscribe = networkStatus.subscribe((status) => {
            setIsOnline(status === 'online');
        });
        return unsubscribe;
    }, []);

    // Wrap the query function to handle offline/online logic
    const wrappedQueryFn = async (): Promise<TData> => {
        if (isOnline) {
            try {
                // Fetch from online source
                const data = await queryFn();

                // Cache to offline storage if enabled
                if (cacheToOffline && data) {
                    await cacheDataToOffline(queryOptions.queryKey as any[], data, tenantId);
                }

                return data;
            } catch (error) {
                console.warn('Online query failed, falling back to offline:', error);

                // Fall back to offline if online fetch fails
                if (offlineQueryFn) {
                    return offlineQueryFn();
                }

                // Try to get from offline cache
                const cachedData = await getCachedData(queryOptions.queryKey as any[], tenantId);
                if (cachedData) {
                    return cachedData as TData;
                }

                throw error;
            }
        } else {
            // Offline: use offline query function or cached data
            if (offlineQueryFn) {
                return offlineQueryFn();
            }

            const cachedData = await getCachedData(queryOptions.queryKey as any[], tenantId);
            if (cachedData) {
                return cachedData as TData;
            }

            throw new Error('No offline data available');
        }
    };

    return useQuery({
        ...queryOptions,
        queryFn: wrappedQueryFn,
        // Keep stale data when offline
        staleTime: isOnline ? queryOptions.staleTime : Infinity,
        // Don't refetch when offline
        refetchOnWindowFocus: isOnline ? queryOptions.refetchOnWindowFocus : false,
        refetchOnReconnect: true,
    } as UseQueryOptions<TData>);
}

// Helper function to cache data to offline storage
async function cacheDataToOffline(queryKey: any[], data: any, tenantId?: string) {
    if (!tenantId) return;

    try {
        const [table] = queryKey;

        switch (table) {
            case 'products':
                if (Array.isArray(data)) {
                    await offlineStorage.saveProducts(
                        data.map(item => ({ ...item, synced_at: Date.now() }))
                    );
                }
                break;

            case 'customers':
                if (Array.isArray(data)) {
                    await offlineStorage.saveCustomers(
                        data.map(item => ({ ...item, synced_at: Date.now() }))
                    );
                }
                break;

            case 'students':
                if (Array.isArray(data)) {
                    await offlineStorage.saveStudents(
                        data.map(item => ({ ...item, synced_at: Date.now() }))
                    );
                }
                break;

            case 'classes':
                if (Array.isArray(data)) {
                    await offlineStorage.saveClasses(
                        data.map(item => ({ ...item, synced_at: Date.now() }))
                    );
                }
                break;
        }
    } catch (error) {
        console.error('Failed to cache data offline:', error);
    }
}

// Helper function to get cached data from offline storage
async function getCachedData(queryKey: any[], tenantId?: string) {
    if (!tenantId) return null;

    try {
        const [table] = queryKey;

        switch (table) {
            case 'products':
                return await offlineStorage.getProducts(tenantId);

            case 'customers':
                return await offlineStorage.getCustomers(tenantId);

            case 'students':
                return await offlineStorage.getStudents(tenantId);

            case 'classes':
                return await offlineStorage.getClasses(tenantId);

            case 'sales':
                return await offlineStorage.getSales(tenantId);

            default:
                return null;
        }
    } catch (error) {
        console.error('Failed to get cached data:', error);
        return null;
    }
}
