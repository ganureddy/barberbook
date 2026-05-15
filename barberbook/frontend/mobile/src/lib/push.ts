/**
 * Push-notification + local-reminder plumbing.
 *
 * Three distinct concerns live here:
 *
 *   1. Register an Expo push token with the BarberBook backend so the
 *      server can target this device with remote pushes.
 *   2. Subscribe to foreground reception and tap-to-deep-link dispatch.
 *   3. Schedule offline-safe local reminders 24h and 1h before each
 *      booking — so a flaky network doesn't lose the wake-up.
 *
 * Failure paths are deliberately quiet:
 *   - In Expo Go, `getExpoPushTokenAsync()` throws; we catch and skip.
 *   - On a sim without Apple Push entitlements, registration also fails.
 *   - Local notifications work in Expo Go on iOS sim, so the reminder
 *     path is the one we lean on for the dev experience.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDevice } from '../api/resources/push';
import { kv } from '../design/storage';
import { navigate } from '../navigation/ref';

import { env } from './env';

const TOKEN_KEY = 'barberbook.push.token.v1';
const SCHEDULED_KEY_PREFIX = 'barberbook.push.scheduled.';

// ─── Foreground display config ──────────────────────────────────────────────

// Tell Notifications how to render an incoming push while the app is open.
// Showing the banner+sound mirrors what the OS does in the background, so
// users notice the booking confirmation even mid-app.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

// Android: requires a channel before a notification can be posted.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'BarberBook',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D4322C',
  });
  await Notifications.setNotificationChannelAsync('booking-reminder', {
    name: 'Booking reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#C9A24C',
  });
}

// ─── Permission + token registration ────────────────────────────────────────

export interface PushRegistrationResult {
  granted: boolean;
  token: string | null;
}

/**
 * Idempotent on a successful registration — the token is cached in MMKV
 * and re-sent only when it changes (Expo can rotate tokens).
 */
export async function registerPush(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators, but local notifications
    // do — the rest of the flow is still useful in dev.
    return { granted: false, token: null };
  }

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const next = await Notifications.requestPermissionsAsync();
    status = next.status;
  }
  if (status !== 'granted') {
    return { granted: false, token: null };
  }

  let expoToken: string | null = null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    expoToken = result.data;
  } catch {
    // Expo Go without a project / sim without entitlements / FCM not set up.
    return { granted: true, token: null };
  }

  if (!expoToken) return { granted: true, token: null };

  // Skip the round-trip when the token hasn't changed.
  const cached = kv.getString(TOKEN_KEY);
  if (cached === expoToken) {
    return { granted: true, token: expoToken };
  }

  try {
    await registerDevice({
      expo_push_token: expoToken,
      platform: (Platform.OS as 'ios' | 'android' | 'web') ?? 'ios',
      channel: env.channel,
      app_version: env.appVersion,
      device_label: `${Device.brand ?? ''} ${Device.modelName ?? ''}`.trim() || undefined,
    });
    kv.set(TOKEN_KEY, expoToken);
  } catch {
    // Backend not yet implementing the method — token is still useful
    // for local notifications; we just won't receive remote pushes.
  }

  return { granted: true, token: expoToken };
}

// ─── Foreground reception + tap routing ─────────────────────────────────────

interface PushPayload {
  type?: 'booking_confirmation' | 'walkin_update' | 'review_prompt' | 'loyalty_earned' | 'reminder';
  bookingId?: string;
  shopId?: string;
}

/**
 * Wires both listeners (foreground reception + response-to-tap) and
 * returns a teardown that removes them. Call once at app boot.
 */
export function attachPushListeners(): () => void {
  const recv = Notifications.addNotificationReceivedListener(() => {
    // No-op for now — `setNotificationHandler` already shows the banner.
    // Hook future analytics here ('push_received').
  });

  const tap = Notifications.addNotificationResponseReceivedListener((response) => {
    const raw = response.notification.request.content.data as Record<string, unknown> | null;
    const data = (raw ?? {}) as PushPayload;
    routeFromPush(data);
  });

  return () => {
    recv.remove();
    tap.remove();
  };
}

function routeFromPush(data: PushPayload): void {
  switch (data.type) {
    case 'booking_confirmation':
    case 'reminder':
      if (data.bookingId) {
        navigate('Customer', {
          screen: 'DiscoverTab',
          params: { screen: 'BookingSuccess', params: { bookingId: data.bookingId } },
        });
      }
      break;
    case 'walkin_update':
      navigate('Customer', { screen: 'BookingsTab', params: { screen: 'Walkin' } });
      break;
    case 'review_prompt':
      if (data.bookingId) {
        navigate('Customer', {
          screen: 'DiscoverTab',
          params: { screen: 'RateExperience', params: { bookingId: data.bookingId } },
        });
      }
      break;
    case 'loyalty_earned':
      navigate('Customer', { screen: 'RewardsTab', params: { screen: 'Loyalty' } });
      break;
    default:
      break;
  }
}

// ─── Local reminders (24h + 1h before scheduled_at) ─────────────────────────

export interface BookingReminderArgs {
  bookingId: string;
  shopName: string;
  scheduledAt: string; // ISO datetime
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * Schedule local notifications 24h and 1h before the booking start. If the
 * window has already passed (e.g. a same-day booking), the long-lead one
 * is silently skipped. Returns the count of notifications actually posted.
 *
 * Idempotent: calling twice for the same `bookingId` cancels the old
 * triggers first so we never double-fire.
 */
export async function scheduleBookingReminders({
  bookingId,
  shopName,
  scheduledAt,
}: BookingReminderArgs): Promise<number> {
  await ensureAndroidChannel();
  await cancelBookingReminders(bookingId);

  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start) || start <= Date.now()) return 0;

  const idsToPersist: string[] = [];

  const scheduled: { leadMs: number; title: string; body: string }[] = [
    {
      leadMs: ONE_DAY_MS,
      title: 'Tomorrow at the chair',
      body: `${shopName} · ${formatLocalTime(scheduledAt)}`,
    },
    {
      leadMs: ONE_HOUR_MS,
      title: 'Heading to BarberBook?',
      body: `${shopName} in 1 hour · ${formatLocalTime(scheduledAt)}`,
    },
  ];

  for (const s of scheduled) {
    const triggerAt = start - s.leadMs;
    if (triggerAt <= Date.now()) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: s.title,
          body: s.body,
          data: { type: 'reminder', bookingId },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerAt),
          channelId: 'booking-reminder',
        },
      });
      idsToPersist.push(id);
    } catch {
      // Permission missing or platform error; continue with the others.
    }
  }

  if (idsToPersist.length > 0) {
    kv.set(SCHEDULED_KEY_PREFIX + bookingId, JSON.stringify(idsToPersist));
  }
  return idsToPersist.length;
}

export async function cancelBookingReminders(bookingId: string): Promise<void> {
  const raw = kv.getString(SCHEDULED_KEY_PREFIX + bookingId);
  if (!raw) return;
  let ids: string[] = [];
  try {
    ids = JSON.parse(raw) as string[];
  } catch {
    return;
  }
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* already fired or invalid id — ignore */
    }
  }
  kv.delete(SCHEDULED_KEY_PREFIX + bookingId);
}

/**
 * Convenience: post a one-shot notification matching the production
 * lock-screen template. Used by the in-app NotificationPreview screen.
 */
export async function presentLocalPreview(): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'The chair is ready',
      body: "Imran K. is calling token 07 at Raj's Classic Cuts.",
      data: { type: 'walkin_update' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: 'default',
      repeats: false,
    },
  });
}

function formatLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
