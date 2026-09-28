import { useMemo, type ReactNode } from 'react';
import { isActive, useDb, type Booking } from '@profecian/shared';
import { useCustomer } from '@/backend';

/** Kept so the layout tree doesn't change; bookings now come from the shared backend. */
export function BookingsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** The signed-in customer's bookings, newest first. */
export function useBookings() {
  const customer = useCustomer();
  const db = useDb();
  return useMemo(() => {
    const bookings: Booking[] = customer ? db.bookings.filter((b) => b.customerId === customer.id) : [];
    return {
      bookings,
      loading: false,
      getBooking: (id: string | undefined) => bookings.find((b) => b.id === id),
    };
  }, [customer, db.bookings]);
}

/** Count of bookings still in progress, for the nav badge. */
export function useUpcomingCount(): number {
  return useBookings().bookings.filter((b) => isActive(b.status)).length;
}
