import { scheduledAt } from './format';
import type { Booking, BookingStatus, CantCompleteReason, Database, JobIssue, JobIssueKind, JobRelease, ReleaseReason, Vendor } from './types';

/**
 * Giving a job back after accepting it. Rules and messages live here so the apps, the mock backend
 * and the Spring Boot backend (ReleaseRules.java) agree on them.
 *
 * A professional never cancels the customer's booking — they *release* it: it returns to the
 * admin's queue ("awaiting assignment") without them, and the admin picks the next professional.
 *
 * - assigned (not accepted): Decline, reason optional, no effect on the professional's record.
 * - accepted, more than 2 h before the slot: release — an early release.
 * - accepted with 2 h or less to go, or on the way: release — a late release; the booking is urgent.
 * - arrived: no release; report "customer not available" / "can't do this job" for the admin to decide.
 * - in progress: no release; report "can't complete" with a reason for the admin to decide.
 */

export const RELEASE_REASONS: ReleaseReason[] = ['unwell', 'vehicle_problem', 'previous_job_late', 'wrong_service', 'other'];

export const RELEASE_REASON_LABEL: Record<ReleaseReason, string> = {
  unwell: 'Unwell',
  vehicle_problem: 'Vehicle problem',
  previous_job_late: 'Previous job running late',
  wrong_service: 'Wrong service for me',
  other: 'Other',
};

export const CANT_COMPLETE_REASONS: CantCompleteReason[] = ['needs_part', 'bigger_problem', 'safety', 'other'];

export const CANT_COMPLETE_REASON_LABEL: Record<CantCompleteReason, string> = {
  needs_part: 'Needs a part',
  bigger_problem: 'Bigger problem than booked',
  safety: 'Safety issue',
  other: 'Other',
};

export const JOB_ISSUE_LABEL: Record<JobIssueKind, string> = {
  customer_unavailable: 'Customer not available',
  cant_do: 'Can’t do this job',
  cant_complete: 'Can’t complete',
};

/** A release this close to the slot (or once on the way) is a late release. */
export const LATE_RELEASE_WINDOW_MS = 2 * 60 * 60 * 1000;
/** Shortest note accepted where a note is required. */
export const RELEASE_NOTE_MIN = 5;

export const RELEASE_ERRORS = {
  reason: 'Choose a reason',
  note: 'Add a short note to explain',
  notReleasable: 'This job can’t be released at this stage',
  onSite: 'You’re at the customer’s address — report the problem instead, and our team will decide with the customer',
  issueStage: 'You can report a problem once you have arrived',
  issueKind: 'Choose what went wrong',
  noIssue: 'There is nothing to resolve on this booking',
  returnVisit: 'A return visit needs a professional on the booking',
} as const;

/** A professional can release a job they accepted until they arrive. */
export const canRelease = (status: BookingStatus): boolean => status === 'accepted' || status === 'on_the_way';

/** Late: already on the way, or 2 hours or less to the slot (including a slot that has passed). */
export function isLateRelease(b: Pick<Booking, 'status' | 'date' | 'slot'>, now: number = Date.now()): boolean {
  return b.status === 'on_the_way' || scheduledAt(b.date, b.slot).getTime() - now <= LATE_RELEASE_WINDOW_MS;
}

/** What a professional can report at each stage on site. */
export function issueKindsFor(status: BookingStatus): JobIssueKind[] {
  return status === 'arrived' ? ['customer_unavailable', 'cant_do'] : status === 'in_progress' ? ['cant_complete'] : [];
}

const clean = (note: string | undefined) => note?.trim().replace(/\s+/g, ' ') || undefined;

/** Checks a release: a reason from the list, plus a note when the reason is "Other". Returns the error or the cleaned input. */
export function checkRelease(reason: string | undefined, note: string | undefined): { error: string } | { reason: ReleaseReason; note?: string } {
  if (!RELEASE_REASONS.includes(reason as ReleaseReason)) return { error: RELEASE_ERRORS.reason };
  const text = clean(note);
  if (reason === 'other' && (text?.length ?? 0) < RELEASE_NOTE_MIN) return { error: RELEASE_ERRORS.note };
  return { reason: reason as ReleaseReason, note: text };
}

/**
 * Checks an on-site report for the booking's stage. Arrived: what went wrong plus a note.
 * In progress: a reason, plus a note when the reason is "Other".
 */
export function checkIssue(status: BookingStatus, kind: string | undefined, reason: string | undefined, note: string | undefined): { error: string } | { kind: JobIssueKind; reason?: CantCompleteReason; note?: string } {
  const kinds = issueKindsFor(status);
  if (!kinds.length) return { error: RELEASE_ERRORS.issueStage };
  if (!kinds.includes(kind as JobIssueKind)) return { error: RELEASE_ERRORS.issueKind };
  const text = clean(note);
  if (kind === 'cant_complete') {
    if (!CANT_COMPLETE_REASONS.includes(reason as CantCompleteReason)) return { error: RELEASE_ERRORS.reason };
    if (reason === 'other' && (text?.length ?? 0) < RELEASE_NOTE_MIN) return { error: RELEASE_ERRORS.note };
    return { kind: 'cant_complete', reason: reason as CantCompleteReason, note: text };
  }
  if ((text?.length ?? 0) < RELEASE_NOTE_MIN) return { error: RELEASE_ERRORS.note };
  return { kind: kind as JobIssueKind, note: text };
}

