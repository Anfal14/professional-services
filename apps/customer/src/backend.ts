import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockBackend, useSnapshot, type Customer } from '@profecian/shared';

/** Customer app's instance of the mock backend (own on-device storage). */
export const backend = createMockBackend({ storage: AsyncStorage, namespace: '@profecian/customer' });

/** The signed-in customer, or null. */
export function useCustomer(): Customer | null {
  const { db, session } = useSnapshot();
  return session?.role === 'customer' ? db.customers.find((c) => c.id === session.userId) ?? null : null;
}
