import { VENDOR_NEXT } from './status';
import type { Booking, BookingStatus } from './types';

/**
 * Safeguards on a professional's job workflow. Rules and messages live here so the vendor app, the
 * mock backend and the Spring Boot backend (VendorJobRules.java) agree on them.
 *
 * 1. Start code — when the professional arrives the customer's app shows a 4-digit code; the
 *    professional must enter it to start the service. Support can still start the job for them.
 * 2. After photo — at least one "after" photo before the service can be completed.
 * 3. Undo — each step can be undone for a few seconds, to fix an accidental slide.
 * 4. One at a time — a professional can have only one job in progress.
 */

export const START_CODE_LENGTH = 4;
/** Wrong codes allowed before the job must be started by support. */
export const START_CODE_MAX_ATTEMPTS = 5;
/** How long "Undo" is offered after a step. */
export const UNDO_WINDOW_MS = 10_000;
/** Extra time a backend allows on top of the window, for a slow network. */
export const UNDO_GRACE_MS = 5_000;
export const MIN_AFTER_PHOTOS = 1;
export const MAX_PROOF_PHOTOS = 6;

/** "before" photos are optional; an "after" photo is needed to complete. */
export type ProofKind = 'before' | 'after';

export const JOB_ERRORS = {
  startCodeMissing: `Enter the ${START_CODE_LENGTH}-digit start code from the customer’s app`,
  startCodeWrong: (triesLeft: number) => `That code doesn’t match — ask the customer for the start code in their app (${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left)`,
  startCodeLocked: 'Too many wrong codes. Ask support to start this job.',
  busy: (code: string) => `Finish job ${code} first — only one job can be in progress at a time`,
  afterPhoto: 'Add at least one “after” photo before completing the service',
  tooManyPhotos: `You can add up to ${MAX_PROOF_PHOTOS} photos of each kind`,
  undoExpired: 'This step can no longer be undone',
  cashAmountMissing: 'Enter the amount you received',
  cashAmountMismatch: 'The amount received must match the amount due',
} as const;

export const isValidStartCode = (code: string | undefined): code is string => !!code && new RegExp(`^\\d{${START_CODE_LENGTH}}$`).test(code);

/** A new random start code, e.g. "0482". */
export const newStartCode = (random: () => number = Math.random): string =>
  String(Math.floor(random() * 10 ** START_CODE_LENGTH)).padStart(START_CODE_LENGTH, '0');

/** The status each vendor step came from — the inverse of VENDOR_NEXT. */
export const VENDOR_PREVIOUS = Object.fromEntries(Object.entries(VENDOR_NEXT).map(([from, to]) => [to, from])) as Partial<Record<BookingStatus, BookingStatus>>;

/** Another of this professional's jobs that is in progress right now, if any. */
export function otherJobInProgress(bookings: Booking[], vendorId: string, bookingId: string): Booking | undefined {
  return bookings.find((b) => b.vendorId === vendorId && b.id !== bookingId && b.status === 'in_progress');
}

/**
 * The step the professional can still undo — the status to go back *from* — or null. It must be the
 * very last thing that happened to the booking, done by the professional, within the undo window,
 * and a completed job must not have been paid or reviewed yet.
 */
export function undoableStep(b: Pick<Booking, 'status' | 'timeline' | 'payment' | 'reviewId'>, now: number = Date.now(), graceMs = 0): BookingStatus | null {
  const last = b.timeline[b.timeline.length - 1];
  if (!last || last.by !== 'vendor' || last.kind !== b.status || !VENDOR_PREVIOUS[b.status]) return null;
  if (now - Date.parse(last.at) > UNDO_WINDOW_MS + graceMs) return null;
  if (b.status === 'completed' && (b.payment.status === 'paid' || b.payment.status === 'pending' || b.reviewId)) return null;
  return b.status;
}

/** Milliseconds of undo time left for the last step (0 when it can't be undone). */
export function undoTimeLeft(b: Pick<Booking, 'status' | 'timeline' | 'payment' | 'reviewId'>, now: number = Date.now()): number {
  if (!undoableStep(b, now)) return 0;
  return Math.max(0, UNDO_WINDOW_MS - (now - Date.parse(b.timeline[b.timeline.length - 1].at)));
}

/** Cash is recorded only when the professional enters exactly the amount due (to the paisa). */
export const cashMatches = (amountReceived: number, due: number): boolean => Math.round(amountReceived * 100) === Math.round(due * 100);

export const afterPhotosOf = (b: Pick<Booking, 'afterPhotos'>): string[] => b.afterPhotos ?? [];
