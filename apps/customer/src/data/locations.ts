/** Cities Profecian currently serves. Single source of truth for the location picker. */
export const CITIES = ['Solapur', 'Pune', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Delhi', 'Nagpur', 'Kolhapur'] as const;

export type City = (typeof CITIES)[number];

export const DEFAULT_CITY: City = 'Solapur';

export function isCity(value: string): value is City {
  return (CITIES as readonly string[]).includes(value);
}
