/**
 * Typed navigation parameter lists.
 *
 * One file holding every stack/tab param list keeps the screen files small
 * (one type import each). Screens use `NativeStackScreenProps<List, 'Name'>`
 * or `BottomTabScreenProps<List, 'Name'>` to get fully typed `route.params`.
 *
 * Architecture:
 *
 *   RootStack
 *   ├─ Onboarding (group)        — pre-auth: Splash → RoleSelect → Phone → OTP → LocationPerm
 *   ├─ Customer  (group)         — CustomerTabs (5 tabs, each a stack)
 *   ├─ Owner     (group)         — OwnerTabs (5 tabs, each a stack) + onboarding pushables
 *   ├─ Staff     (group)         — StaffStack (native-stack, no tab bar by canvas spec)
 *   └─ Dev       (group)         — DevRoleSwitcher modal + DevShowcase
 *
 * Decision driven by `useAuthStore` (status + activeRole).
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Root ───────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Customer: NavigatorScreenParams<CustomerTabsParamList>;
  Owner: NavigatorScreenParams<OwnerTabsParamList>;
  Staff: NavigatorScreenParams<StaffStackParamList>;
  DevRoleSwitcher: undefined;
  DevShowcase: undefined;
};

// ─── Onboarding ─────────────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  Splash: undefined;
  RoleSelect: undefined;
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  LocationPerm: undefined;
};

// ─── Customer ───────────────────────────────────────────────────────────────

export type CustomerTabsParamList = {
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
  BookingsTab: NavigatorScreenParams<BookingsStackParamList>;
  PassTab: NavigatorScreenParams<PassStackParamList>;
  RewardsTab: NavigatorScreenParams<RewardsStackParamList>;
  MeTab: NavigatorScreenParams<MeStackParamList>;
};

export type DiscoverStackParamList = {
  DiscoveryList: undefined;
  DiscoveryMap: undefined;
  FiltersSheet: undefined;
  ShopDetail: { id: string };
  ShopBarbersTab: { id: string };
  ShopReviewsTab: { id: string };
  BookingServices: { shopId: string };
  BookingBarbers: { shopId: string };
  BookingTime: { shopId: string };
  BookingPay: { shopId: string };
  BookingSuccess: { bookingId: string };
  RateExperience: { bookingId: string };
};

export type BookingsStackParamList = {
  Walkin: undefined;
  RateExperience: { bookingId: string };
};

export type PassStackParamList = {
  BookingSuccess: { bookingId?: string };
};

export type RewardsStackParamList = {
  Loyalty: undefined;
};

export type MeStackParamList = {
  Profile: undefined;
  NotificationsList: undefined;
  NotificationPreview: undefined;
};

// ─── Owner ──────────────────────────────────────────────────────────────────

export type OwnerTabsParamList = {
  TodayTab: NavigatorScreenParams<TodayStackParamList>;
  RosterTab: NavigatorScreenParams<RosterStackParamList>;
  MenuTab: NavigatorScreenParams<MenuStackParamList>;
  MoneyTab: NavigatorScreenParams<MoneyStackParamList>;
  ShopTab: NavigatorScreenParams<ShopStackParamList>;
};

export type TodayStackParamList = {
  OwnerToday: undefined;
  OwnerWalkin: undefined;
};

export type RosterStackParamList = {
  OwnerRoster: undefined;
  OwnerRosterConflict: { rosterName?: string };
  OwnerSeats: undefined;
};

export type MenuStackParamList = {
  OwnerMenu: undefined;
  OwnerAddService: { serviceName?: string };
};

export type MoneyStackParamList = {
  OwnerMoney: undefined;
};

export type ShopStackParamList = {
  OwnerReviews: undefined;
  OwnerSignup: undefined;
  OwnerKYC: undefined;
};

// ─── Staff ──────────────────────────────────────────────────────────────────

export type StaffStackParamList = {
  StaffSchedule: undefined;
  StaffInService: { bookingId?: string };
  StaffCustomer: { customerId: string };
  StaffEarnings: undefined;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
