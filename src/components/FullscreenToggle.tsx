import { Maximize, Minimize } from "lucide-react";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FullscreenToggle() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} (Alt+F)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
