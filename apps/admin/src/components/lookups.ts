import { useMemo } from 'react';
import { bookingProblemLabel, useDb, type Booking } from '@profecian/shared';
import { useCityScope, useScopedDb } from './cityScope';

/** Name lookups over the current snapshot, memoised per database version. */
export function useLookups() {
  const db = useDb();
  return useMemo(() => {
    const category = new Map(db.categories.map((c) => [c.id, c]));
    const problem = new Map(db.problemTypes.map((p) => [p.id, p]));
    const vendor = new Map(db.vendors.map((v) => [v.id, v]));
    const customer = new Map(db.customers.map((c) => [c.id, c]));
    return {
      db,
      category,
      problem,
      vendor,
      customer,
      serviceLabel: (b: Booking) => `${category.get(b.categoryId)?.name ?? 'Service'} · ${bookingProblemLabel(db, b)}`,
      vendorName: (id?: string) => (id ? vendor.get(id)?.name ?? 'Unknown' : '—'),
    };
  }, [db]);
}

/**
 * Lookups for list sections that honour the city filter: `db` holds only the selected city's
 * records, while names still resolve platform-wide and `allDb` is the unfiltered snapshot.
 */
export function useScopedLookups() {
  const lookups = useLookups();
  const db = useScopedDb();
  const { city } = useCityScope();
  return useMemo(() => ({ ...lookups, db, allDb: lookups.db, city }), [lookups, db, city]);
}
