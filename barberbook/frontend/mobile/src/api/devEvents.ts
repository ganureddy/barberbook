/**
 * Tiny pub-sub for dev-only telemetry (last API call, errors, etc.).
 * Lives next to the api/ layer so the axios interceptors can publish without
 * importing from a UI module (avoids a circular import with DevHud).
 */

import { create } from 'zustand';

export interface ApiCallTrace {
  id: string;
  method: string;
  url: string;
  status?: number;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  ok?: boolean;
  source: 'live' | 'mock';
  errorMessage?: string;
}

interface DevEventsStore {
  lastCalls: ApiCallTrace[];
  recordStart: (t: ApiCallTrace) => void;
  recordFinish: (id: string, patch: Pick<ApiCallTrace, 'status' | 'ok' | 'errorMessage'>) => void;
  clear: () => void;
}

const MAX_TRACE_KEEP = 25;

export const useDevEventsStore = create<DevEventsStore>((set) => ({
  lastCalls: [],
  recordStart: (t) => {
    set((s) => ({ lastCalls: [t, ...s.lastCalls].slice(0, MAX_TRACE_KEEP) }));
  },
  recordFinish: (id, patch) => {
    set((s) => ({
      lastCalls: s.lastCalls.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              finishedAt: Date.now(),
              durationMs: Date.now() - c.startedAt,
            }
          : c,
      ),
    }));
  },
  clear: () => {
    set({ lastCalls: [] });
  },
}));
