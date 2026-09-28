import { useMemo } from 'react';
import { useDb, type Booking } from '@profecian/shared';

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
      serviceLabel: (b: Booking) => `${category.get(b.categoryId)?.name ?? 'Service'} · ${problem.get(b.problemTypeId)?.name ?? ''}`,
      vendorName: (id?: string) => (id ? vendor.get(id)?.name ?? 'Unknown' : '—'),
    };
  }, [db]);
}
