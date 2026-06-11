/**
 * Persistent storage for the Frappe session id (`sid`).
 *
 * Lives in the device keychain via `expo-secure-store`. Falls back to MMKV
 * (or memory, via the `kv` shim) if SecureStore is unavailable — same
 * graceful-degrade strategy as `lib/storage` so Expo Go users aren't blocked.
 *
 * SID is sensitive: it grants full session impersonation. Never log it.
 */

import * as SecureStore from 'expo-secure-store';

import { kv } from '../design/storage';

const KEY = 'barberbook.sid.v1';
const ROLE_KEY = 'barberbook.role.v1';

let secureStoreAvailable: boolean | null = null;

async function probeSecureStore(): Promise<boolean> {
  if (secureStoreAvailable !== null) return secureStoreAvailable;
  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

export async function loadSid(): Promise<string | null> {
  if (await probeSecureStore()) {
    try {
      return (await SecureStore.getItemAsync(KEY)) ?? null;
    } catch {
      // Fall through to MMKV.
    }
  }
  return kv.getString(KEY) ?? null;
}

export async function saveSid(sid: string): Promise<void> {
  if (await probeSecureStore()) {
    try {
      await SecureStore.setItemAsync(KEY, sid, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    } catch {
      // Fall through.
    }
  }
  kv.set(KEY, sid);
}

export async function clearSid(): Promise<void> {
  if (await probeSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // ignore
    }
  }
  kv.delete(KEY);
}

export function loadActiveRole(): string | null {
  return kv.getString(ROLE_KEY) ?? null;
}

export function saveActiveRole(role: string): void {
  kv.set(ROLE_KEY, role);
}

export function clearActiveRole(): void {
  kv.delete(ROLE_KEY);
}
