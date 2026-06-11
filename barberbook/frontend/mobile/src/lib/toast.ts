/**
 * Tiny toast pub-sub. Decoupled from the renderer so non-React code (the
 * axios interceptor in particular) can fire toasts without holding a hook.
 *
 * Mirrors the Frappe `frappe.msgprint` indicator vocabulary so we can pass
 * server messages through unchanged.
 */

import { create } from 'zustand';

export type ToastIndicator = 'green' | 'red' | 'yellow' | 'blue' | 'gray';

export interface Toast {
  id: string;
  message: string;
  title?: string;
  indicator: ToastIndicator;
  /** Auto-dismiss in ms. Pass 0 for sticky. Default 3500. */
  durationMs: number;
}

interface ToastStore {
  toasts: Toast[];
  show: (input: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;
const nextId = () => `t${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: ({ durationMs = 3500, ...rest }) => {
    const id = nextId();
    const toast: Toast = { id, durationMs, ...rest };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (durationMs > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, durationMs);
    }
    return id;
  },
  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  clear: () => {
    set({ toasts: [] });
  },
}));

/** Imperative shorthand for non-React callers (interceptors, error sinks). */
export const toast = {
  success: (message: string, title?: string) =>
    useToastStore.getState().show({ message, title, indicator: 'green' }),
  error: (message: string, title?: string) =>
    useToastStore.getState().show({ message, title, indicator: 'red', durationMs: 5500 }),
  warn: (message: string, title?: string) =>
    useToastStore.getState().show({ message, title, indicator: 'yellow', durationMs: 4500 }),
  info: (message: string, title?: string) =>
    useToastStore.getState().show({ message, title, indicator: 'blue' }),
};
