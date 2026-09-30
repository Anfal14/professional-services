import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Address } from '@profecian/shared';
import { useCustomer } from '@/backend';
import * as api from '@/services/locationApi';
import type { CurrentLocation, LocationSelection } from '@/services/locationApi';

interface LocationContextValue {
  selection: LocationSelection;
  /** City the customer is booking in (from the address, detected location or picked city). */
  city: string;
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
    let title: string = selection.city;
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
      city: selectedAddress?.city ?? selection.city,
      selectedAddress,
      title,
      subtitle,
      addresses,
      loading,
      selectCity: (city) => choose({ kind: 'city', city }),
      selectAddress: (a) => choose({ kind: 'saved', addressId: a.id, city: a.city }),
      selectCurrent: (current) => choose(current),
    };
  }, [selection, addresses, loading, choose]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
