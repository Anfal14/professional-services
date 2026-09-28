import { Redirect } from 'expo-router';
import { useVendor } from '@/backend';

/** Route by session: login → onboarding (until approved) → app. */
export default function Entry() {
  const vendor = useVendor();
  if (!vendor) return <Redirect href="/login" />;
  if (vendor.status !== 'approved') return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
