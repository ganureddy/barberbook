import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { useShop } from '../../../api/hooks';
import { Card, Divider, Icon, Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';

interface Props {
  shopId: string;
}

export function AboutTab({ shopId }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const shopQ = useShop(shopId);
  const shop = shopQ.data;

  if (!shop) return null;

  const photos = shop.photos ?? (shop.cover_image ? [shop.cover_image] : []);

  return (
    <View style={styles.root}>
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gallery}
        >
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.galleryPhoto} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      <Card>
        <Row icon="pin" label={t('shop.about_address')}>
          <Text variant="body">{shop.address_line}</Text>
          <Text variant="caption" color={theme.muted}>
            {shop.city} {shop.pincode}
          </Text>
        </Row>
        <Divider />
        <Row icon="clock" label={t('shop.about_hours')}>
          <Text variant="body">
            {shop.open_time?.slice(0, 5) ?? '—'} – {shop.close_time?.slice(0, 5) ?? '—'}
          </Text>
        </Row>
        <Divider />
        <Row icon="bell" label={t('shop.about_phone')}>
          <Text variant="body" color={palette.red}>
            {shop.phone ?? '—'}
          </Text>
        </Row>
        <Divider />
        <Row icon="trophy" label={t('shop.about_amenities')}>
          <Text variant="body">A/C · UPI accepted · Card · Walk-ins · Senior discount</Text>
        </Row>
      </Card>
    </View>
  );
}

interface RowProps {
  icon: 'pin' | 'clock' | 'bell' | 'trophy';
  label: string;
  children: React.ReactNode;
}

function Row({ icon, label, children }: RowProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={18} color={theme.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="labelSm" color={theme.muted}>
          {label.toUpperCase()}
        </Text>
        <View style={{ marginTop: 2 }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  gallery: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  galleryPhoto: {
    width: 160,
    height: 120,
    borderRadius: radii.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
