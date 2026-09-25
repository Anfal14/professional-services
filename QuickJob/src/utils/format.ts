const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Address with landmark appended, without doubling a leading "Near". */
export function formatAddress(address: string, landmark?: string): string {
  if (!landmark) return address;
  const lm = /^near\b/i.test(landmark) ? landmark : `Near ${landmark}`;
  return `${address} (${lm})`;
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Local-time ISO date (yyyy-mm-dd) — avoids UTC shifting from toISOString(). */
export function toISODate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export interface DayOption {
  iso: string;
  weekday: string;
  day: number;
  month: string;
  isToday: boolean;
}

export function upcomingDays(count: number, from = new Date()): DayOption[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return {
      iso: toISODate(d),
      weekday: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAY_NAMES[d.getDay()],
      day: d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
      isToday: i === 0,
    };
  });
}

export const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
];

/** Convert a slot label to minutes after midnight. */
export function slotToMinutes(slot: string): number {
  const [time, meridiem] = slot.split(' ');
  const [h, m] = time.split(':').map(Number);
  const hours = (h % 12) + (meridiem === 'PM' ? 12 : 0);
  return hours * 60 + m;
}

/** Slots on `dateIso` that start at least `leadMinutes` from now. */
export function isSlotAvailable(dateIso: string, slot: string, leadMinutes = 60, now = new Date()): boolean {
  if (dateIso !== toISODate(now)) return true;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotToMinutes(slot) >= nowMinutes + leadMinutes;
}

export function scheduledAt(dateIso: string, slot: string): Date {
  const d = parseISODate(dateIso);
  const mins = slotToMinutes(slot);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}
