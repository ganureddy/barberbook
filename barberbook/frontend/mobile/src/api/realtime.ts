/**
 * Realtime channel layer.
 *
 * Wraps Frappe's socket.io endpoint at `${frappeUrl}/socket.io/`. The server
 * publishes via `frappe.publish_realtime(channel, data)`; the client
 * subscribes via the standard socket.io `on(channel, …)` API.
 *
 * Mock mode: when `env.mock === true`, no socket is opened. Channels are
 * served by an in-process EventEmitter so mock-mode callers (e.g. the mock
 * router publishing a queue update after `walkin.join`) can light up the
 * Walkin screen exactly as a real socket would.
 *
 * Public surface intentionally narrow:
 *   - `publishLocal(channel, data)`: only used by the mock router.
 *   - `useChannel<T>(channel)`: React hook, returns the latest message or
 *     null. Resilient to remount and channel changes.
 */

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { env } from '../lib/env';

type Listener<T> = (data: T) => void;

class LocalEmitter {
  private readonly listeners = new Map<string, Set<Listener<unknown>>>();

  on<T>(channel: string, fn: Listener<T>): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(fn as Listener<unknown>);
    return () => {
      set.delete(fn as Listener<unknown>);
    };
  }

  emit<T>(channel: string, data: T): void {
    this.listeners.get(channel)?.forEach((l) => {
      try {
        (l as Listener<T>)(data);
      } catch {
        // Listener exceptions must not break sibling subscribers.
      }
    });
  }
}

const localBus = new LocalEmitter();

let socket: Socket | null = null;
let socketRefcount = 0;

async function getSocket(): Promise<Socket | null> {
  if (env.mock) return null;
  if (socket) return socket;
  // socket.io-client is heavy — only require it on the live path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('socket.io-client') as typeof import('socket.io-client');
  socket = io(env.frappeUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: true,
    withCredentials: true,
    // Frappe authenticates the socket via the same cookie/sid the axios
    // client sends. RN's WebSocket transport handles that automatically
    // when `withCredentials` is set.
  });
  return socket;
}

function releaseSocket(): void {
  socketRefcount = Math.max(0, socketRefcount - 1);
  if (socketRefcount === 0 && socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Imperative publish — used only by the in-process mock router after a
 * mutation that the UI would expect a socket update for. No-op in production
 * builds (live mode goes through the real socket on the server side).
 */
export function publishLocal<T>(channel: string, data: T): void {
  localBus.emit(channel, data);
}

/**
 * Subscribe to a realtime channel for the lifetime of the calling
 * component. Returns the latest message received on that channel (or
 * `null` until one arrives).
 *
 * In mock mode, listens on the in-process bus.
 * In live mode, opens a shared socket.io connection on first subscriber
 * and reference-counts cleanup so multiple components hitting the same
 * channel share one socket.
 */
export function useChannel<T>(channel: string | null): T | null {
  const [latest, setLatest] = useState<T | null>(null);

  useEffect(() => {
    if (!channel) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const subscribe = async () => {
      if (env.mock) {
        cleanup = localBus.on<T>(channel, (data) => {
          if (!cancelled) setLatest(data);
        });
        return;
      }
      const s = await getSocket();
      if (!s || cancelled) return;
      socketRefcount += 1;
      const handler = (data: T) => {
        if (!cancelled) setLatest(data);
      };
      s.on(channel, handler);
      cleanup = () => {
        s.off(channel, handler);
        releaseSocket();
      };
    };

    subscribe().catch(() => {});

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [channel]);

  return latest;
}

/** Channel name conventions — keep them in one place to avoid typos. */
export const channels = {
  walkinQueue: (shopId: string) => `walkin_queue:${shopId}`,
  bookingUpdate: (bookingId: string) => `booking:${bookingId}`,
} as const;
