// ─── hooks/usePagination.js ───────────────────────────────────────────────────
// Generic pagination hook with page navigation, limit control, and total/pages calculation.

import { useState, useCallback, useMemo } from 'react';

/**
 * usePagination
 * @param {object} options
 * @param {number} options.initialPage - starting page (1-indexed)
 * @param {number} options.initialLimit - items per page
 * @param {number} options.total - total number of items
 */
export function usePagination({ initialPage = 1, initialLimit = 20, total = 0 } = {}) {
  const [page, setPage]   = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const skip       = useMemo(() => (page - 1) * limit, [page, limit]);

  const goTo         = useCallback((p) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);
  const goNext       = useCallback(() => goTo(page + 1), [page, goTo]);
  const goPrev       = useCallback(() => goTo(page - 1), [page, goTo]);
  const goFirst      = useCallback(() => setPage(1), []);
  const goLast       = useCallback(() => setPage(totalPages), [totalPages]);
  const changeLimit  = useCallback((newLimit) => { setLimit(newLimit); setPage(1); }, []);

  const pageNumbers = useMemo(() => {
    const range = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i);
    }
    return range;
  }, [page, totalPages]);

  return {
    page, limit, skip, totalPages, pageNumbers,
    canGoNext: page < totalPages, canGoPrev: page > 1,
    goTo, goNext, goPrev, goFirst, goLast, changeLimit,
    startItem: skip + 1, endItem: Math.min(skip + limit, total),
  };
}

// ─── hooks/useLocalStorage.js ────────────────────────────────────────────────
// Type-safe localStorage hook with JSON serialization and cross-tab sync.

import { useState, useEffect } from 'react';

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback((newVal) => {
    const val = typeof newVal === 'function' ? newVal(value) : newVal;
    setValue(val);
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, value]);

  const remove = useCallback(() => {
    setValue(defaultValue);
    localStorage.removeItem(key);
  }, [key, defaultValue]);

  // Sync across browser tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key) {
        try { setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue); } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, defaultValue]);

  return [value, set, remove];
}

// ─── hooks/useDebounce.js ─────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── hooks/useIntersectionObserver.js ────────────────────────────────────────
// Infinite scroll / lazy loading trigger hook
import { useRef, useState, useEffect } from 'react';

export function useIntersectionObserver(options = {}) {
  const ref     = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting), { threshold: 0.1, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, isIntersecting];
}
