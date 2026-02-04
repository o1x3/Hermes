import { useEffect } from "react";

interface KeyboardShortcuts {
  onSend: () => void;
  onFocusUrl: () => void;
  onSave?: () => void;
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onPrevTab?: () => void;
  onNextTab?: () => void;
}

export function useKeyboard({
  onSend,
  onFocusUrl,
  onSave,
  onNewTab,
  onCloseTab,
  onPrevTab,
  onNextTab,
}: KeyboardShortcuts) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + Enter → send request
      if (mod && e.key === "Enter") {
        e.preventDefault();
        onSend();
      }

      // Cmd/Ctrl + L → focus URL input
      if (mod && e.key === "l") {
        e.preventDefault();
        onFocusUrl();
      }

      // Cmd/Ctrl + S → save
      if (mod && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }

      // Cmd/Ctrl + T → new tab
      if (mod && e.key === "t") {
        e.preventDefault();
        onNewTab?.();
      }

      // Cmd/Ctrl + W → close tab
      if (mod && e.key === "w") {
        e.preventDefault();
        onCloseTab?.();
      }

      // Cmd/Ctrl + Shift + [ → previous tab
      if (mod && e.shiftKey && e.key === "[") {
        e.preventDefault();
        onPrevTab?.();
      }

      // Cmd/Ctrl + Shift + ] → next tab
      if (mod && e.shiftKey && e.key === "]") {
        e.preventDefault();
        onNextTab?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSend, onFocusUrl, onSave, onNewTab, onCloseTab, onPrevTab, onNextTab]);
}
