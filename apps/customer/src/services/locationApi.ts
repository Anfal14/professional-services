import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { nearestCity } from '@profecian/shared';
import { DEFAULT_CITY, isCity } from '@/data/locations';

/**
 * Location persistence + device location — on-device only, no backend yet.
 * Selection is either a city, the detected current location, or one of the
 * customer's saved addresses (stored by id; the address itself lives in the backend).
 */
export type LocationSelection =
  | { kind: 'city'; city: string }
  | { kind: 'current'; city: string; area: string; lat: number; lng: number }
  | { kind: 'saved'; addressId: string; city: string };

export type CurrentLocation = Extract<LocationSelection, { kind: 'current' }>;

const STORAGE_KEY = '@profecian/location/v2';
const LEGACY_KEY = '@profecian/location/v1';

export const DEFAULT_SELECTION: LocationSelection = { kind: 'city', city: DEFAULT_CITY };

function isSelection(v: unknown): v is LocationSelection {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  if (typeof s.city !== 'string') return false;
  if (s.kind === 'city') return true;
  if (s.kind === 'saved') return typeof s.addressId === 'string';
  if (s.kind === 'current') return typeof s.area === 'string' && typeof s.lat === 'number' && typeof s.lng === 'number';
  return false;
}

export async function fetchSelection(): Promise<LocationSelection> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSelection(parsed)) return parsed;
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    return legacy && isCity(legacy) ? { kind: 'city', city: legacy } : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

export async function saveSelection(selection: LocationSelection): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}

export class LocationError extends Error {}

/**
 * Asks for permission, reads the device position and turns it into a served
 * city + a readable area. Reverse geocoding is native-only, so on web the area
 * is the pinned coordinate and the city is the nearest one we serve.
 */
export async function detectCurrentLocation(): Promise<CurrentLocation> {
  const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!perm || perm.status !== 'granted') {
    throw new LocationError('Location access is off. Allow it in your browser or device settings, or add your address manually.');
  }
  let pos: Location.LocationObject;
  try {
    pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    throw new LocationError('We couldn’t get your location. Check that location services are on and try again.');
  }
  const { latitude: lat, longitude: lng } = pos.coords;
  let city = nearestCity(lat, lng).city;
  let area = '';
  if (Platform.OS !== 'web') {
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (g) {
        area = [g.name, g.street, g.district ?? g.subregion].filter((x, i, all): x is string => !!x && all.indexOf(x) === i).join(', ');
        if (g.city && isCity(g.city)) city = g.city;
      }
    } catch {
      // Fall back to the coordinate label below.
    }
  }
  if (!area) area = `Pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { kind: 'current', city, area, lat, lng };
}
