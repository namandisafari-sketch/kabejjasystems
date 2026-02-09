import { Wifi, WifiOff, WifiLow } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function NetworkStatusIndicator() {
  const { status } = useNetworkStatus();

  if (status === "online") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Online</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connected to the internet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "slow") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse">
              <WifiLow className="h-3.5 w-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Slow</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Slow internet connection detected</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive animate-pulse">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="text-xs font-medium hidden sm:inline">Offline</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>No internet connection — changes may not be saved</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
