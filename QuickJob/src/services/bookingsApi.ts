import AsyncStorage from '@react-native-async-storage/async-storage';
import { getService, OTHER_ISSUE_ID } from '@/data/services';
import type { Booking, BookingInput } from '@/types';
import { normalizePhone } from '@/utils/validation';

/**
 * Booking persistence layer.
 * Currently backed by on-device storage; swap these functions for real
 * HTTP calls when a backend is available — the rest of the app only
 * depends on this module's signatures.
 */
const STORAGE_KEY = '@quickjob/bookings/v1';

function generateId(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.floor(Math.random() * 36 ** 3).toString(36).toUpperCase().padStart(3, '0');
  return `QJ${ts}${rand}`;
}

export async function fetchBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Booking[]) : [];
  } catch {
    return [];
  }
}

async function persist(bookings: Booking[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const service = getService(input.serviceId);
  if (!service) throw new Error('Unknown service');

  const issue = service.issues.find((i) => i.id === input.issueId);
  if (!issue && input.issueId !== OTHER_ISSUE_ID) throw new Error('Unknown issue');

  const booking: Booking = {
    ...input,
    name: input.name.trim(),
    address: input.address.trim(),
    landmark: input.landmark?.trim() || undefined,
    phone: normalizePhone(input.phone),
    id: generateId(),
    status: 'confirmed',
    price: issue?.price ?? service.startingPrice,
    createdAt: new Date().toISOString(),
  };

  const existing = await fetchBookings();
  await persist([booking, ...existing]);
  return booking;
}

export async function updateBookingStatus(id: string, status: Booking['status']): Promise<Booking[]> {
  const existing = await fetchBookings();
  const next = existing.map((b) => (b.id === id ? { ...b, status } : b));
  await persist(next);
  return next;
}
