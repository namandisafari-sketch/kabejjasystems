import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface Shortcut {
  category: string;
  label: string;
  description: string;
  action: string;
}

const ALL_SHORTCUTS: Shortcut[] = [
  { category: "POS", label: "Ctrl+I / Alt+N", description: "Create new invoice", action: "newInvoice" },
  { category: "General", label: "Ctrl+P", description: "Print receipt", action: "print" },
  { category: "Navigation", label: "Ctrl+H", description: "View transaction history", action: "history" },
  { category: "Help", label: "F1", description: "Show keyboard shortcuts", action: "help" },
  { category: "Help", label: "Shift+F1", description: "Send feedback", action: "showFeedback" },
  { category: "Navigation", label: "Ctrl+D", description: "Go to dashboard", action: "dashboard" },
  { category: "Navigation", label: "Ctrl+Shift+I", description: "Go to inventory", action: "inventory" },
  { category: "General", label: "Ctrl+S", description: "Save current form", action: "save" },
  { category: "General", label: "Escape", description: "Close current dialog", action: "closeDialog" },
];

// Key combo map for event handling
const COMBO_MAP: Record<string, string> = {
  'ctrl+i': 'newInvoice',
  'alt+n': 'newInvoice',
  'ctrl+p': 'print',
  'ctrl+h': 'history',
  'f1': 'help',
  'shift+f1': 'showFeedback',
  'ctrl+d': 'dashboard',
  'ctrl+s': 'save',
  'escape': 'closeDialog',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifiers = [];
      if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');

      const key = event.key.toLowerCase();
      const combo = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        if (combo !== 'escape') return;
      }

      const action = COMBO_MAP[combo];
      if (!action) return;

      switch (action) {
        case 'newInvoice':
          navigate('/business/pos');
          event.preventDefault();
          break;

        case 'print':
          if (window.print) {
            window.print();
            event.preventDefault();
          }
          break;

        case 'history':
          navigate('/business/sales');
          event.preventDefault();
          break;

        case 'help':
          setShowShortcutsDialog(true);
          event.preventDefault();
          break;

        case 'showFeedback':
          navigate('/business/suggestions');
          event.preventDefault();
          break;

        case 'dashboard':
          navigate('/business/dashboard');
          event.preventDefault();
          break;

        case 'inventory':
          if (event.shiftKey) {
            navigate('/business/inventory');
            event.preventDefault();
          }
          break;

        case 'closeDialog':
          window.dispatchEvent(new CustomEvent('closeAllDialogs'));
          break;

        case 'save':
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, location]);

  return {
    showShortcutsDialog,
    setShowShortcutsDialog,
    shortcuts: ALL_SHORTCUTS,
  };
}

export const KeyboardShortcutsDialog = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) => {
  return ALL_SHORTCUTS.map(s => ({
    combo: s.label,
    action: s.action,
    description: s.description,
  }));
};
