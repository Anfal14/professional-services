import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** One selected problem. `issueId` is a problem type id or OTHER_ISSUE_ID ("Not sure"). */
export interface CartItem {
  serviceId: string;
  issueId: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  has: (serviceId: string, issueId: string) => boolean;
  toggle: (serviceId: string, issueId: string) => void;
  remove: (serviceId: string, issueId: string) => void;
  /** Empty the cart, or just one service's items. */
  clear: (serviceId?: string) => void;
}

const STORAGE_KEY = '@profecian/customer/cart/v1';
const same = (a: CartItem, serviceId: string, issueId: string) => a.serviceId === serviceId && a.issueId === issueId;

const CartContext = createContext<CartContextValue | null>(null);

/** Services the customer has picked but not booked yet — kept on-device across reloads. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (active && Array.isArray(parsed)) {
          setItems(parsed.filter((i): i is CartItem => typeof i?.serviceId === 'string' && typeof i?.issueId === 'string'));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((fn: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      has: (serviceId, issueId) => items.some((i) => same(i, serviceId, issueId)),
      toggle: (serviceId, issueId) =>
        update((prev) => (prev.some((i) => same(i, serviceId, issueId)) ? prev.filter((i) => !same(i, serviceId, issueId)) : [...prev, { serviceId, issueId }])),
      remove: (serviceId, issueId) => update((prev) => prev.filter((i) => !same(i, serviceId, issueId))),
      clear: (serviceId) => update((prev) => (serviceId ? prev.filter((i) => i.serviceId !== serviceId) : [])),
    }),
    [items, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
