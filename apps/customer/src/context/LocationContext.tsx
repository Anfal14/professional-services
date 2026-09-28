import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CITY, type City } from '@/data/locations';
import * as api from '@/services/locationApi';

interface LocationContextValue {
  city: City;
  loading: boolean;
  setCity: (city: City) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<City>(DEFAULT_CITY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.fetchCity().then((c) => {
      if (!active) return;
      setCityState(c);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const setCity = useCallback((next: City) => {
    setCityState(next);
    api.saveCity(next);
  }, []);

  const value = useMemo(() => ({ city, loading, setCity }), [city, loading, setCity]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
