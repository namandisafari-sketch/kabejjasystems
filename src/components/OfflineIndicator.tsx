import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Wifi,
    WifiOff,
    Cloud,
    CloudOff,
    RefreshCw,
    Clock,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export function OfflineIndicator() {
    const {
        isOnline,
        isOffline,
        quality,
        syncStatus,
        pendingCount,
        lastSyncTime,
        sync
    } = useNetworkStatus();

    const getStatusIcon = () => {
        if (isOffline) {
            return <WifiOff className="h-4 w-4" />;
        }
        if (quality === 'poor') {
            return <Wifi className="h-4 w-4 text-yellow-500" />;
        }
        return <Wifi className="h-4 w-4 text-green-500" />;
    };

    const getStatusText = () => {
        if (isOffline) return 'Offline';
        if (quality === 'poor') return 'Poor Connection';
        return 'Online';
    };

    const getSyncIcon = () => {
        if (syncStatus === 'syncing') {
            return <RefreshCw className="h-3 w-3 animate-spin" />;
        }
        if (syncStatus === 'error') {
            return <AlertCircle className="h-3 w-3 text-destructive" />;
        }
        if (pendingCount > 0) {
            return <Clock className="h-3 w-3 text-yellow-500" />;
        }
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    };

    const getSyncText = () => {
        if (syncStatus === 'syncing') return 'Syncing...';
        if (syncStatus === 'error') return 'Sync Error';
        if (pendingCount > 0) return `${pendingCount} pending`;
        return 'Synced';
    };

    const getLastSyncText = () => {
        if (!lastSyncTime) return 'Never synced';
        return `Last sync: ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`;
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "gap-2 h-8",
                        isOffline && "text-muted-foreground"
                    )}
                >
                    {getStatusIcon()}
                    <span className="hidden sm:inline text-xs">{getStatusText()}</span>
                    {pendingCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {pendingCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            {isOnline ? (
                                <Cloud className="h-4 w-4 text-green-500" />
                            ) : (
                                <CloudOff className="h-4 w-4 text-muted-foreground" />
                            )}
                            Connection Status
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Network:</span>
                                <span className="font-medium">{getStatusText()}</span>
                            </div>
                            {quality === 'poor' && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                                    ⚠️ Slow connection detected. Some features may be limited.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            {getSyncIcon()}
                            Sync Status
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-medium">{getSyncText()}</span>
                            </div>
                            {pendingCount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pending:</span>
                                    <span className="font-medium">{pendingCount} operations</span>
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                                {getLastSyncText()}
                            </div>
                        </div>
                    </div>

                    {isOffline && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                                📴 You're working offline. Changes will sync automatically when you're back online.
                            </p>
                        </div>
                    )}

                    {isOnline && pendingCount > 0 && (
                        <Button
                            onClick={sync}
                            disabled={syncStatus === 'syncing'}
                            className="w-full"
                            size="sm"
                        >
                            <RefreshCw className={cn(
                                "h-4 w-4 mr-2",
                                syncStatus === 'syncing' && "animate-spin"
                            )} />
                            Sync Now
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
