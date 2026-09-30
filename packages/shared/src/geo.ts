/** Great-circle distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Approximate city centres used for mock geocoding and "nearest vendor". */
export const CITY_CENTRES: Record<string, { lat: number; lng: number }> = {
  Solapur: { lat: 17.6599, lng: 75.9064 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Kolhapur: { lat: 16.705, lng: 74.2433 },
};

/** Deterministic pseudo-location near a city centre, so mock addresses have coordinates. */
export function jitterNear(city: string, seed: string): { lat: number; lng: number } {
  const c = CITY_CENTRES[city] ?? CITY_CENTRES.Solapur;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 255 - 0.5) * 0.12;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 0.12;
  return { lat: c.lat + dy, lng: c.lng + dx };
}

export function mapsUrl(address: { line: string; city: string; lat?: number; lng?: number }): string {
  const q = address.lat != null && address.lng != null ? `${address.lat},${address.lng}` : `${address.line}, ${address.city}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

/** Closest served city to a coordinate — the web fallback for reverse geocoding. */
export function nearestCity(lat: number, lng: number): { city: string; km: number } {
  let best = { city: 'Solapur', km: Infinity };
  for (const [city, c] of Object.entries(CITY_CENTRES)) {
    const km = distanceKm({ lat, lng }, c);
    if (km < best.km) best = { city, km };
  }
  return best;
}
