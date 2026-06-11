import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useDevEventsStore } from '../api/devEvents';
import { palette, radii, spacing } from '../design/tokens';
import { env } from '../lib/env';
import { useOnlineStatus } from '../lib/offline';
import { navigate } from '../navigation/ref';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';

import { Text } from './Text';

/**
 * Floating, draggable-ish overlay that surfaces:
 *   - Current env (mock | live), Frappe URL, channel
 *   - Auth state (role, sid presence)
 *   - Last API call (method, url, status, ms, source)
 *
 * Tap to expand / collapse. Long-press to clear the call buffer.
 *
 * Auto-mounted in `__DEV__` only. Pointer events bypass the rest of the
 * UI when collapsed, so the badge never blocks taps on the actual app.
 */
export function DevHud() {
  const [expanded, setExpanded] = useState(false);
  const lastCalls = useDevEventsStore((s) => s.lastCalls);
  const clear = useDevEventsStore((s) => s.clear);
  // NOTE: this selector returns a fresh object, so it MUST go through
  // `useShallow`. Without it, Zustand v5 (Object.is equality) sees a new
  // snapshot every render → infinite re-render → "Maximum update depth
  // exceeded". The hooks run before the `__DEV__` early-return below, so
  // this would crash release builds too.
  const auth = useAuthStore(
    useShallow((s) => ({
      status: s.status,
      role: s.activeRole,
      user: s.user,
      sid: s.sid,
    })),
  );
  const loc = useLocationStore((s) => s.current);
  const online = useOnlineStatus();
  const lastCall = lastCalls[0];

  if (!__DEV__) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.root} edges={['top', 'right']}>
      <View pointerEvents="box-none" style={styles.anchor}>
        <Pressable
          onPress={() => {
            setExpanded((x) => !x);
          }}
          onLongPress={clear}
          accessibilityRole="button"
          accessibilityLabel="Open dev HUD"
          style={[styles.badge, expanded && styles.badgeExpanded]}
        >
          <View style={[styles.dot, { backgroundColor: env.mock ? palette.gold : palette.red }]} />
          <Text variant="labelSm" color={palette.cream}>
            {env.mock ? 'MOCK' : 'LIVE'}
          </Text>
          {!online && (
            <Text variant="labelSm" color={palette.gold}>
              · OFFLINE
            </Text>
          )}
          {lastCall && (
            <Text variant="labelSm" color={palette.cream}>
              {lastCall.method} {String(lastCall.status ?? '...')}
            </Text>
          )}
          <Text variant="labelSm" color={palette.cream}>
            {auth.role ?? 'guest'}
          </Text>
        </Pressable>

        {expanded && (
          <View style={styles.panel}>
            <Row k="env" v={`${env.mock ? 'mock' : 'live'} · ${env.channel}`} />
            <Row k="frappe" v={env.frappeUrl} />
            <Row k="auth" v={`${auth.status} · ${auth.user?.email ?? '–'}`} />
            <Row k="role" v={auth.role ?? '–'} />
            <Row k="sid" v={auth.sid ? `${auth.sid.slice(0, 6)}…${auth.sid.slice(-4)}` : '–'} />
            <Row k="lat,lng" v={`${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`} />
            <Row k="city" v={loc.city ?? '–'} />
            <View style={styles.divider} />
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  setExpanded(false);
                  navigate('DevRoleSwitcher');
                }}
                style={styles.action}
                accessibilityRole="button"
              >
                <Text variant="labelSm" color={palette.gold}>
                  ↺ ROLE SWITCHER
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setExpanded(false);
                  navigate('DevShowcase');
                }}
                style={styles.action}
                accessibilityRole="button"
              >
                <Text variant="labelSm" color={palette.gold}>
                  ✦ SHOWCASE
                </Text>
              </Pressable>
            </View>
            <View style={styles.divider} />
            <Text variant="labelSm" color={palette.gold}>
              LAST API CALLS
            </Text>
            {lastCalls.length === 0 && (
              <Text variant="caption" color={palette.cream}>
                (none yet)
              </Text>
            )}
            {lastCalls.slice(0, 6).map((c) => (
              <Text key={c.id} variant="mono" color={palette.cream} numberOfLines={1}>
                {c.method} {trim(c.url)} → {c.status ?? '...'}
                {c.durationMs != null ? ` (${c.durationMs}ms)` : ''}
                {c.source === 'mock' ? ' ·m' : ' ·L'}
                {c.errorMessage ? ` ! ${c.errorMessage.slice(0, 40)}` : ''}
              </Text>
            ))}
            <Text variant="caption" color={palette.cream} style={{ marginTop: spacing.sm }}>
              long-press badge to clear
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text variant="labelSm" color={palette.gold}>
        {k}
      </Text>
      <Text
        variant="mono"
        color={palette.cream}
        numberOfLines={1}
        style={{ flex: 1, textAlign: 'right' }}
      >
        {v}
      </Text>
    </View>
  );
}

function trim(url: string): string {
  return url.length > 42 ? `…${url.slice(-40)}` : url;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 8000,
    elevation: 8,
  },
  anchor: {
    paddingTop: spacing.sm,
    paddingRight: spacing.sm,
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(14,14,16,0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  badgeExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  panel: {
    backgroundColor: 'rgba(14,14,16,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderTopRightRadius: 0,
    minWidth: 280,
    maxWidth: 360,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(245,241,232,0.15)',
    marginVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    backgroundColor: 'rgba(201,162,76,0.15)',
    borderRadius: radii.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
});
