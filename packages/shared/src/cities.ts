import { distanceKm } from './geo';
import { inspectionFeeFor } from './inspection';
import type { City, CityStatus, ID, PlatformSettings, ProblemType, ServiceCategory } from './types';

export const CITY_STATUS_LABEL: Record<CityStatus, string> = {
  live: 'Live',
  coming_soon: 'Coming soon',
  paused: 'Paused',
};

export const findCity = (settings: Pick<PlatformSettings, 'cities'>, name: string | undefined): City | undefined =>
  name ? settings.cities.find((c) => c.name.toLowerCase() === name.trim().toLowerCase()) : undefined;

/** Cities customers can book in. */
export const liveCities = (settings: Pick<PlatformSettings, 'cities'>): City[] => settings.cities.filter((c) => c.status === 'live');

/** Cities vendors can register in: live ones, plus coming-soon ones that are recruiting before launch. */
export const vendorCities = (settings: Pick<PlatformSettings, 'cities'>): City[] => settings.cities.filter((c) => c.status !== 'paused');

export const isCategoryOfferedIn = (city: City | undefined, categoryId: ID): boolean => !!city && !city.disabledCategoryIds.includes(categoryId);

/**
 * Why a customer can't book `category` in `cityName` — or null when they can. The same rules (and
 * messages) as the backend's booking validation.
 */
export function bookingBlockedReason(settings: Pick<PlatformSettings, 'cities'>, cityName: string, category?: Pick<ServiceCategory, 'id' | 'name'>): string | null {
  const city = findCity(settings, cityName);
  if (!city) return `We don’t serve ${cityName || 'this location'} yet`;
  if (city.status === 'coming_soon') return `We’re launching in ${city.name} soon — bookings aren’t open yet`;
  if (city.status === 'paused') return `Bookings in ${city.name} are paused for now`;
  if (category && !isCategoryOfferedIn(city, category.id)) return `${category.name} isn’t available in ${city.name} yet`;
  return null;
}

/** The closest of `cities` to a point, and whether the point is inside that city's service radius. */
export function nearestCity(cities: City[], lat: number, lng: number): { city: City; km: number; inside: boolean } | null {
  let best: { city: City; km: number } | null = null;
  for (const city of cities) {
    const km = distanceKm({ lat, lng }, city);
    if (!best || km < best.km) best = { city, km };
  }
  return best ? { ...best, inside: best.km <= best.city.radiusKm } : null;
}

/* ───────────── City pricing — mirrored by CityPricing.java ───────────── */

export const PRICE_LEVEL_MIN = 50;
export const PRICE_LEVEL_MAX = 300;
export const BASE_PRICE_LEVEL = 100;

/**
 * A base amount at a city's price level: base × level%, rounded to the nearest amount ending in 9
 * (₹311 → ₹309, ₹315 → ₹319; a tie goes up). Level 100 returns the base untouched, and a free
 * service stays free. Done in whole numbers so the backend gets the same answer.
 */
export function cityPrice(base: number, priceLevel: number | undefined): number {
  const level = priceLevel ?? BASE_PRICE_LEVEL;
  if (level === BASE_PRICE_LEVEL || base <= 0) return base;
  // In 1/10000 ₹: (x − 9 + 5) / 10, floored, × 10 + 9 is the nearest number ending in 9 to x.
  const scaled = Math.round(base * 100) * level;
  return Math.max(9, Math.floor((scaled - 40_000) / 100_000) * 10 + 9);
}

/** What a problem costs in a city: the exact price set for that city, otherwise the base price at the city's level. */
export function problemPriceIn(problem: Pick<ProblemType, 'price' | 'cityPrices'>, city: Pick<City, 'name' | 'priceLevel'> | undefined): number {
  if (!city) return problem.price;
  return problem.cityPrices?.[city.name] ?? cityPrice(problem.price, city.priceLevel);
}

/** Whether a problem has its own exact price in this city. */
export const hasCityPrice = (problem: Pick<ProblemType, 'cityPrices'>, city: Pick<City, 'name'> | undefined): boolean =>
  !!city && problem.cityPrices?.[city.name] != null;

/** The "Other / Not sure" visit fee in a city: the category's (or default) fee at the city's price level. */
export function inspectionFeeIn(category: Pick<ServiceCategory, 'inspectionFee'> | undefined, settings: Pick<PlatformSettings, 'defaultInspectionFee'>, city: Pick<City, 'priceLevel'> | undefined): number {
  return cityPrice(inspectionFeeFor(category, settings), city?.priceLevel);
}

/** Commission for a booking in a city: the city's rate if it has one, otherwise the category's (or the default). */
export function commissionRateIn(category: Pick<ServiceCategory, 'commissionRate'> | undefined, settings: Pick<PlatformSettings, 'defaultCommissionRate'>, city: Pick<City, 'commissionRate'> | undefined): number {
  return city?.commissionRate ?? category?.commissionRate ?? settings.defaultCommissionRate;
}

export interface CityInput {
  name: string;
  state: string;
  status: CityStatus;
  lat: number;
  lng: number;
  radiusKm: number;
  areas: string[];
  disabledCategoryIds: ID[];
  /** Defaults to 100 (base prices). */
  priceLevel?: number;
  /** Empty → the category's rate. */
  commissionRate?: number | null;
}

/** Cleans and checks a city before saving — mirrored by the backend's CityService. Returns the error, or the cleaned city. */
export function normalizeCity(input: CityInput, existing: City[], editing?: string): { error: string } | { city: City } {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return { error: 'Enter the city name' };
  if (!editing && existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { error: `${name} already exists` };
  if (editing && editing !== name) return { error: 'A city can’t be renamed — bookings and addresses refer to it by name' };
  if (!(input.lat >= -90 && input.lat <= 90) || !(input.lng >= -180 && input.lng <= 180)) return { error: 'Enter a valid latitude and longitude for the city centre' };
  if (!(input.radiusKm >= 1 && input.radiusKm <= 200)) return { error: 'Service radius must be between 1 and 200 km' };
  const priceLevel = input.priceLevel ?? BASE_PRICE_LEVEL;
  if (!Number.isInteger(priceLevel) || priceLevel < PRICE_LEVEL_MIN || priceLevel > PRICE_LEVEL_MAX) {
    return { error: `Price level must be a whole percentage between ${PRICE_LEVEL_MIN} and ${PRICE_LEVEL_MAX}` };
  }
  const commissionRate = input.commissionRate ?? undefined;
  if (commissionRate !== undefined && !(commissionRate >= 0 && commissionRate <= 0.6)) return { error: 'City commission must be between 0 and 60%' };
  const areas = [...new Set(input.areas.map((a) => a.trim().replace(/\s+/g, ' ')).filter(Boolean))];
  return {
    city: {
      name,
      state: input.state.trim(),
      status: input.status,
      lat: Math.round(input.lat * 1e6) / 1e6,
      lng: Math.round(input.lng * 1e6) / 1e6,
      radiusKm: Math.round(input.radiusKm),
      areas,
      disabledCategoryIds: [...new Set(input.disabledCategoryIds)],
      priceLevel,
      // Left out entirely when unset, like the backend's JSON.
      ...(commissionRate !== undefined ? { commissionRate } : {}),
    },
  };
}
