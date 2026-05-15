/**
 * Deep-link config.
 *
 * Schemes:
 *   - Custom scheme: `barberbook://...` (mobile app)
 *   - https mirror:  `https://barberbook.app/...` (universal links / app links)
 *
 * Routes today:
 *   - `barberbook://shop/:id`     → Customer ▸ Discover ▸ ShopDetail
 *   - `barberbook://booking/:id`  → Customer ▸ Bookings ▸ Pass ▸ BookingSuccess
 *   - `barberbook://walkin`       → Customer ▸ Bookings ▸ Walkin
 *   - `barberbook://rewards`      → Customer ▸ Rewards ▸ Loyalty
 *
 * The path → screen map below mirrors the nested navigator shape exactly.
 * react-navigation walks it nested-first, so deep paths resolve into the
 * correct sub-stack and pass typed params through.
 */

import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['barberbook://', 'https://barberbook.app/'],
  config: {
    initialRouteName: 'Customer',
    screens: {
      Onboarding: {
        screens: {
          Splash: 'splash',
          RoleSelect: 'role-select',
          PhoneEntry: 'phone',
          OtpVerify: 'otp/:phone',
          LocationPerm: 'location-permission',
        },
      },
      Customer: {
        path: '',
        screens: {
          DiscoverTab: {
            screens: {
              DiscoveryList: 'discover',
              DiscoveryMap: 'discover/map',
              FiltersSheet: 'discover/filters',
              ShopDetail: 'shop/:id',
              ShopBarbersTab: 'shop/:id/barbers',
              ShopReviewsTab: 'shop/:id/reviews',
              BookingServices: 'shop/:shopId/book/services',
              BookingBarbers: 'shop/:shopId/book/barbers',
              BookingTime: 'shop/:shopId/book/time',
              BookingPay: 'shop/:shopId/book/pay',
              BookingSuccess: 'booking/:bookingId',
              RateExperience: 'booking/:bookingId/rate',
            },
          },
          BookingsTab: {
            screens: {
              Walkin: 'walkin',
              RateExperience: 'walkin/rate/:bookingId',
            },
          },
          PassTab: {
            screens: {
              BookingSuccess: 'pass',
            },
          },
          RewardsTab: {
            screens: {
              Loyalty: 'rewards',
            },
          },
          MeTab: {
            screens: {
              Profile: 'me',
              NotificationsList: 'me/notifications',
            },
          },
        },
      },
      Owner: {
        path: 'owner',
        screens: {
          TodayTab: { screens: { OwnerToday: 'today', OwnerWalkin: 'today/walkin' } },
          RosterTab: {
            screens: {
              OwnerRoster: 'roster',
              OwnerRosterConflict: 'roster/conflict',
              OwnerSeats: 'seats',
            },
          },
          MenuTab: {
            screens: {
              OwnerMenu: 'menu',
              OwnerAddService: 'menu/service/:serviceName?',
            },
          },
          MoneyTab: { screens: { OwnerMoney: 'money' } },
          ShopTab: {
            screens: {
              OwnerReviews: 'reviews',
              OwnerSignup: 'signup',
              OwnerKYC: 'kyc',
            },
          },
        },
      },
      Staff: {
        path: 'staff',
        screens: {
          StaffSchedule: 'schedule',
          StaffInService: 'in-service/:bookingId?',
          StaffCustomer: 'customer/:customerId',
          StaffEarnings: 'earnings',
        },
      },
      DevRoleSwitcher: 'dev/role-switcher',
      DevShowcase: 'dev/showcase',
    },
  },
};
