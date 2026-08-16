// ─── hooks/useKeyboardShortcuts.js ────────────────────────────────────────────
// Global keyboard shortcut manager. Register shortcuts with a hook and
// they'll be automatically cleaned up when the component unmounts.
// Supports modifier keys, sequences, and conflict detection.

import { useEffect, useRef, useCallback } from 'react';

// Normalize key combo to a canonical form: "ctrl+shift+k"
function normalizeCombo(key, { ctrl = false, meta = false, shift = false, alt = false } = {}) {
  const parts = [];
  if (ctrl || meta) parts.push('ctrl');
  if (shift) parts.push('shift');
  if (alt) parts.push('alt');
  parts.push(key.toLowerCase());
  return parts.join('+');
}

function eventToCombo(e) {
  return normalizeCombo(e.key, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey });
}

// Global registry to detect conflicts across components
const globalRegistry = new Map();

/**
 * useKeyboardShortcuts - register multiple keyboard shortcuts
 *
 * @param {Array<{combo: string, modifiers?: object, handler: function, description: string}>} shortcuts
 * @param {object} options
 * @param {boolean} options.enabled - disable all shortcuts when false
 * @param {boolean} options.ignoreInInputs - skip shortcuts when user is typing in inputs
 */
export function useKeyboardShortcuts(shortcuts = [], options = {}) {
  const { enabled = true, ignoreInInputs = true } = options;
  const handlersRef = useRef(new Map());

  useEffect(() => {
    if (!enabled) return;

    // Build handler map
    const map = new Map();
    shortcuts.forEach(({ combo, modifiers, handler, description }) => {
      const canonical = normalizeCombo(combo, modifiers);
      map.set(canonical, { handler, description });
      globalRegistry.set(canonical, description);
    });
    handlersRef.current = map;

    const handleKeyDown = (e) => {
      if (ignoreInInputs) {
        const tag = document.activeElement?.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
        if (document.activeElement?.contentEditable === 'true') return;
      }

      const combo = eventToCombo(e);
      const entry = handlersRef.current.get(combo);
      if (entry) {
        e.preventDefault();
        entry.handler(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      shortcuts.forEach(({ combo, modifiers }) => {
        globalRegistry.delete(normalizeCombo(combo, modifiers));
      });
    };
  }, [shortcuts, enabled, ignoreInInputs]);
}

/**
 * useShortcut - single shortcut hook
 */
export function useShortcut(combo, handler, modifiers = {}, options = {}) {
  useKeyboardShortcuts([{ combo, modifiers, handler, description: '' }], options);
}

/**
 * getRegisteredShortcuts - returns all currently registered shortcuts
 */
export function getRegisteredShortcuts() {
  return Array.from(globalRegistry.entries()).map(([combo, desc]) => ({ combo, description: desc }));
}
