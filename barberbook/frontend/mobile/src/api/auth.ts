/**
 * Authentication surface. Talks to the BarberBook custom auth methods on
 * the Frappe side (`barberbook.api.auth.*`) which need to be implemented
 * on the backend (they don't exist yet — the mobile side defines the
 * contract). In mock mode the router answers these without a network hop.
 */

import { rpc, setSessionId } from './client';
import { clearSid, loadSid, saveSid } from './secureSession';
import type { SessionUser } from './types';

export interface RequestOtpResult {
  phone: string;
  /** 'sms' | 'whatsapp' | 'mock'. */
  delivery: string;
  /** Present in dev / mock so DevHud can show the code. */
  _hint?: string;
}

export interface VerifyOtpResult {
  user: SessionUser;
  sid: string;
}

/**
 * Trigger an OTP delivery for `phone` (E.164 preferred, e.g. '+9198…').
 * Resolves once the backend has accepted the request — does NOT mean the
 * SMS / WhatsApp message has been delivered.
 */
export function requestOtp(phone: string): Promise<RequestOtpResult> {
  return rpc<RequestOtpResult>('barberbook.api.auth.request_otp', { phone });
}

/**
 * Exchange (phone, code) for a SessionUser + sid. The sid is persisted to
 * SecureStore (or MMKV fallback) and stamped onto every subsequent request
 * via the axios request interceptor.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const result = await rpc<VerifyOtpResult>('barberbook.api.auth.verify_otp', { phone, code });
  if (result.sid) {
    await saveSid(result.sid);
    setSessionId(result.sid);
  }
  return result;
}

/**
 * Drop the session both client-side and server-side. The server call is
 * best-effort — even if it fails (offline, expired sid) we still wipe the
 * local session so the user can log out without a network round-trip.
 */
export async function logout(): Promise<void> {
  try {
    await rpc<unknown>('logout');
  } catch {
    // ignore — local state is what matters.
  }
  setSessionId(null);
  await clearSid();
}

/**
 * Resolve the current session user. Returns `null` when the sid is missing
 * or the server says we're not logged in.
 */
export async function me(): Promise<SessionUser | null> {
  try {
    return await rpc<SessionUser>('barberbook.api.auth.me');
  } catch {
    return null;
  }
}

/**
 * Boot-time hydration — call once at app start so the cached sid
 * (if any) is already on the axios instance before queries fire.
 * Returns the loaded sid or null.
 */
export async function hydrateSidFromStorage(): Promise<string | null> {
  const sid = await loadSid();
  if (sid) setSessionId(sid);
  return sid;
}
