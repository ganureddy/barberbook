import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import { useBooking } from '../../api/hooks';
import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingSuccess'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingSuccess'>;

/**
 * Booking confirmation + scannable QR token. Also acts as the "Pass" tab
 * landing screen — when reached as a tab the bookingId is the most recent
 * confirmed booking; when pushed from the booking flow it's that booking.
 */
export function BookingSuccess() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  // When opened as the Pass tab, params may not include a bookingId yet.
  const bookingId = (params as { bookingId?: string } | undefined)?.bookingId ?? null;
  const bookingQ = useBooking(bookingId);

  return (
    <ScreenPlaceholder
      title="Your chair is booked"
      subtitle={
        bookingQ.data
          ? `Token ${bookingQ.data.token_code} · ${bookingQ.data.scheduled_at}`
          : bookingId
            ? 'Loading…'
            : 'No active booking yet.'
      }
      role="Customer"
      routeName="BookingSuccess"
      params={params}
      nextSteps={[
        {
          label: 'Rate the experience',
          variant: 'gold',
          onPress: () => {
            nav.navigate('RateExperience', {
              bookingId: bookingId ?? 'BB-BKG-5001',
            });
          },
        },
        {
          label: 'Back to discover',
          variant: 'ghost',
          onPress: () => {
            if (typeof nav.popToTop === 'function') {
              nav.popToTop();
            } else {
              nav.goBack();
            }
          },
        },
      ]}
    />
  );
}
