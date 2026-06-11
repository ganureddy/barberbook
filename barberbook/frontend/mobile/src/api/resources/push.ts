import { rpc } from '../client';

export interface RegisterDevicePayload {
  /** Expo push token (`ExponentPushToken[xxx]`). */
  expo_push_token: string;
  /** 'ios' | 'android'. */
  platform: 'ios' | 'android' | 'web';
  /** App build channel — production / preview / dev. */
  channel: string;
  /** App version (semver). */
  app_version: string;
  /** Device info hint (model, OS version) — non-sensitive. */
  device_label?: string;
}

export interface RegisterDeviceResult {
  /** Server-assigned token id; useful for unregister later. */
  token_id: string;
  registered_at: string;
}

/**
 * Register the user's Expo push token with the BarberBook backend so
 * future server-side `barberbook.api.push.send_to_user(...)` calls reach
 * the device. Idempotent on the (user, expo_push_token) pair.
 */
export function registerDevice(payload: RegisterDevicePayload): Promise<RegisterDeviceResult> {
  return rpc<RegisterDeviceResult>('barberbook.api.push.register_device', payload);
}

export function unregisterDevice(expoPushToken: string): Promise<void> {
  return rpc<void>('barberbook.api.push.unregister_device', {
    expo_push_token: expoPushToken,
  });
}
