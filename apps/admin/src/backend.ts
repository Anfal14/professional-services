import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockBackend } from '@profecian/shared';

/** Admin panel's instance of the mock backend (own on-device storage). */
export const backend = createMockBackend({ storage: AsyncStorage, namespace: '@profecian/admin' });
