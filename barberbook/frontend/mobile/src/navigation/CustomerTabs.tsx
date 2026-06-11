import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { Icon, type IconName } from '../components';
import { useTheme } from '../design/ThemeProvider';
import { palette } from '../design/tokens';
import { BookingBarbers } from '../screens/customer/BookingBarbers';
import { BookingPay } from '../screens/customer/BookingPay';
import { BookingServices } from '../screens/customer/BookingServices';
import { BookingSuccess } from '../screens/customer/BookingSuccess';
import { BookingTime } from '../screens/customer/BookingTime';
import { DiscoveryList } from '../screens/customer/DiscoveryList';
import { DiscoveryMap } from '../screens/customer/DiscoveryMap';
import { FiltersSheet } from '../screens/customer/FiltersSheet';
import { Loyalty } from '../screens/customer/Loyalty';
import { NotificationPreview } from '../screens/customer/NotificationPreview';
import { NotificationsList } from '../screens/customer/NotificationsList';
import { Profile } from '../screens/customer/Profile';
import { RateExperience } from '../screens/customer/RateExperience';
import { ShopBarbersTab } from '../screens/customer/ShopBarbersTab';
import { ShopDetail } from '../screens/customer/ShopDetail';
import { ShopReviewsTab } from '../screens/customer/ShopReviewsTab';
import { Walkin } from '../screens/customer/Walkin';

import type {
  BookingsStackParamList,
  CustomerTabsParamList,
  DiscoverStackParamList,
  MeStackParamList,
  PassStackParamList,
  RewardsStackParamList,
} from './types';

// ─── Sub-stacks ────────────────────────────────────────────────────────────

const Discover = createNativeStackNavigator<DiscoverStackParamList>();
function DiscoverStack() {
  return (
    <Discover.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Discover.Screen
        name="DiscoveryList"
        component={DiscoveryList}
        options={{ headerShown: false }}
      />
      <Discover.Screen name="DiscoveryMap" component={DiscoveryMap} options={{ title: 'Map' }} />
      <Discover.Screen
        name="FiltersSheet"
        component={FiltersSheet}
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Discover.Screen name="ShopDetail" component={ShopDetail} options={{ title: '' }} />
      <Discover.Screen
        name="ShopBarbersTab"
        component={ShopBarbersTab}
        options={{ title: 'Barbers' }}
      />
      <Discover.Screen
        name="ShopReviewsTab"
        component={ShopReviewsTab}
        options={{ title: 'Reviews' }}
      />
      <Discover.Screen
        name="BookingServices"
        component={BookingServices}
        options={{ title: 'Services' }}
      />
      <Discover.Screen
        name="BookingBarbers"
        component={BookingBarbers}
        options={{ title: 'Barber' }}
      />
      <Discover.Screen name="BookingTime" component={BookingTime} options={{ title: 'Time' }} />
      <Discover.Screen name="BookingPay" component={BookingPay} options={{ title: 'Pay' }} />
      <Discover.Screen
        name="BookingSuccess"
        component={BookingSuccess}
        options={{ title: 'Booked' }}
      />
      <Discover.Screen
        name="RateExperience"
        component={RateExperience}
        options={{ title: 'Rate' }}
      />
    </Discover.Navigator>
  );
}

const Bookings = createNativeStackNavigator<BookingsStackParamList>();
function BookingsStack() {
  return (
    <Bookings.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Bookings.Screen name="Walkin" component={Walkin} options={{ headerShown: false }} />
      <Bookings.Screen
        name="RateExperience"
        component={RateExperience}
        options={{ title: 'Rate' }}
      />
    </Bookings.Navigator>
  );
}

const Pass = createNativeStackNavigator<PassStackParamList>();
function PassStack() {
  return (
    <Pass.Navigator screenOptions={{ headerShown: false }}>
      <Pass.Screen name="BookingSuccess" component={BookingSuccess} />
    </Pass.Navigator>
  );
}

const Rewards = createNativeStackNavigator<RewardsStackParamList>();
function RewardsStack() {
  return (
    <Rewards.Navigator screenOptions={{ headerShown: false }}>
      <Rewards.Screen name="Loyalty" component={Loyalty} />
    </Rewards.Navigator>
  );
}

const Me = createNativeStackNavigator<MeStackParamList>();
function MeStack() {
  return (
    <Me.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Me.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
      <Me.Screen
        name="NotificationsList"
        component={NotificationsList}
        options={{ title: 'Notifications' }}
      />
      <Me.Screen
        name="NotificationPreview"
        component={NotificationPreview}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Me.Navigator>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

const Tabs = createBottomTabNavigator<CustomerTabsParamList>();

const TAB_ICON: Record<keyof CustomerTabsParamList, IconName> = {
  DiscoverTab: 'search',
  BookingsTab: 'clock',
  PassTab: 'qr',
  RewardsTab: 'trophy',
  MeTab: 'menu',
};

export function CustomerTabs() {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.red,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color }) => <Icon name={TAB_ICON[route.name]} size={22} color={color} />,
      })}
    >
      <Tabs.Screen name="DiscoverTab" component={DiscoverStack} options={{ title: 'Discover' }} />
      <Tabs.Screen name="BookingsTab" component={BookingsStack} options={{ title: 'Bookings' }} />
      <Tabs.Screen name="PassTab" component={PassStack} options={{ title: 'Pass' }} />
      <Tabs.Screen name="RewardsTab" component={RewardsStack} options={{ title: 'Rewards' }} />
      <Tabs.Screen name="MeTab" component={MeStack} options={{ title: 'Me' }} />
    </Tabs.Navigator>
  );
}

function headerTitleStyle() {
  return { fontFamily: 'Manrope_700Bold' };
}
