const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatINR(amount: number, opts: { decimals?: boolean } = {}): string {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: opts.decimals || hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact currency for KPIs, e.g. ₹1.2L, ₹3.4Cr */
export function formatINRCompact(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)}Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(1)}K`;
  return formatINR(amount);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatDateTime(ts: string): string {
  const d = new Date(ts);
  const h = d.getHours();
  const time = `${((h + 11) % 12) + 1}:${`${d.getMinutes()}`.padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}, ${time}`;
}

export function timeAgo(ts: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return formatDateTime(ts);
}

export const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
];

export function slotToMinutes(slot: string): number {
  const [time, meridiem] = slot.split(' ');
  const [h, m] = time.split(':').map(Number);
  return ((h % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + m;
}

export function scheduledAt(dateIso: string, slot: string): Date {
  const d = parseISODate(dateIso);
  const mins = slotToMinutes(slot);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

/** Slot must start at least `leadMinutes` from now. */
export function isSlotAvailable(dateIso: string, slot: string, leadMinutes = 60, now = new Date()): boolean {
  return scheduledAt(dateIso, slot).getTime() >= now.getTime() + leadMinutes * 60_000;
}

export interface DayOption {
  iso: string;
  weekday: string;
  day: number;
  month: string;
}

export function upcomingDays(count: number, from = new Date()): DayOption[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return {
      iso: toISODate(d),
      weekday: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAY_NAMES[d.getDay()],
      day: d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
    };
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

/** Strip spaces, dashes and a leading +91 / 0 to get the 10-digit Indian mobile number. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

export function formatPhone(phone: string): string {
  const p = normalizePhone(phone);
  return p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : phone;
}

export function maskNumber(value: string, visible = 4): string {
  const clean = value.replace(/\s/g, '');
  return clean.length <= visible ? clean : `${'•'.repeat(Math.min(8, clean.length - visible))}${clean.slice(-visible)}`;
}

/** Sort comparator: earliest scheduled date + slot first. */
export function bySchedule(a: { date: string; slot: string }, b: { date: string; slot: string }): number {
  return scheduledAt(a.date, a.slot).getTime() - scheduledAt(b.date, b.slot).getTime();
}

/** Chip label for any date (e.g. one picked from the calendar), relative to today. */
export function dayOption(iso: string, now = new Date()): DayOption {
  const d = parseISODate(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  return {
    iso,
    weekday: diff === 0 ? 'Today' : diff === 1 ? 'Tmrw' : DAY_NAMES[d.getDay()],
    day: d.getDate(),
    month: MONTH_NAMES[d.getMonth()],
  };
}
