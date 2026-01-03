import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
    synced: boolean;
    error?: boolean;
    className?: string;
}

export function SyncStatusBadge({ synced, error, className }: SyncStatusBadgeProps) {
    if (error) {
        return (
            <Badge variant="destructive" className={cn("gap-1", className)}>
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">Failed</span>
            </Badge>
        );
    }

    if (!synced) {
        return (
            <Badge variant="secondary" className={cn("gap-1", className)}>
                <Clock className="h-3 w-3" />
                <span className="text-xs">Pending</span>
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={cn("gap-1 border-green-500 text-green-600 dark:text-green-400", className)}>
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-xs">Synced</span>
        </Badge>
    );
}
