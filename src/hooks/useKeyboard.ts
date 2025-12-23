import { useEffect } from "react";

interface KeyboardShortcuts {
  onSend: () => void;
  onFocusUrl: () => void;
}

export function useKeyboard({ onSend, onFocusUrl }: KeyboardShortcuts) {
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSend, onFocusUrl]);
}
