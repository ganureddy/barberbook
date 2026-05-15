import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { Icon, type IconName } from '../components';
import { useTheme } from '../design/ThemeProvider';
import { palette } from '../design/tokens';
import { OwnerAddService } from '../screens/owner/OwnerAddService';
import { OwnerKYC } from '../screens/owner/OwnerKYC';
import { OwnerMenu } from '../screens/owner/OwnerMenu';
import { OwnerMoney } from '../screens/owner/OwnerMoney';
import { OwnerReviews } from '../screens/owner/OwnerReviews';
import { OwnerRoster } from '../screens/owner/OwnerRoster';
import { OwnerRosterConflict } from '../screens/owner/OwnerRosterConflict';
import { OwnerSeats } from '../screens/owner/OwnerSeats';
import { OwnerSignup } from '../screens/owner/OwnerSignup';
import { OwnerToday } from '../screens/owner/OwnerToday';
import { OwnerWalkin } from '../screens/owner/OwnerWalkin';

import type {
  MenuStackParamList,
  MoneyStackParamList,
  OwnerTabsParamList,
  RosterStackParamList,
  ShopStackParamList,
  TodayStackParamList,
} from './types';

// ─── Sub-stacks ────────────────────────────────────────────────────────────

const Today = createNativeStackNavigator<TodayStackParamList>();
function TodayStack() {
  return (
    <Today.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Today.Screen name="OwnerToday" component={OwnerToday} options={{ headerShown: false }} />
      <Today.Screen
        name="OwnerWalkin"
        component={OwnerWalkin}
        options={{ title: 'Walk-in queue' }}
      />
    </Today.Navigator>
  );
}

const Roster = createNativeStackNavigator<RosterStackParamList>();
function RosterStack() {
  return (
    <Roster.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Roster.Screen name="OwnerRoster" component={OwnerRoster} options={{ headerShown: false }} />
      <Roster.Screen
        name="OwnerRosterConflict"
        component={OwnerRosterConflict}
        options={{ title: 'Conflicts' }}
      />
      <Roster.Screen name="OwnerSeats" component={OwnerSeats} options={{ title: 'Seats' }} />
    </Roster.Navigator>
  );
}

const Menu = createNativeStackNavigator<MenuStackParamList>();
function MenuStack() {
  return (
    <Menu.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Menu.Screen name="OwnerMenu" component={OwnerMenu} options={{ headerShown: false }} />
      <Menu.Screen
        name="OwnerAddService"
        component={OwnerAddService}
        options={{ presentation: 'modal', title: 'Service' }}
      />
    </Menu.Navigator>
  );
}

const Money = createNativeStackNavigator<MoneyStackParamList>();
function MoneyStack() {
  return (
    <Money.Navigator screenOptions={{ headerShown: false }}>
      <Money.Screen name="OwnerMoney" component={OwnerMoney} />
    </Money.Navigator>
  );
}

const Shop = createNativeStackNavigator<ShopStackParamList>();
function ShopStack() {
  return (
    <Shop.Navigator screenOptions={{ headerShown: true, headerTitleStyle: headerTitleStyle() }}>
      <Shop.Screen name="OwnerReviews" component={OwnerReviews} options={{ headerShown: false }} />
      <Shop.Screen name="OwnerSignup" component={OwnerSignup} options={{ title: 'Shop signup' }} />
      <Shop.Screen name="OwnerKYC" component={OwnerKYC} options={{ title: 'KYC' }} />
    </Shop.Navigator>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

const Tabs = createBottomTabNavigator<OwnerTabsParamList>();

const TAB_ICON: Record<keyof OwnerTabsParamList, IconName> = {
  TodayTab: 'clock',
  RosterTab: 'calendar',
  MenuTab: 'scissors',
  MoneyTab: 'rupee',
  ShopTab: 'pole',
};

export function OwnerTabs() {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.navy,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color }) => <Icon name={TAB_ICON[route.name]} size={22} color={color} />,
      })}
    >
      <Tabs.Screen name="TodayTab" component={TodayStack} options={{ title: 'Today' }} />
      <Tabs.Screen name="RosterTab" component={RosterStack} options={{ title: 'Roster' }} />
      <Tabs.Screen name="MenuTab" component={MenuStack} options={{ title: 'Menu' }} />
      <Tabs.Screen name="MoneyTab" component={MoneyStack} options={{ title: 'Money' }} />
      <Tabs.Screen name="ShopTab" component={ShopStack} options={{ title: 'Shop' }} />
    </Tabs.Navigator>
  );
}

function headerTitleStyle() {
  return { fontFamily: 'Manrope_700Bold' };
}
