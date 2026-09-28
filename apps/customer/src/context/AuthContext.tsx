import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useBackend } from '@profecian/shared';
import { useCustomer } from '@/backend';
import type { AuthProvider as Provider, AuthUser } from '@/types';

/**
 * Auth now lives in the shared (mock) backend: login is mobile OTP — see
 * app/login.tsx. This context only remembers *how* the user signed in
 * (Google or phone) for the account screen, and adapts the customer record
 * to the `AuthUser` shape the UI uses.
 */
const PROVIDER_KEY = '@profecian/customer/auth-provider';

const ProviderContext = createContext<{ provider: Provider; setProvider: (p: Provider) => void } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [provider, setState] = useState<Provider>('manual');
  useEffect(() => {
    AsyncStorage.getItem(PROVIDER_KEY).then((v) => v === 'google' && setState('google')).catch(() => undefined);
  }, []);
  const setProvider = useCallback((p: Provider) => {
    setState(p);
    AsyncStorage.setItem(PROVIDER_KEY, p).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({ provider, setProvider }), [provider, setProvider]);
  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(ProviderContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  const customer = useCustomer();
  const backend = useBackend();
  const user: AuthUser | null = customer
    ? { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, city: customer.city, provider: ctx.provider }
    : null;
  return {
    user,
    loading: false,
    setProvider: ctx.setProvider,
    logout: async () => {
      ctx.setProvider('manual');
      backend.logout();
    },
  };
}
