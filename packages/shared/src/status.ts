import type { BookingStatus, ComplaintStatus, DocStatus, PaymentMethod, PaymentStatus, PayoutStatus, ReviewStatus, VendorStatus } from './types';

/** Semantic tone → each app maps it to its own colours. */
export type Tone = 'neutral' | 'info' | 'primary' | 'warning' | 'success' | 'danger';

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone; icon: string }> = {
  pending_assignment: { label: 'Awaiting assignment', tone: 'warning', icon: 'hourglass-outline' },
  assigned: { label: 'Professional assigned', tone: 'info', icon: 'person-outline' },
  accepted: { label: 'Accepted', tone: 'primary', icon: 'checkmark-circle-outline' },
  on_the_way: { label: 'On the way', tone: 'primary', icon: 'navigate-outline' },
  arrived: { label: 'Arrived', tone: 'primary', icon: 'location-outline' },
  in_progress: { label: 'In progress', tone: 'info', icon: 'construct-outline' },
  completed: { label: 'Completed', tone: 'success', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: 'close-circle-outline' },
};

/** Order used for the customer's live-tracking stepper. */
export const TRACKING_STEPS: BookingStatus[] = [
  'pending_assignment',
  'assigned',
  'accepted',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
];

/** Statuses a vendor can move a job into, from each status. */
export const VENDOR_NEXT: Partial<Record<BookingStatus, BookingStatus>> = {
  assigned: 'accepted',
  accepted: 'on_the_way',
  on_the_way: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
};

export const VENDOR_ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  assigned: 'Accept job',
  accepted: 'Start travel',
  on_the_way: 'Mark arrived',
  arrived: 'Start service',
  in_progress: 'Complete service',
};

export const ACTIVE_STATUSES: BookingStatus[] = ['pending_assignment', 'assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress'];

export function isActive(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Customers may cancel/reschedule until the professional is on the way. */
export function canCustomerModify(status: BookingStatus): boolean {
  return status === 'pending_assignment' || status === 'assigned' || status === 'accepted';
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Credit / Debit card',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  cash: 'Cash after service',
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'info' },
};

export const VENDOR_STATUS: Record<VendorStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'neutral' },
};

export const DOC_STATUS: Record<DocStatus, { label: string; tone: Tone }> = {
  missing: { label: 'Not uploaded', tone: 'neutral' },
  pending: { label: 'Under review', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  processing: { label: 'Processing', tone: 'info' },
  settled: { label: 'Settled', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
};

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  published: { label: 'Published', tone: 'success' },
  hidden: { label: 'Hidden', tone: 'neutral' },
  flagged: { label: 'Flagged', tone: 'danger' },
};

export const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'danger' },
  in_progress: { label: 'In progress', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
};

export const KYC_LABEL = {
  aadhaar: 'Aadhaar card',
  pan: 'PAN card',
  driving_license: 'Driving licence',
  selfie: 'Selfie verification',
  bank_proof: 'Bank proof (cancelled cheque / passbook)',
} as const;
