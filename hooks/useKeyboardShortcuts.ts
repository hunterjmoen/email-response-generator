import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  onCopy?: () => void;
  onNew?: () => void;
  onSubmit?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + C (when not in input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isInputElement(e.target)) {
        e.preventDefault();
        handlers.onCopy?.();
      }

      // Cmd/Ctrl + N for new response
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handlers.onNew?.();
      }

      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handlers.onSubmit?.();
      }

      // Arrow keys for navigation (only when not in input)
      if (!isInputElement(e.target)) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handlers.onNext?.();
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlers.onPrevious?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const element = target as HTMLElement;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}
