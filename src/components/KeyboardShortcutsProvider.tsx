import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Keyboard } from "lucide-react";

// Keyboard shortcut configuration
export const SHORTCUTS = {
  'Ctrl+I': { description: 'New Sale (POS)', requiresHardware: true },
  'Alt+N': { description: 'New Sale (POS)', requiresHardware: true },
  'Ctrl+P': { description: 'Print / Print Receipt', requiresHardware: false },
  'Ctrl+H': { description: 'Sales History', requiresHardware: true },
  'F1': { description: 'Show Keyboard Shortcuts', requiresHardware: false },
  'Escape': { description: 'Close Dialog or Cancel', requiresHardware: false },
};

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      try {
        // Prevent shortcuts if user is typing in an input field
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          // Allow only F1 and Escape in input fields
          if (event.key.toLowerCase() !== 'f1' && event.key !== 'Escape') {
            return;
          }
        }

        // Build key combo string
        const modifiers = [];
        if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.altKey) modifiers.push('Alt');

        const key = event.key.toUpperCase();
        const combo = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;

        // Handle shortcuts
        switch (combo) {
          case 'Ctrl+I':
          case 'Alt+N':
            // Navigate to POS
            navigate('/business/pos');
            event.preventDefault();
            break;

          case 'Ctrl+P':
            // Trigger print
            window.print();
            event.preventDefault();
            break;

          case 'Ctrl+H':
            // Go to sales history
            navigate('/business/sales');
            event.preventDefault();
            break;

          case 'F1':
            // Show shortcuts dialog
            setShowShortcutsDialog(true);
            event.preventDefault();
            break;

          case 'Escape':
            // Close dialog if it's open
            if (showShortcutsDialog) {
              setShowShortcutsDialog(false);
            } else {
              // Dispatch custom event for other dialogs
              const closeEvent = new CustomEvent('closeAllDialogs');
              window.dispatchEvent(closeEvent);
            }
            break;

          default:
            break;
        }
      } catch (err) {
        // Silently catch keyboard handler errors to prevent crashing
        console.error('Keyboard shortcut error:', err);
      }
    };

    // Add global event listener
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, showShortcutsDialog]);

  return (
    <>
      {children}
      {typeof window !== 'undefined' && (
        <KeyboardShortcutsDialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog} />
      )}
    </>
  );
}

function KeyboardShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts for faster navigation
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {Object.entries(SHORTCUTS).map(([combo, info]) => (
              <div key={combo} className="flex items-start justify-between pb-3 border-b last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{info.description}</p>
                </div>
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  {combo}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="text-xs text-muted-foreground pt-3 border-t">
          <p>💡 Press <kbd className="px-2 py-1 bg-muted rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded">P</kbd> to print any page</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
