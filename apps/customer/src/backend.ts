import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHttpBackend, createMockBackend, useSnapshot, type Customer } from '@profecian/shared';

/**
 * Customer app's backend: the real backend when EXPO_PUBLIC_API_URL is set (shared data across all apps),
 * otherwise the offline mock with its own on-device demo data.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
export const backend = apiUrl
  ? createHttpBackend({ baseUrl: apiUrl, storage: AsyncStorage, namespace: '@profecian/customer' })
  : createMockBackend({ storage: AsyncStorage, namespace: '@profecian/customer' });

/** The signed-in customer, or null. */
export function useCustomer(): Customer | null {
  const { db, session } = useSnapshot();
  return session?.role === 'customer' ? db.customers.find((c) => c.id === session.userId) ?? null : null;
}
