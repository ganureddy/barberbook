/**
 * Frappe surfaces user-facing notifications via two response keys:
 *
 *   - `_server_messages`: a JSON-encoded array, where each entry is itself
 *     a JSON-encoded `{message, indicator, title?}` object. (Yes, double-
 *     encoded — Frappe sets it as a JSON string for legacy reasons.)
 *   - `exc`: a stringified Python traceback when the request errored.
 *
 * This module parses both shapes defensively and emits toasts.
 */

import { toast, type ToastIndicator } from '../lib/toast';

interface ServerMessage {
  message?: string;
  title?: string;
  indicator?: ToastIndicator;
  /** Frappe sometimes uses these alt keys. */
  msg?: string;
  raise_exception?: boolean;
}

const FRAPPE_INDICATOR_TO_TOAST: Record<string, ToastIndicator> = {
  green: 'green',
  red: 'red',
  orange: 'yellow',
  yellow: 'yellow',
  blue: 'blue',
  grey: 'gray',
  gray: 'gray',
};

function parseDoubleEncodedArray(raw: unknown): ServerMessage[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  let outer: unknown;
  try {
    outer = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(outer)) return [];
  const out: ServerMessage[] = [];
  for (const entry of outer) {
    if (typeof entry === 'string') {
      try {
        out.push(JSON.parse(entry) as ServerMessage);
      } catch {
        out.push({ message: entry });
      }
    } else if (entry && typeof entry === 'object') {
      out.push(entry as ServerMessage);
    }
  }
  return out;
}

/**
 * Inspect a Frappe response payload (or response headers — Frappe sometimes
 * tucks `_server_messages` into a header) and emit toasts for any messages.
 *
 * Returns true if any messages were surfaced.
 */
export function surfaceServerMessages(
  payload: unknown,
  headers?: Record<string, string | undefined>,
): boolean {
  let messages: ServerMessage[] = [];

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    messages = messages.concat(parseDoubleEncodedArray(obj._server_messages));
  }
  if (headers) {
    const headerVal = headers['x-frappe-server-messages'] ?? headers['X-Frappe-Server-Messages'];
    messages = messages.concat(parseDoubleEncodedArray(headerVal));
  }

  if (messages.length === 0) return false;

  for (const m of messages) {
    const text = m.message ?? m.msg ?? '';
    if (!text) continue;
    const indicator = FRAPPE_INDICATOR_TO_TOAST[(m.indicator ?? '').toLowerCase()] ?? 'blue';
    if (indicator === 'red') toast.error(text, m.title);
    else if (indicator === 'yellow') toast.warn(text, m.title);
    else if (indicator === 'green') toast.success(text, m.title);
    else toast.info(text, m.title);
  }
  return true;
}

/**
 * Best-effort extraction of a human-readable error message from a Frappe
 * error response. Falls back to the raw status text.
 */
export function extractFrappeError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.exception === 'string' && obj.exception.length > 0) {
    return obj.exception.split('\n').pop() ?? obj.exception;
  }
  if (typeof obj._error_message === 'string' && obj._error_message.length > 0) {
    return obj._error_message;
  }
  // Sometimes the message itself is JSON-encoded.
  const msgs = parseDoubleEncodedArray(obj._server_messages);
  if (msgs.length > 0) {
    const first = msgs[0];
    return first.message ?? first.msg ?? null;
  }
  return null;
}
