import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockBackend, useSnapshot, type Vendor } from '@profecian/shared';

/** Vendor app's instance of the mock backend (own on-device storage). */
export const backend = createMockBackend({ storage: AsyncStorage, namespace: '@profecian/vendor' });

/** The signed-in vendor, or null. */
export function useVendor(): Vendor | null {
  const { db, session } = useSnapshot();
  return session?.role === 'vendor' ? db.vendors.find((v) => v.id === session.userId) ?? null : null;
}
