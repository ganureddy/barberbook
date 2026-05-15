/**
 * The axios instance every API call goes through.
 *
 * Two notable behaviors layered on top of plain axios:
 *
 * 1. Mock mode. When `EXPO_PUBLIC_MOCK=1` (default in dev), an axios
 *    *adapter* short-circuits the request and returns fixture data via
 *    `routeMock`. No network is touched, so the app boots and runs end-to-
 *    end before any Frappe DocType exists.
 *
 * 2. Frappe envelope handling. A response interceptor parses
 *    `_server_messages` and surfaces them as toasts (success/warn/error
 *    indicator preserved). The error path also extracts the human message
 *    from Frappe's exception envelope so callers don't have to.
 *
 * Auth: `withCredentials: true` ships the Frappe session cookie. For
 * native HTTP we additionally stamp `X-Frappe-CSRF-Token` and `Cookie: sid=...`
 * if a session id has been persisted (see `setSessionId`) — RN's fetch
 * impl does NOT send cookies for cross-origin/local IP requests reliably.
 */

import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '../lib/env';
import { uuid } from '../lib/uuid';

import { useDevEventsStore } from './devEvents';
import { routeMock } from './mocks/router';
import { extractFrappeError, surfaceServerMessages } from './serverMessages';

let activeSid: string | null = null;
let activeCsrfToken: string | null = null;

/**
 * Stamp a Frappe session id onto every subsequent request. Pass `null` to
 * clear (logout). Persisted by the auth layer via expo-secure-store.
 */
export function setSessionId(sid: string | null): void {
  activeSid = sid;
}

export function setCsrfToken(token: string | null): void {
  activeCsrfToken = token;
}

export function getSessionId(): string | null {
  return activeSid;
}

const mockAdapter: AxiosAdapter = async (config) => {
  // Simulate ~80ms of latency so loading states are observable in dev.
  await new Promise((r) => setTimeout(r, 60 + Math.floor(Math.random() * 60)));
  const mocked = routeMock(config);
  if (mocked) return mocked;
  return await Promise.reject(
    Object.assign(
      new Error(`No mock route for ${(config.method ?? 'get').toUpperCase()} ${config.url}`),
      {
        isAxiosError: true,
        config,
        response: {
          data: {
            exception: `No mock for ${config.url}`,
            _server_messages: JSON.stringify([
              JSON.stringify({
                message: `Mock route missing: ${config.method?.toUpperCase()} ${config.url}`,
                indicator: 'red',
                title: 'Mock router',
              }),
            ]),
          },
          status: 404,
          statusText: 'Not Found (mock)',
          headers: {},
          config,
        },
      },
    ),
  );
};

function buildClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.frappeUrl,
    timeout: 20000,
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Client': 'barberbook-mobile',
      'X-Client-Version': env.appVersion,
    },
    // axios uses XMLHttpRequest on RN by default; the adapter swap below
    // only fires when mock mode is enabled.
    adapter: env.mock ? mockAdapter : undefined,
  });

  // ── Request interceptor ─────────────────────────────────────────────
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const id = uuid();
    config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
    config.headers.set('X-Request-Id', id);
    if (activeSid) {
      config.headers.set('Cookie', `sid=${activeSid}`);
      config.headers.set('X-Frappe-Sid', activeSid);
    }
    if (activeCsrfToken) {
      config.headers.set('X-Frappe-CSRF-Token', activeCsrfToken);
    }
    // Stash on the config so the response interceptor can correlate.
    (config as InternalAxiosRequestConfig & { _requestId: string })._requestId = id;
    useDevEventsStore.getState().recordStart({
      id,
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      startedAt: Date.now(),
      source: env.mock ? 'mock' : 'live',
    });
    return config;
  });

  // ── Response interceptor ────────────────────────────────────────────
  instance.interceptors.response.use(
    (response) => {
      const reqId =
        (response.config as InternalAxiosRequestConfig & { _requestId?: string })._requestId ?? '';
      useDevEventsStore.getState().recordFinish(reqId, {
        status: response.status,
        ok: true,
      });
      surfaceServerMessages(response.data, normalizeHeaders(response.headers));
      return response;
    },
    (error: AxiosError) => {
      const cfg = error.config as InternalAxiosRequestConfig & { _requestId?: string };
      const reqId = cfg?._requestId ?? '';
      const status = error.response?.status;
      const human = extractFrappeError(error.response?.data) ?? error.message ?? 'Request failed';
      useDevEventsStore.getState().recordFinish(reqId, {
        status,
        ok: false,
        errorMessage: human,
      });
      // Frappe sometimes packs server messages on the error response too.
      surfaceServerMessages(error.response?.data, normalizeHeaders(error.response?.headers));
      return Promise.reject(error);
    },
  );

  return instance;
}

function normalizeHeaders(raw: unknown): Record<string, string | undefined> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k.toLowerCase()] = v;
    else if (Array.isArray(v)) out[k.toLowerCase()] = v.join(', ');
  }
  return out;
}

export const api: AxiosInstance = buildClient();

/**
 * Frappe RPC payload — accepted shape is "any plain JSON object". We type
 * it as `object` rather than `Record<string, unknown>` so callers can pass
 * their typed payload interfaces (`CreateBookingPayload` etc.) directly,
 * without sprinkling `as Record<string, unknown>` casts everywhere.
 */
export type RpcPayload = object;

/**
 * Convenience wrapper around `api.post` for `frappe.client.*` and custom
 * RPC methods. Frappe wraps the return value in `{message: ...}` — this
 * unwraps it so callers see the payload directly.
 *
 * `options.headers` lets a caller stamp extra headers (typically
 * `Idempotency-Key`) without dropping out of the typed envelope helper.
 */
export interface RpcOptions {
  headers?: Record<string, string>;
}

export async function rpc<T>(
  method: string,
  payload?: RpcPayload,
  options?: RpcOptions,
): Promise<T> {
  const res = await api.post<{ message: T }>(
    `/api/method/${method}`,
    payload ?? {},
    options?.headers ? { headers: options.headers } : undefined,
  );
  return res.data.message;
}

/** Same as `rpc`, but issues a GET — useful for cacheable list endpoints. */
export async function rpcGet<T>(method: string, params?: RpcPayload): Promise<T> {
  const res = await api.get<{ message: T }>(`/api/method/${method}`, {
    params,
  });
  return res.data.message;
}

/**
 * Convert a typed `ListParams<T>` into the JSON-string-encoded `params`
 * shape Frappe expects on the wire.
 */
export function encodeListParams<T extends object>(
  params: import('./types').ListParams<T> | undefined,
): Record<string, unknown> {
  if (!params) return {};
  const out: Record<string, unknown> = {};
  if (params.fields) out.fields = JSON.stringify(params.fields);
  if (params.filters) out.filters = JSON.stringify(params.filters);
  if (params.or_filters) out.or_filters = JSON.stringify(params.or_filters);
  if (params.order_by) out.order_by = params.order_by;
  if (params.limit_start != null) out.limit_start = params.limit_start;
  if (params.limit_page_length != null) out.limit_page_length = params.limit_page_length;
  return out;
}

/** True when the client is short-circuiting via mocks. */
export const isMock = env.mock;
