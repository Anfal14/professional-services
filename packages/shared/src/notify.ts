import { issueNote, JOB_ISSUE_LABEL, RELEASE_REASON_LABEL } from './release';
import { bookingProblemLabel } from './pricing';
import { formatDate, formatINR } from './format';
import { whatsappLink } from './providers';
import type { AppNotification, Booking, Channel, Database, NotificationKind, Vendor, JobIssue, JobRelease } from './types';

let counter = 0;
const nid = () => `ntf_${Date.now().toString(36)}_${(counter++).toString(36)}`;

interface NotifyInput {
  audience: AppNotification['audience'];
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  channels: Channel[];
  bookingId?: string;
  /** Phone that receives the WhatsApp message (customer or vendor). */
  whatsappTo?: string;
  whatsappText?: string;
}

export function makeNotification(input: NotifyInput): AppNotification {
  const { whatsappTo, whatsappText, ...rest } = input;
  return {
    ...rest,
    id: nid(),
    whatsappUrl: rest.channels.includes('whatsapp') && whatsappTo ? whatsappLink(whatsappTo, whatsappText ?? `${input.title}\n\n${input.body}`) : undefined,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

const names = (db: Database, b: Booking) => {
  const cat = db.categories.find((c) => c.id === b.categoryId);
  return { service: cat?.name ?? 'Service', problem: bookingProblemLabel(db, b) };
};

/** WhatsApp booking acknowledgement sent to the customer right after booking. */
export function bookingAckText(db: Database, b: Booking): string {
  const { service, problem } = names(db, b);
  return [
    `Hi ${b.customerName.split(' ')[0]}! 👋`,
    `Your Profecian booking is confirmed ✅`,
    ``,
    `🆔 Booking ID: ${b.code}`,
    `🛠️ ${service} – ${problem}`,
    `📅 ${formatDate(b.date)} at ${b.slot}`,
    `📍 ${b.address.line}${b.address.landmark ? ` (Near ${b.address.landmark})` : ''}, ${b.address.city}`,
    b.inspection
      ? `💰 ${formatINR(b.price.total)} inspection visit (incl. GST) — the professional quotes before any repair`
      : `💰 ${formatINR(b.price.total)} (incl. GST)`,
    ``,
    `We'll share your professional's details as soon as one is assigned.`,
  ].join('\n');
}

/** Notifications emitted for each booking lifecycle event (customer / vendor / admin). */
export const notifyFor = {
  bookingCreated(db: Database, b: Booking): AppNotification[] {
    const { service } = names(db, b);
    return [
      makeNotification({
        audience: 'customer', recipientId: b.customerId, kind: 'booking_confirmed', bookingId: b.id,
        title: 'Booking confirmed', body: `${service} on ${formatDate(b.date)}, ${b.slot}. ID ${b.code}.`,
        channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone, whatsappText: bookingAckText(db, b),
      }),
      makeNotification({
        audience: 'admin', recipientId: 'admin', kind: 'new_booking', bookingId: b.id,
        title: 'New booking', body: `${b.code} · ${service} in ${b.address.city} — needs a professional.`, channels: ['in_app'],
      }),
    ];
  },
  vendorAssigned(db: Database, b: Booking, v: Vendor): AppNotification[] {
    const { service, problem } = names(db, b);
    return [
      makeNotification({
        audience: 'customer', recipientId: b.customerId, kind: 'vendor_assigned', bookingId: b.id,
        title: 'Professional assigned', body: `${v.name} (★ ${v.rating || 'New'}) will handle your ${service} booking ${b.code}.`,
        channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
      }),
      makeNotification({
        audience: 'vendor', recipientId: v.id, kind: 'new_assignment', bookingId: b.id,
        title: 'New job assigned', body: `${service} – ${problem} · ${formatDate(b.date)}, ${b.slot} · ${b.address.city}. Earn ${formatINR(b.price.vendorPayout)}.`,
        channels: ['push', 'whatsapp'], whatsappTo: v.phone,
      }),
    ];
  },
  vendorOnTheWay(db: Database, b: Booking, v: Vendor): AppNotification[] {
    return [makeNotification({
      audience: 'customer', recipientId: b.customerId, kind: 'vendor_on_the_way', bookingId: b.id,
      title: 'Professional on the way', body: `${v.name} is heading to your address for booking ${b.code}.`,
      channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
    })];
  },
  /** Tells the customer the start code to read out at the door. */
  vendorArrived(db: Database, b: Booking, v: Vendor): AppNotification[] {
    return [makeNotification({
      audience: 'customer', recipientId: b.customerId, kind: 'vendor_arrived', bookingId: b.id,
      title: 'Your professional has arrived', body: `${v.name} is at your address. Start code ${b.startCode} — share it only when they are at your door.`,
      channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
    })];
  },
  serviceCompleted(db: Database, b: Booking): AppNotification[] {
    const { service } = names(db, b);
    return [makeNotification({
      audience: 'customer', recipientId: b.customerId, kind: 'service_completed', bookingId: b.id,
      title: 'Service completed', body: `Your ${service} job ${b.code} is done. Amount due ${formatINR(b.price.total)}. Please rate your professional.`,
      channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
    })];
  },
  paymentReceived(db: Database, b: Booking): AppNotification[] {
    const out = [makeNotification({
      audience: 'customer', recipientId: b.customerId, kind: 'payment_received', bookingId: b.id,
      title: 'Payment received', body: `We received ${formatINR(b.price.total)} for booking ${b.code}. Your invoice is ready.`,
      channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
    })];
    if (b.vendorId && b.payment.method !== 'cash') {
      out.push(makeNotification({
        audience: 'vendor', recipientId: b.vendorId, kind: 'payout_credited', bookingId: b.id,
        title: 'Earnings added to wallet', body: `${formatINR(b.price.vendorPayout)} for ${b.code} (after ${Math.round(b.price.commissionRate * 100)}% commission).`,
        channels: ['push'],
      }));
    }
    return out;
  },
  paymentFailed(db: Database, b: Booking, reason: string): AppNotification[] {
    return [makeNotification({
      audience: 'admin', recipientId: 'admin', kind: 'payment_failed', bookingId: b.id,
      title: 'Payment failed', body: `${b.code}: ${reason}.`, channels: ['in_app'],
    })];
  },
  cancelled(db: Database, b: Booking, by: string): AppNotification[] {
    const out = [makeNotification({
      audience: 'customer', recipientId: b.customerId, kind: 'booking_cancelled', bookingId: b.id,
      title: 'Booking cancelled', body: `Booking ${b.code} was cancelled${by === 'customer' ? '' : ' by Profecian support'}.`,
      channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
    })];
    if (b.vendorId) out.push(makeNotification({ audience: 'vendor', recipientId: b.vendorId, kind: 'booking_cancelled', bookingId: b.id, title: 'Job cancelled', body: `Booking ${b.code} was cancelled.`, channels: ['push'] }));
    return out;
  },
  rescheduled(db: Database, b: Booking): AppNotification[] {
    const out = [makeNotification({
      audience: 'customer', recipientId: b.customerId, kind: 'booking_rescheduled', bookingId: b.id,
      title: 'Booking rescheduled', body: `${b.code} is now on ${formatDate(b.date)}, ${b.slot}.`, channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
    })];
    if (b.vendorId) out.push(makeNotification({ audience: 'vendor', recipientId: b.vendorId, kind: 'booking_rescheduled', bookingId: b.id, title: 'Job rescheduled', body: `${b.code} moved to ${formatDate(b.date)}, ${b.slot}.`, channels: ['push'] }));
    return out;
  },
  /** A professional gave the job back: the admin must reassign, and the customer is told straight away. */
  jobReleased(db: Database, b: Booking, r: JobRelease): AppNotification[] {
    const { service } = names(db, b);
    return [
      makeNotification({
        audience: 'admin', recipientId: 'admin', kind: 'job_released', bookingId: b.id,
        title: r.late ? 'Urgent: job released close to the slot' : 'Job released',
        body: `${b.code} · ${service} in ${b.address.city}, ${formatDate(b.date)} ${b.slot} — ${r.vendorName} can’t make it (${RELEASE_REASON_LABEL[r.reason]}). Needs a new professional.`,
        channels: ['in_app'],
      }),
      makeNotification({
        audience: 'customer', recipientId: b.customerId, kind: 'professional_released', bookingId: b.id,
        title: 'Finding another professional',
        body: `Your professional can’t make it for booking ${b.code}. We’re assigning another one — your slot on ${formatDate(b.date)}, ${b.slot} stays the same.`,
        channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
      }),
    ];
  },
  /** A professional reported a problem on site: the admin decides. */
  issueReported(db: Database, b: Booking, i: JobIssue): AppNotification[] {
    return [makeNotification({
      audience: 'admin', recipientId: 'admin', kind: 'job_issue', bookingId: b.id,
      title: `${JOB_ISSUE_LABEL[i.kind]} — ${b.code}`, body: `${issueNote(i)}. Decide what happens next.`, channels: ['in_app'],
    })];
  },
  jobReminder(db: Database, b: Booking): AppNotification[] {
    if (!b.vendorId) return [];
    const { service } = names(db, b);
    return [makeNotification({
      audience: 'vendor', recipientId: b.vendorId, kind: 'job_reminder', bookingId: b.id,
      title: 'Upcoming job reminder', body: `${service} for ${b.customerName} at ${b.slot} today.`, channels: ['push'],
    })];
  },
  payoutSettled(vendorId: string, amount: number, utr: string): AppNotification[] {
    return [makeNotification({
      audience: 'vendor', recipientId: vendorId, kind: 'payout_credited',
      title: 'Payout credited', body: `${formatINR(amount)} sent to your bank account. UTR ${utr}.`, channels: ['push', 'sms'],
    })];
  },
  vendorSubmitted(v: Vendor): AppNotification[] {
    return [makeNotification({
      audience: 'admin', recipientId: 'admin', kind: 'vendor_pending_approval',
      title: 'Vendor pending approval', body: `${v.name} (${v.city}) submitted KYC documents for review.`, channels: ['in_app'],
    })];
  },
  quoteShared(db: Database, b: Booking): AppNotification[] {
    const { service } = names(db, b);
    const amount = b.inspection?.quote?.amount ?? 0;
    const extra = b.inspection?.kind === 'extra_work';
    return [
      makeNotification({
        audience: 'customer', recipientId: b.customerId, kind: 'quote_shared', bookingId: b.id,
        title: extra ? 'Quote for extra work' : 'Repair quote ready',
        body: extra
          ? `${service} (${b.code}): your professional found more work — ${formatINR(amount)} + GST on top of your booking. Approve or decline in the app.`
          : `${service} (${b.code}): ${formatINR(amount)} + GST. Approve or decline in the app before any work starts.`,
        channels: ['whatsapp', 'push'], whatsappTo: b.customerPhone,
      }),
      makeNotification({
        audience: 'admin', recipientId: 'admin', kind: 'quote_shared', bookingId: b.id,
        title: extra ? 'Extra-work quote shared' : 'Quote shared', body: `${b.code}: ${formatINR(amount)} + GST, awaiting customer.`, channels: ['in_app'],
      }),
    ];
  },

  quoteResponse(db: Database, b: Booking, approved: boolean): AppNotification[] {
    const verdict = approved ? 'approved' : 'declined';
    const extra = b.inspection?.kind === 'extra_work';
    const out: AppNotification[] = [makeNotification({
      audience: 'admin', recipientId: 'admin', kind: 'quote_response', bookingId: b.id,
      title: `Quote ${verdict}`, body: `${b.code}: customer ${verdict} the ${extra ? 'extra-work' : 'repair'} quote.`, channels: ['in_app'],
    })];
    if (b.vendorId) {
      out.push(makeNotification({
        audience: 'vendor', recipientId: b.vendorId, kind: 'quote_response', bookingId: b.id,
        title: `Quote ${verdict}`,
        body: extra
          ? approved ? `${b.code}: go ahead with the extra work too.` : `${b.code}: complete the booked work only, or share a revised quote.`
          : approved ? `${b.code}: go ahead with the repair.` : `${b.code}: complete the visit for the inspection fee, or share a revised quote.`,
        channels: ['push'],
      }));
    }
    return out;
  },

  complaint(b: Booking, subject: string): AppNotification[] {
    return [makeNotification({
      audience: 'admin', recipientId: 'admin', kind: 'new_complaint', bookingId: b.id,
      title: 'New complaint', body: `${b.code}: ${subject}`, channels: ['in_app'],
    })];
  },
};
