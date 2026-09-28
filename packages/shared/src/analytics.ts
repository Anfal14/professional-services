/** Pure selectors over the Database for dashboards and reports. */
import { toISODate } from './format';
import type { Booking, Database } from './types';

const isPaid = (b: Booking) => b.status === 'completed' && b.payment.status === 'paid';

export interface Kpis {
  totalUsers: number;
  totalVendors: number;
  approvedVendors: number;
  pendingVendors: number;
  activeBookings: number;
  completedBookings: number;
  pendingAssignments: number;
  revenue: number;
  commission: number;
  vendorPayouts: number;
  openComplaints: number;
  averageRating: number;
}

export function kpis(db: Database): Kpis {
  const paid = db.bookings.filter(isPaid);
  const published = db.reviews.filter((r) => r.status === 'published');
  return {
    totalUsers: db.customers.length,
    totalVendors: db.vendors.length,
    approvedVendors: db.vendors.filter((v) => v.status === 'approved').length,
    pendingVendors: db.vendors.filter((v) => v.status === 'pending').length,
    activeBookings: db.bookings.filter((b) => !['completed', 'cancelled', 'pending_assignment'].includes(b.status)).length,
    completedBookings: db.bookings.filter((b) => b.status === 'completed').length,
    pendingAssignments: db.bookings.filter((b) => b.status === 'pending_assignment').length,
    revenue: round(paid.reduce((s, b) => s + b.price.total, 0)),
    commission: round(paid.reduce((s, b) => s + b.price.commission, 0)),
    vendorPayouts: round(paid.reduce((s, b) => s + b.price.vendorPayout, 0)),
    openComplaints: db.complaints.filter((c) => c.status !== 'resolved').length,
    averageRating: published.length ? round(published.reduce((s, r) => s + r.rating, 0) / published.length, 1) : 0,
  };
}

function round(n: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export interface DailyPoint {
  date: string;
  revenue: number;
  commission: number;
  bookings: number;
  completed: number;
  cancelled: number;
}

/** One point per day for the last `days` days, keyed by booking creation date. */
export function dailySeries(db: Database, days: number, now = new Date()): DailyPoint[] {
  const points = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = toISODate(d);
    points.set(key, { date: key, revenue: 0, commission: 0, bookings: 0, completed: 0, cancelled: 0 });
  }
  for (const b of db.bookings) {
    const p = points.get(toISODate(new Date(b.createdAt)));
    if (!p) continue;
    p.bookings += 1;
    if (b.status === 'completed') p.completed += 1;
    if (b.status === 'cancelled') p.cancelled += 1;
    if (isPaid(b)) {
      p.revenue += b.price.total;
      p.commission += b.price.commission;
    }
  }
  return [...points.values()].map((p) => ({ ...p, revenue: round(p.revenue), commission: round(p.commission) }));
}

export interface RankedRow {
  id: string;
  label: string;
  bookings: number;
  revenue: number;
  secondary?: number;
}

export function topServices(db: Database): RankedRow[] {
  return db.categories
    .map((c) => {
      const mine = db.bookings.filter((b) => b.categoryId === c.id && b.status !== 'cancelled');
      return { id: c.id, label: c.name, bookings: mine.length, revenue: round(mine.filter(isPaid).reduce((s, b) => s + b.price.total, 0)) };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function topVendors(db: Database): RankedRow[] {
  return db.vendors
    .filter((v) => v.status === 'approved' || v.status === 'suspended')
    .map((v) => {
      const mine = db.bookings.filter((b) => b.vendorId === v.id && b.status === 'completed');
      return { id: v.id, label: v.name, bookings: mine.length, revenue: round(mine.filter(isPaid).reduce((s, b) => s + b.price.serviceAmount, 0)), secondary: v.rating };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function cityPerformance(db: Database): RankedRow[] {
  const cities = new Map<string, RankedRow>();
  for (const b of db.bookings) {
    if (b.status === 'cancelled') continue;
    const c = b.address.city;
    const row = cities.get(c) ?? { id: c, label: c, bookings: 0, revenue: 0, secondary: 0 };
    row.bookings += 1;
    if (isPaid(b)) row.revenue = round(row.revenue + b.price.total);
    cities.set(c, row);
  }
  for (const row of cities.values()) row.secondary = db.vendors.filter((v) => v.city === row.id && v.status === 'approved').length;
  return [...cities.values()].sort((a, b) => b.revenue - a.revenue);
}

export function paymentMix(db: Database): { method: string; count: number; amount: number }[] {
  const mix = new Map<string, { method: string; count: number; amount: number }>();
  for (const b of db.bookings.filter(isPaid)) {
    const m = b.payment.method ?? 'upi';
    const row = mix.get(m) ?? { method: m, count: 0, amount: 0 };
    row.count += 1;
    row.amount = round(row.amount + b.price.total);
    mix.set(m, row);
  }
  return [...mix.values()].sort((a, b) => b.amount - a.amount);
}
