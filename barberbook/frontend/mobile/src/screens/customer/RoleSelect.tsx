import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import type { OnboardingRole, OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'RoleSelect'>;

interface RoleCard {
  key: 'customer' | 'owner' | 'staff';
  role: OnboardingRole;
  bg: string;
  fg: string;
  accent: string;
  icon: IconName;
}

const CARDS: RoleCard[] = [
  {
    key: 'customer',
    role: 'Customer',
    bg: palette.red,
    fg: palette.cream,
    accent: palette.cream,
    icon: 'scissors',
  },
  {
    key: 'owner',
    role: 'Owner',
    bg: palette.navy,
    fg: palette.cream,
    accent: palette.gold,
    icon: 'pole',
  },
  {
    key: 'staff',
    role: 'Staff',
    bg: palette.gold,
    fg: palette.ink,
    accent: palette.ink,
    icon: 'razor',
  },
];

export function RoleSelect() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Every role goes through the same phone-OTP login. The picked role is
  // carried on the route and applied as the active workspace right after a
  // successful verify (see OtpVerify). This replaces the old dev-only
  // `setDevRole` shortcut, which was a no-op in release builds — the reason
  // "Run a Shop" / "I'm a Barber" did nothing in the installed APK.
  const onPick = (role: OnboardingRole) => {
    Haptics.selectionAsync().catch(() => {});
    nav.navigate('PhoneEntry', { role });
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="labelSm" color={palette.red}>
            {t('splash.kicker')}
          </Text>
          <Text variant="display" style={{ marginTop: spacing.xs }}>
            {t('role.title')}
          </Text>
          <Text variant="editorial" color={theme.muted} style={{ marginTop: spacing.sm }}>
            {t('role.subtitle')}
          </Text>
        </View>

        <View style={styles.cards}>
          {CARDS.map((c, i) => (
            <RolePicker
              key={c.key}
              index={i}
              card={c}
              title={t(`role.${c.key}_title`)}
              subtitle={t(`role.${c.key}_sub`)}
              onPress={() => {
                onPick(c.role);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface PickerProps {
  index: number;
  card: RoleCard;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function RolePicker({ index, card, title, subtitle, onPress }: PickerProps) {
  const enter = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(
      120 + index * 110,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter, index]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 18 }, { scale: 1 - press.value * 0.02 }],
  }));

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(1, { damping: 18, stiffness: 220 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 18, stiffness: 220 });
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[styles.card, { backgroundColor: card.bg }, shadow.md]}
      >
        {/* Diagonal pole accent in the corner. */}
        <View style={[styles.cardCorner, { backgroundColor: card.accent }]} />

        <View style={styles.cardIcon}>
          <Icon name={card.icon} size={32} color={card.fg} strokeWidth={2.2} />
        </View>

        <View style={styles.cardCopy}>
          <Text variant="display" color={card.fg} style={styles.cardTitle}>
            {title}
          </Text>
          <Text variant="body" color={card.fg} style={{ opacity: 0.86, marginTop: spacing.xs }}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.cardCta}>
          <Icon name="chevronRight" size={26} color={card.fg} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.xl,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    minHeight: 160,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  cardCorner: {
    position: 'absolute',
    top: -22,
    right: -22,
    width: 80,
    height: 80,
    borderRadius: radii.sm,
    transform: [{ rotate: '20deg' }],
    opacity: 0.18,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 32,
    lineHeight: 32,
  },
  cardCta: {
    width: 28,
    alignItems: 'flex-end',
  },
});
