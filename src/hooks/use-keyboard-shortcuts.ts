import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Keyboard shortcut configuration
const SHORTCUTS = {
  'ctrl+i': { action: 'newInvoice', description: 'Create new invoice (POS)' },
  'alt+n': { action: 'newInvoice', description: 'Create new invoice (POS)' },
  'ctrl+p': { action: 'print', description: 'Print receipt' },
  'ctrl+h': { action: 'history', description: 'View transaction history' },
  'f1': { action: 'help', description: 'Show keyboard shortcuts' },
  'shift+f1': { action: 'showFeedback', description: 'Send feedback' },
  'ctrl+d': { action: 'dashboard', description: 'Go to dashboard' },
  'ctrl+inventory': { action: 'inventory', description: 'Go to inventory' },
  'ctrl+s': { action: 'save', description: 'Save current form' },
  'escape': { action: 'closeDialog', description: 'Close current dialog' },
};

interface ShortcutHandler {
  (event: KeyboardEvent): void | boolean;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Build key combo string
      const modifiers = [];
      if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');

      const key = event.key.toLowerCase();
      const combo = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;

      // Prevent shortcuts if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow only specific shortcuts in input fields
        if (combo !== 'escape') return;
      }

      // Handle shortcuts
      switch (combo) {
        case 'ctrl+i':
        case 'alt+n':
          // Navigate to POS if on hardware/retail business
          navigate('/business/pos');
          event.preventDefault();
          break;

        case 'ctrl+p':
          // Trigger print
          if (window.print) {
            window.print();
            event.preventDefault();
          }
          break;

        case 'ctrl+h':
          // Go to sales/history page - check current business type
          navigate('/business/sales');
          event.preventDefault();
          break;

        case 'f1':
          // Show shortcuts dialog
          setShowShortcutsDialog(true);
          event.preventDefault();
          break;

        case 'shift+f1':
          // Go to feedback/suggestions
          navigate('/business/suggestions');
          event.preventDefault();
          break;

        case 'ctrl+d':
          // Go to dashboard
          navigate('/business/dashboard');
          event.preventDefault();
          break;

        case 'ctrl+i':
          // Go to inventory (different context)
          if (event.shiftKey) {
            navigate('/business/inventory');
            event.preventDefault();
          }
          break;

        case 'escape':
          // Close any open dialog - this is handled by dialog components
          // Dispatching custom event that dialog components can listen to
          const closeEvent = new CustomEvent('closeAllDialogs');
          window.dispatchEvent(closeEvent);
          break;

        default:
          break;
      }
    };

    // Add global event listener
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, location]);

  return {
    showShortcutsDialog,
    setShowShortcutsDialog,
    shortcuts: SHORTCUTS,
  };
}

// Shortcuts reference component
export const KeyboardShortcutsDialog = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) => {
  // This would use your Dialog component
  // Just returns the shortcut list for now
  const shortcuts = Object.entries(SHORTCUTS).map(([combo, info]) => ({
    combo,
    action: info.action,
    description: info.description,
  }));

  return shortcuts;
};
