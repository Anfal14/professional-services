import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { bookingBlockedReason, findCity, liveCities, useDb, type Address, type City } from '@profecian/shared';
import { useCustomer } from '@/backend';
import * as api from '@/services/locationApi';
import type { CurrentLocation, LocationSelection } from '@/services/locationApi';

interface LocationContextValue {
  selection: LocationSelection;
  /** City the customer is booking in (from the address, detected location or picked city). */
  city: string;
  /** That city's details, when the platform knows it. */
  cityInfo?: City;
  /** Why bookings can't be placed in that city (coming soon, paused, not served) — null when they can. */
  blockedReason: string | null;
  /** Same, for booking a particular service here (also covers services this city doesn't offer). */
  blockedFor: (category: { id: string; name: string }) => string | null;
  /** Cities open for booking, in display order. */
  liveCities: City[];
  /** Cities announced but not open yet. */
  comingSoonCities: City[];
  /** The chosen saved address, if the selection is one. */
  selectedAddress?: Address;
  /** Top-bar line 1, e.g. "Home", "Current location" or "Solapur". */
  title: string;
  /** Top-bar line 2 — the full address, or a prompt to add one. */
  subtitle: string;
  addresses: Address[];
  loading: boolean;
  selectCity: (city: string) => void;
  selectAddress: (address: Address) => void;
  selectCurrent: (current: CurrentLocation) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function formatFullAddress(a: Pick<Address, 'line' | 'landmark' | 'city' | 'pincode'>): string {
  return [a.line, a.landmark ? `Near ${a.landmark}` : '', a.city + (a.pincode ? ` ${a.pincode}` : '')].filter(Boolean).join(', ');
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const customer = useCustomer();
  const { settings } = useDb();
  const [selection, setSelection] = useState<LocationSelection>(api.DEFAULT_SELECTION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.fetchSelection().then((s) => {
      if (!active) return;
      setSelection(s);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const choose = useCallback((next: LocationSelection) => {
    setSelection(next);
    api.saveSelection(next).catch(() => undefined);
  }, []);

  const addresses = useMemo(() => customer?.addresses ?? [], [customer]);

  const value = useMemo<LocationContextValue>(() => {
    // A saved address that no longer exists (deleted, or signed out) falls back to its city.
    const selectedAddress = selection.kind === 'saved' ? addresses.find((a) => a.id === selection.addressId) : undefined;
    const live = liveCities(settings);
    // A picked city the platform no longer has (removed) falls back to the first live one.
    const pickedCity = selection.kind === 'city' && settings.cities.length && !findCity(settings, selection.city)
      ? live[0]?.name ?? selection.city
      : selection.city;
    const city = selectedAddress?.city ?? pickedCity;
    let title: string = pickedCity;
    let subtitle = 'Set your exact address for faster booking';
    if (selectedAddress) {
      title = selectedAddress.label;
      subtitle = formatFullAddress(selectedAddress);
    } else if (selection.kind === 'current') {
      title = 'Current location';
      subtitle = `${selection.area}, ${selection.city}`;
    }
    return {
      selection,
      city,
      cityInfo: findCity(settings, city),
      // Until the city list has loaded, don't warn; the backend checks again when booking.
      blockedReason: settings.cities.length ? bookingBlockedReason(settings, city) : null,
      blockedFor: (category) => (settings.cities.length ? bookingBlockedReason(settings, city, category) : null),
      liveCities: live,
      comingSoonCities: settings.cities.filter((c) => c.status === 'coming_soon'),
      selectedAddress,
      title,
      subtitle,
      addresses,
      loading,
      selectCity: (name) => choose({ kind: 'city', city: name }),
      selectAddress: (a) => choose({ kind: 'saved', addressId: a.id, city: a.city }),
      selectCurrent: (current) => choose(current),
    };
  }, [selection, addresses, loading, choose, settings]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
