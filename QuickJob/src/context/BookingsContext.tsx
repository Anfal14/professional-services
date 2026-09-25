import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '@/services/bookingsApi';
import type { Booking, BookingInput, BookingStatus } from '@/types';
import { scheduledAt } from '@/utils/format';

interface BookingsContextValue {
  bookings: Booking[];
  loading: boolean;
  addBooking: (input: BookingInput) => Promise<Booking>;
  cancelBooking: (id: string) => Promise<void>;
  getBooking: (id: string | undefined) => Booking | undefined;
  refresh: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextValue | null>(null);

/**
 * Bookings whose scheduled slot has passed are shown as completed.
 * With a real backend the server would own status transitions.
 */
export function effectiveStatus(b: Booking, now = new Date()): BookingStatus {
  if (b.status === 'cancelled' || b.status === 'completed') return b.status;
  const start = scheduledAt(b.date, b.time).getTime();
  const t = now.getTime();
  if (t >= start + 2 * 60 * 60 * 1000) return 'completed';
  if (t >= start) return 'in_progress';
  return b.status;
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.fetchBookings();
    setBookings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    api.fetchBookings().then((data) => {
      if (!active) return;
      setBookings(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const addBooking = useCallback(async (input: BookingInput) => {
    const booking = await api.createBooking(input);
    setBookings((prev) => [booking, ...prev]);
    return booking;
  }, []);

  const cancelBooking = useCallback(async (id: string) => {
    const next = await api.updateBookingStatus(id, 'cancelled');
    setBookings(next);
  }, []);

  const getBooking = useCallback((id: string | undefined) => bookings.find((b) => b.id === id), [bookings]);

  const value = useMemo(
    () => ({ bookings, loading, addBooking, cancelBooking, getBooking, refresh }),
    [bookings, loading, addBooking, cancelBooking, getBooking, refresh],
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings(): BookingsContextValue {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within BookingsProvider');
  return ctx;
}
