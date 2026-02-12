import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { type Shortcut } from "@/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-shortcuts-trigger>
                <Keyboard className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Keyboard Shortcuts (Shift+?)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {categories.map((category, idx) => (
            <div key={category}>
              {idx > 0 && <Separator className="mb-4" />}
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map(shortcut => (
                    <div key={shortcut.label} className="flex items-center justify-between">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded border bg-muted text-muted-foreground">
                        {shortcut.label}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