/** Timeline text for a release: who, why, and whether it was late. */
export const releaseNote = (r: Pick<JobRelease, 'vendorName' | 'reason' | 'note' | 'late'>): string =>
  `${r.vendorName} released the job — ${RELEASE_REASON_LABEL[r.reason]}${r.note ? `: ${r.note}` : ''} (${r.late ? 'late' : 'early'} release)`;

/** Timeline text for an on-site report. */
export const issueNote = (i: Pick<JobIssue, 'vendorName' | 'kind' | 'reason' | 'note'>): string =>
  `${i.vendorName}: ${JOB_ISSUE_LABEL[i.kind]}${i.reason ? ` — ${CANT_COMPLETE_REASON_LABEL[i.reason]}` : ''}${i.note ? `: ${i.note}` : ''}`;

const lastIndexOfKind = (b: Pick<Booking, 'timeline'>, kinds: string[]): number => {
  for (let i = b.timeline.length - 1; i >= 0; i--) if (kinds.includes(b.timeline[i].kind)) return i;
  return -1;
};

/** Waiting for a new professional because the last one released it. */
export function awaitingAfterRelease(b: Pick<Booking, 'status' | 'timeline'>): boolean {
  return b.status === 'pending_assignment' && lastIndexOfKind(b, ['released']) > lastIndexOfKind(b, ['assigned', 'reassigned']);
}

/** The most recent release of a booking, if any. */
export const lastRelease = (b: Pick<Booking, 'releases'>): JobRelease | undefined => b.releases?.[b.releases.length - 1];

/** Bookings the admin has to act on because of a release or an on-site report: urgent ones first. */
export function releaseAttention(bookings: Booking[]): { released: Booking[]; urgent: Booking[]; issues: Booking[] } {
  const released = bookings.filter(awaitingAfterRelease);
  return {
    released,
    urgent: released.filter((b) => b.urgent),
    issues: bookings.filter((b) => !!b.issue && b.status !== 'cancelled' && b.status !== 'completed'),
  };
}

/** Urgent bookings (late releases) go to the top of the assignment queue; otherwise soonest first. */
export function byUrgencyThenSchedule(a: Pick<Booking, 'urgent' | 'date' | 'slot'>, b: Pick<Booking, 'urgent' | 'date' | 'slot'>): number {
  return Number(!!b.urgent) - Number(!!a.urgent) || scheduledAt(a.date, a.slot).getTime() - scheduledAt(b.date, b.slot).getTime();
}

/* ───────────── Completion rate ───────────── */

/** Jobs a professional must have accepted before a rate is shown (until then: "New"). */
export const RELIABILITY_MIN_ACCEPTED = 5;
/** Below this the rate is shown in red. */
export const RELIABILITY_LOW = 85;

export interface Reliability {
  /** Jobs the professional accepted: ones they still hold or finished, plus ones they released. */
  accepted: number;
  /** Releases with 2 hours or less to the slot, or once on the way. Early releases don't count. */
  lateReleases: number;
  /** (accepted − late releases) ÷ accepted, as a whole percentage; null until 5 jobs are accepted ("New"). */
  rate: number | null;
}

export function completionRate(accepted: number, lateReleases: number): number | null {
  return accepted < RELIABILITY_MIN_ACCEPTED ? null : Math.round(((accepted - lateReleases) * 100) / accepted);
}

/** "92%" or "New". */
export const reliabilityLabel = (r: Pick<Reliability, 'rate'>): string => (r.rate == null ? 'New' : `${r.rate}%`);

const HELD: BookingStatus[] = ['accepted', 'on_the_way', 'arrived', 'in_progress', 'completed'];

/** Whether the professional currently on a booking accepted it (a cancelled one counts if it was accepted first). */
export function acceptedByCurrentVendor(b: Pick<Booking, 'status' | 'vendorId' | 'timeline'>): boolean {
  if (!b.vendorId) return false;
  if (HELD.includes(b.status)) return true;
  return b.status === 'cancelled' && lastIndexOfKind(b, ['accepted']) > lastIndexOfKind(b, ['assigned', 'reassigned']);
}

/**
 * A professional's completion rate, worked out from booking history — no stored counters. The
 * real backend sends the two totals with the vendor (a professional's own app doesn't hold the
 * bookings they released); otherwise they are counted from the bookings at hand.
 */
export function reliabilityOf(db: Pick<Database, 'bookings'>, vendor: Pick<Vendor, 'id' | 'acceptedJobs' | 'lateReleases'>): Reliability {
  let accepted = vendor.acceptedJobs;
  let late = vendor.lateReleases;
  if (accepted == null || late == null) {
    accepted = 0;
    late = 0;
    for (const b of db.bookings) {
      if (b.vendorId === vendor.id && acceptedByCurrentVendor(b)) accepted += 1;
      for (const r of b.releases ?? []) {
        if (r.vendorId !== vendor.id) continue;
        accepted += 1;
        if (r.late) late += 1;
      }
    }
  }
  return { accepted, lateReleases: late, rate: completionRate(accepted, late) };
}

/** Added to a professional's ranking score (lower is better): 0.2 per point below 100%, nothing while "New". */
export const reliabilityPenalty = (rate: number | null): number => (rate == null ? 0 : (100 - rate) * 0.2);
