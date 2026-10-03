import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHttpBackend, createMockBackend } from '@profecian/shared';

/**
 * Admin panel's backend: the real backend when EXPO_PUBLIC_API_URL is set (shared data across all apps),
 * otherwise the offline mock with its own on-device demo data.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
export const backend = apiUrl
  ? createHttpBackend({ baseUrl: apiUrl, storage: AsyncStorage, namespace: '@profecian/admin' })
  : createMockBackend({ storage: AsyncStorage, namespace: '@profecian/admin' });
