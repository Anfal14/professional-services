import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHttpBackend, createMockBackend, useSnapshot, type Vendor } from '@profecian/shared';

/**
 * Vendor app's backend: the real backend when EXPO_PUBLIC_API_URL is set (shared data across all apps),
 * otherwise the offline mock with its own on-device demo data.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
export const backend = apiUrl
  ? createHttpBackend({ baseUrl: apiUrl, storage: AsyncStorage, namespace: '@profecian/vendor' })
  : createMockBackend({ storage: AsyncStorage, namespace: '@profecian/vendor' });

/** The signed-in vendor, or null. */
export function useVendor(): Vendor | null {
  const { db, session } = useSnapshot();
  return session?.role === 'vendor' ? db.vendors.find((v) => v.id === session.userId) ?? null : null;
}
