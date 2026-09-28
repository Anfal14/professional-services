import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useDb } from '@profecian/shared';
import { colors, fonts, type IconName } from '@profecian/ui';
import { useVendor } from '@/backend';

const icon = (name: IconName, active: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // Ionicons only accepts string colours.
    return <Ionicons name={focused ? active : name} size={22} color={String(color)} />;
  };

export default function TabsLayout() {
  const vendor = useVendor();
  const db = useDb();
  if (!vendor) return <Redirect href="/login" />;
  if (vendor.status !== 'approved') return <Redirect href="/onboarding" />;
  const newJobs = db.bookings.filter((b) => b.vendorId === vendor.id && b.status === 'assigned').length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: icon('briefcase-outline', 'briefcase'), tabBarBadge: newJobs || undefined }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: icon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
