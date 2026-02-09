import { useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  label: string;
  description: string;
  action: () => void;
  category: string;
}

export function useKeyboardShortcuts(businessType?: string) {
  const navigate = useNavigate();

  const isSchool = businessType === 'school' || businessType === 'secondary_school' || 
                   businessType === 'primary_school' || businessType === 'kindergarten';

  const shortcuts: Shortcut[] = useMemo(() => [
    // Navigation shortcuts (Alt + key to avoid browser conflicts)
    { key: "d", altKey: true, label: "Alt+D", description: "Go to Dashboard", action: () => navigate("/business"), category: "Navigation" },
    { key: "s", altKey: true, label: "Alt+S", description: "Go to Settings", action: () => navigate("/business/settings"), category: "Navigation" },
    
    // School-specific shortcuts
    ...(isSchool ? [
      { key: "1", altKey: true, label: "Alt+1", description: "Go to Students", action: () => navigate("/business/students"), category: "School" },
      { key: "2", altKey: true, label: "Alt+2", description: "Go to Fees", action: () => navigate("/business/fees"), category: "School" },
      { key: "3", altKey: true, label: "Alt+3", description: "Go to Exams", action: () => navigate("/business/exams"), category: "School" },
      { key: "4", altKey: true, label: "Alt+4", description: "Go to Report Cards", action: () => navigate("/business/report-cards"), category: "School" },
      { key: "5", altKey: true, label: "Alt+5", description: "Go to Attendance", action: () => navigate("/business/attendance"), category: "School" },
      { key: "6", altKey: true, label: "Alt+6", description: "Go to Classes", action: () => navigate("/business/classes"), category: "School" },
      { key: "7", altKey: true, label: "Alt+7", description: "Go to Parents", action: () => navigate("/business/parents"), category: "School" },
      { key: "8", altKey: true, label: "Alt+8", description: "Go to Staff", action: () => navigate("/business/staff"), category: "School" },
    ] : []),

    // Global shortcuts
    { key: "f", altKey: true, label: "Alt+F", description: "Toggle Fullscreen", action: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen?.().catch(() => {
          // Fallback: open in new tab if in iframe
          if (window.self !== window.top) {
            window.open(window.location.href, '_blank');
          }
        });
      }
    }, category: "Global" },

    // Help shortcut
    { key: "?", shiftKey: true, label: "Shift+?", description: "Show Keyboard Shortcuts", action: () => {
      // Trigger click on keyboard shortcuts button
      const btn = document.querySelector('[data-shortcuts-trigger]') as HTMLButtonElement;
      btn?.click();
    }, category: "Global" },
  ], [isSchool, navigate]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : true; // Don't require shift to be absent

      if (event.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  return { shortcuts };
}
