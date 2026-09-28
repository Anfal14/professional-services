import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CITY, isCity, type City } from '@/data/locations';

/**
 * Location persistence layer — on-device only, no geolocation/backend yet.
 * Mirrors bookingsApi.ts/authApi.ts so it's a drop-in swap (e.g. for
 * geolocation + a serviceable-cities API) later.
 */
const STORAGE_KEY = '@profecian/location/v1';

export async function fetchCity(): Promise<City> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw && isCity(raw) ? raw : DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
}

export async function saveCity(city: City): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, city);
}
