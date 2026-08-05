/**
 * useKeyboardShortcut
 * Registers a global keyboard shortcut. Skips when focus is in INPUT/TEXTAREA/SELECT.
 */
import { useEffect, useRef } from "react";

export function useKeyboardShortcut(key, callback, options = {}) {
  const { ctrl = false, shift = false, alt = false, enabled = true } = options;
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      const ctrlMatch  = ctrl  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch   = alt   ? e.altKey   : !e.altKey;
      if (e.key.toLowerCase() === key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        callbackRef.current(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, ctrl, shift, alt, enabled]);
}

export default useKeyboardShortcut;
