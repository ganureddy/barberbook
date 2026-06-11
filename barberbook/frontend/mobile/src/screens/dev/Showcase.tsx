import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestOtp } from '../../api/auth';
import { useNearbyShops, useShops } from '../../api/hooks';
import {
  BarberPole,
  Button,
  Card,
  Chip,
  Divider,
  ICON_NAMES,
  Icon,
  Portrait,
  ShopPhoto,
  Stars,
  Tag,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing, shadow } from '../../design/tokens';
import { textVariants, type TextVariant } from '../../design/typography';
import { env } from '../../lib/env';
import { toast } from '../../lib/toast';
import { useLocationStore } from '../../store/useLocationStore';

interface Props {
  onClose?: () => void;
}

/**
 * Single-route design tokens + primitives showcase. Mounted in dev only.
 * Sections are stacked vertically in one ScrollView to keep the route count
 * at one — no Storybook, no nested navigator, no extra deps.
 */
export function Showcase({ onClose }: Props) {
  const { theme, mode, preference, setPreference, toggle } = useTheme();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: theme.line }]}>
        <View style={{ flex: 1 }}>
          <Text variant="labelSm" color={palette.red}>
            BARBERBOOK · DEV
          </Text>
          <Text variant="displaySm">Design showcase</Text>
        </View>
        <Pressable onPress={toggle} style={styles.modeBtn} hitSlop={12}>
          <Icon name={mode === 'dark' ? 'star' : 'bell'} size={18} color={theme.text} />
          <Text variant="label" color={theme.text}>
            {mode.toUpperCase()}
          </Text>
        </Pressable>
        {onClose != null && (
          <Pressable onPress={onClose} style={[styles.modeBtn, { marginLeft: 8 }]} hitSlop={12}>
            <Icon name="close" size={18} color={theme.text} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ApiSmokeSection />

        <Section title="Theme preference">
          <View style={styles.row}>
            {(['system', 'light', 'dark'] as const).map((p) => (
              <Chip
                key={p}
                label={p}
                active={preference === p}
                onPress={() => {
                  setPreference(p);
                }}
              />
            ))}
          </View>
          <Text variant="caption" style={{ marginTop: spacing.sm }}>
            Active mode: {mode}. Preference is persisted via MMKV (with an in-memory fallback in
            Expo Go).
          </Text>
        </Section>

        <Section title="Palette">
          <View style={styles.swatchGrid}>
            {(
              [
                ['red', palette.red],
                ['redDeep', palette.redDeep],
                ['navy', palette.navy],
                ['navyDeep', palette.navyDeep],
                ['cream', palette.cream],
                ['creamDeep', palette.creamDeep],
                ['ink', palette.ink],
                ['charcoal', palette.charcoal],
                ['gold', palette.gold],
                ['goldSoft', palette.goldSoft],
                ['muted', palette.muted],
              ] as const
            ).map(([name, hex]) => (
              <View key={name} style={styles.swatch}>
                <View
                  style={[styles.swatchChip, { backgroundColor: hex, borderColor: theme.line }]}
                />
                <Text variant="label">{name}</Text>
                <Text variant="mono" color={theme.muted}>
                  {hex}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Radii & spacing">
          <View style={styles.row}>
            {(['sm', 'md', 'lg', 'xl', 'pill'] as const).map((r) => (
              <View key={r} style={{ alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: palette.red,
                    borderRadius: radii[r],
                  }}
                />
                <Text variant="caption">r.{r}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.row, { marginTop: spacing.lg, alignItems: 'flex-end' }]}>
            {([4, 8, 12, 16, 20, 24, 32, 48] as const).map((step) => (
              <View key={step} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: step, height: 32, backgroundColor: palette.navy }} />
                <Text variant="caption">{step}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Shadows">
          <View style={styles.row}>
            {(['none', 'sm', 'md', 'lg'] as const).map((s) => (
              <View
                key={s}
                style={[
                  styles.shadowBox,
                  { backgroundColor: theme.surface, borderColor: theme.line },
                  shadow[s],
                ]}
              >
                <Text variant="label">{s}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Typography ramp">
          {(Object.keys(textVariants) as TextVariant[]).map((v) => (
            <View key={v} style={{ marginBottom: spacing.sm }}>
              <Text variant="caption" color={theme.muted}>
                {v} · {textVariants[v].fontSize}/{textVariants[v].lineHeight}
              </Text>
              <Text variant={v}>The chair is waiting.</Text>
            </View>
          ))}
        </Section>

        <Section title="Buttons · variants">
          <View style={styles.row}>
            <Button variant="primary" label="Primary" />
            <Button variant="red" label="Book a chair" />
            <Button variant="gold" label="Redeem 1,000 pts" />
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Button variant="cream" label="Cancel" />
            <Button variant="ghost" label="Skip" />
            <Button variant="red" label="Pay ₹932" loading />
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Button variant="primary" label="Disabled" disabled />
            <Button
              variant="red"
              label="With icon"
              leading={<Icon name="check" size={16} color={palette.white} />}
            />
          </View>
        </Section>

        <Section title="Buttons · sizes">
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Button variant="red" size="sm" label="Small" />
            <Button variant="red" size="md" label="Medium" />
            <Button variant="red" size="lg" label="Large" />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button variant="primary" size="lg" label="Block button" block />
          </View>
        </Section>

        <Section title="Tags & chips">
          <View style={styles.row}>
            <Tag label="LIVE" bg={palette.red} color={palette.cream} />
            <Tag label="VERIFIED" bg={palette.gold} color={palette.ink} />
            <Tag label="NEXT UP" bg={palette.ink} color={palette.cream} />
            <Tag label="DONE" bg="#3F6B5F" color={palette.cream} />
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Chip label="Open now" active />
            <Chip label="Walk-in OK" active color={palette.red} />
            <Chip label="Highest rated" />
            <Chip label="Beard" />
          </View>
        </Section>

        <Section title="Stars">
          <View style={{ gap: spacing.xs }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <View key={n} style={[styles.row, { alignItems: 'center' }]}>
                <Stars value={n} />
                <Text variant="bodyBold">{n.toFixed(1)}</Text>
                <Text variant="caption">({n * 78})</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Cards">
          <Card>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <ShopPhoto variant={0} width={64} height={64} radius={radii.md} name="RAJ" />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={[styles.row, { alignItems: 'center' }]}>
                  <Tag label="OPEN" bg={palette.red} color={palette.cream} />
                  <Text variant="caption">0.4 km · 5 min</Text>
                </View>
                <Text variant="bodyBold">Raj's Classic Cuts</Text>
                <View style={[styles.row, { alignItems: 'center' }]}>
                  <Stars value={5} />
                  <Text variant="bodyBold">4.8</Text>
                  <Text variant="caption">(312) · ₹₹</Text>
                </View>
              </View>
            </View>
          </Card>

          <Card style={{ marginTop: spacing.md }} alt>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <Portrait seed="imran-k" size={56} initials="IK" />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={[styles.row, { alignItems: 'center' }]}>
                  <Text variant="bodyBold">Imran K.</Text>
                  <Tag label="SEAT 1" bg={palette.cream} color={palette.ink} />
                </View>
                <Text variant="caption">Fades · Skin · 4.9 ★ · 8 yrs</Text>
              </View>
            </View>
          </Card>

          <Card
            style={{
              marginTop: spacing.md,
              backgroundColor: palette.red,
              borderColor: palette.red,
            }}
          >
            <View style={[styles.row, { alignItems: 'center' }]}>
              <Text variant="displaySm" color={palette.cream}>
                07
              </Text>
              <View>
                <Text variant="bodyBold" color={palette.cream}>
                  Your token
                </Text>
                <Text variant="caption" color={palette.cream}>
                  3rd in line · ~22 min
                </Text>
              </View>
            </View>
          </Card>
        </Section>

        <Section title="Avatars (seed-based)">
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {['imran-k', 'priya', 'farah', 'arjun', 'sara', 'dev', 'noor', 'kabir'].map((seed) => (
              <View key={seed} style={{ alignItems: 'center', gap: 4 }}>
                <Portrait seed={seed} size={56} initials={seed.slice(0, 2)} />
                <Text variant="caption">{seed}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Storefront illustrations">
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {[0, 1, 2, 3].map((v) => (
              <View key={v} style={{ alignItems: 'center', gap: 4 }}>
                <ShopPhoto variant={v} width={120} height={120} name={`SHOP ${v + 1}`} />
                <Text variant="caption">variant {v}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Barber poles">
          <View style={[styles.row, { alignItems: 'flex-end' }]}>
            <BarberPole width={28} height={80} />
            <BarberPole width={36} height={120} />
            <BarberPole width={48} height={160} speed={1.6} />
            <BarberPole width={36} height={120} animated={false} />
          </View>
          <Text variant="caption" style={{ marginTop: spacing.sm }}>
            The last one is static (animated=false). The others continuously climb.
          </Text>
        </Section>

        <Section title="Iconography">
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {ICON_NAMES.map((n) => (
              <View key={n} style={styles.iconCell}>
                <Icon name={n} size={22} />
                <Text variant="caption">{n}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Dividers">
          <Text variant="body">Above</Text>
          <Divider />
          <Text variant="body" style={{ marginTop: spacing.xs }}>
            Hairline
          </Text>
          <Divider strong />
          <Text variant="body" style={{ marginTop: spacing.xs }}>
            Strong
          </Text>
        </Section>

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="label" color={theme.muted} style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Sanity-check the API layer end-to-end without leaving Showcase. In mock
 * mode this hits the in-process router; with `EXPO_PUBLIC_MOCK=0` and a
 * Frappe URL set, the same buttons exercise real network calls.
 */
function ApiSmokeSection() {
  const shopsQ = useShops();
  const loc = useLocationStore((s) => s.current);
  const nearbyQ = useNearbyShops({
    latitude: loc.latitude,
    longitude: loc.longitude,
    radius_km: 5,
    limit: 5,
  });

  return (
    <Section title={`API smoke · ${env.mock ? 'MOCK' : 'LIVE'} · ${env.frappeUrl}`}>
      <View style={styles.row}>
        <Button
          variant="red"
          size="sm"
          label={shopsQ.isFetching ? 'Loading…' : `useShops (${shopsQ.data?.length ?? 0})`}
          onPress={() => shopsQ.refetch()}
        />
        <Button
          variant="primary"
          size="sm"
          label={nearbyQ.isFetching ? 'Loading…' : `useNearbyShops (${nearbyQ.data?.length ?? 0})`}
          onPress={() => nearbyQ.refetch()}
        />
        <Button
          variant="gold"
          size="sm"
          label="requestOtp"
          onPress={() => {
            requestOtp('+91 98000 12345').catch((err) => {
              toast.error(err?.message ?? 'OTP request failed');
            });
          }}
        />
      </View>

      {shopsQ.isError && (
        <Text variant="caption" color={palette.red} style={{ marginTop: spacing.sm }}>
          shops error: {String(shopsQ.error)}
        </Text>
      )}
      {shopsQ.data && shopsQ.data.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: 4 }}>
          {shopsQ.data.slice(0, 3).map((s) => (
            <Text key={s.name} variant="mono" numberOfLines={1}>
              {s.name} · {s.shop_name} · {s.city} · ★{s.rating.toFixed(1)}
            </Text>
          ))}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatch: {
    width: 88,
    gap: 4,
  },
  swatchChip: {
    height: 56,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  shadowBox: {
    width: 84,
    height: 56,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCell: {
    width: 72,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
});
