import type { Tone } from './status';
import type { Booking, InspectionStatus, PlatformSettings, Role, ServiceCategory } from './types';

/**
 * "Other / Not sure" requests. The booking keeps the customer's category; an
 * `inspection` block replaces the unknown problem. Rules live here so the
 * three apps and the backend agree on them.
 */

/** Minimum description a customer must give when they are not sure of the problem. */
export const INSPECTION_MIN_DETAILS = 15;
export const INSPECTION_MAX_PHOTOS = 3;
/** How the request is named next to real problem names. */
export const INSPECTION_LABEL = 'Not sure — needs inspection';
/** How an extra-work quote is named next to the booked problems. */
export const EXTRA_WORK_LABEL = 'Extra work';

/** The quote on this booking is for extra work found on site, on top of what was booked. */
export const isExtraWork = (b: Pick<Booking, 'inspection'>): boolean => b.inspection?.kind === 'extra_work';

/** The customer booked "Other / Not sure": an inspection visit, then a quote. */
export const isNotSure = (b: Pick<Booking, 'inspection'>): boolean => !!b.inspection && b.inspection.kind !== 'extra_work';

export const QUOTE_ERRORS = {
  notStarted: 'Share a quote after you start the service',
  noWorkNotStarted: 'Start the service and inspect first',
  notSureOnly: 'This applies to “Not sure” visits only',
} as const;

export const INSPECTION_STATUS: Record<InspectionStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Awaiting inspection', tone: 'info' },
  quoted: { label: 'Quote awaiting approval', tone: 'warning' },
  approved: { label: 'Quote approved', tone: 'success' },
  declined: { label: 'Quote declined', tone: 'neutral' },
  no_work_needed: { label: 'No repair needed', tone: 'success' },
};

export function inspectionFeeFor(category: Pick<ServiceCategory, 'inspectionFee'> | undefined, settings: Pick<PlatformSettings, 'defaultInspectionFee'>): number {
  return category?.inspectionFee ?? settings.defaultInspectionFee;
}

/** Pre-tax amount of the known problems in a booking. */
export function itemsAmount(b: Pick<Booking, 'items'>): number {
  return (b.items ?? []).reduce((sum, i) => sum + i.price, 0);
}

/** Pre-tax amount for the visit: known problems + inspection fee, or the approved quote instead of the fee. */
export function inspectionServiceAmount(b: Pick<Booking, 'items' | 'inspection'>): number {
  const i = b.inspection;
  if (!i) return itemsAmount(b);
  return itemsAmount(b) + (i.status === 'approved' && i.quote ? i.quote.amount : i.fee);
}

/** True while the final price is still open (no inspection yet, or a quote waiting for an answer). */
export function isQuoteOpen(b: Pick<Booking, 'inspection'>): boolean {
  return !!b.inspection && (b.inspection.status === 'pending' || b.inspection.status === 'quoted');
}

/** Whether the professional can share a quote / close the inspection now: only once the service is started. */
export function canQuote(b: Pick<Booking, 'inspection' | 'status'>): boolean {
  return !!b.inspection && b.status === 'in_progress' && (b.inspection.status === 'pending' || b.inspection.status === 'declined');
}

/**
 * On a normal booking (no quote thread yet) the professional can quote extra work once the service is started.
 * If approved it is added to the booked work; if declined they complete only what was booked.
 */
export function canQuoteExtraWork(b: Pick<Booking, 'inspection' | 'status'>): boolean {
  return !b.inspection && b.status === 'in_progress';
}

/** Whether the professional can send a quote now — the first one, a revised one, or one for extra work. */
export const canShareQuote = (b: Pick<Booking, 'inspection' | 'status'>): boolean => canQuote(b) || canQuoteExtraWork(b);

/** One line telling each party what happens next with this request. */
export function inspectionNextStep(b: Pick<Booking, 'inspection' | 'status' | 'vendorId'>, audience: Role): string {
  const i = b.inspection;
  if (!i) return '';
  if (b.status === 'cancelled') return 'This booking was cancelled.';
  if (i.kind === 'extra_work') {
    switch (i.status) {
      case 'quoted':
        return audience === 'customer' ? 'Your professional found more work. Review the quote and approve or decline it — the booked work goes ahead either way.'
          : audience === 'vendor' ? 'Waiting for the customer to approve your quote. Don’t start the extra work yet.'
          : 'Customer has not answered the extra-work quote — follow up or record their answer.';
      case 'approved':
        return audience === 'vendor' ? 'Quote approved — do the extra work too, then complete the job.' : 'Quote approved — the professional will do the extra work as well.';
      case 'declined':
        return audience === 'vendor' ? 'Quote declined. Complete the booked work only, or share a revised quote.' : 'Quote declined — only the booked work will be done and charged.';
      default:
        return '';
    }
  }
  switch (i.status) {
    case 'pending':
      if (!b.vendorId) return audience === 'admin' ? 'Assign a professional for this category.' : 'We’re assigning a professional who will inspect and quote.';
      if (audience === 'vendor') return b.status === 'in_progress' ? 'Inspect, then share a quote — or mark that no repair is needed.' : b.status === 'arrived' ? 'Start the service with the customer’s code, then inspect and share a quote.' : 'Read the customer’s description before the visit.';
      return audience === 'customer' ? 'The professional will inspect first and share a quote before doing any work.' : 'Professional inspects on arrival and shares a quote.';
    case 'quoted':
      return audience === 'customer' ? 'Review the quote and approve or decline it.' : audience === 'vendor' ? 'Waiting for the customer to approve your quote. Don’t start the repair yet.' : 'Customer has not answered the quote — follow up or record their answer.';
    case 'approved':
      return audience === 'vendor' ? 'Quote approved — go ahead with the repair, then complete the job.' : 'Quote approved — the professional will carry out the repair.';
    case 'declined':
      return audience === 'vendor' ? 'Quote declined. Complete the job for the inspection fee, or share a revised quote.' : 'Quote declined — only the inspection fee applies.';
    case 'no_work_needed':
      return 'Inspected — no repair was needed. Only the inspection fee applies.';
  }
}

/** Open "Not sure" requests where support may need to step in: no professional yet, or a quote unanswered. */
export function inspectionNeedsAttention(b: Pick<Booking, 'inspection' | 'status' | 'vendorId'>): boolean {
  if (!b.inspection || b.status === 'completed' || b.status === 'cancelled') return false;
  return !b.vendorId || b.inspection.status === 'quoted';
}
