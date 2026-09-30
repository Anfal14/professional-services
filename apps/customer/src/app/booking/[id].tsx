import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import {
  bookingProblemLabel, bookingProblemNames, BOOKING_STATUS, canCustomerModify, isSlotAvailable, formatDate, formatDateTime, formatINR, formatPhone, ONLINE_METHODS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS,
  suggestVendors, TRACKING_STEPS, useAction, useBackend, useDb, VENDOR_NEXT, type Booking, type PaymentMethod,
} from '@profecian/shared';
import {
  asIcon, Banner, hasOpenSlots, Button as UiButton, Card, ChipGroup, DateSlotPicker, Divider, KeyValue, PhotoPicker, Sheet, StarInput, Stars, TextField, Timeline, Toggle,
} from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { useCustomer } from '@/backend';
import { useCatalog } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, spacing, createStyles } from '@/theme';
import { APP_CONFIG } from '@/config';

const STEP_LABEL: Record<string, string> = {
  pending_assignment: 'Booked',
  assigned: 'Pro assigned',
  accepted: 'Confirmed',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Done',
};

const CANCEL_REASONS = ['Plans changed', 'Booked by mistake', 'Found another professional', 'Price too high', 'Other'];

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useCustomer();
  const db = useDb();
  const { isDesktop, isMobile } = useResponsive();
  const { getService } = useCatalog();
  const booking = db.bookings.find((b) => b.id === id && b.customerId === customer?.id);
  const [sheet, setSheet] = useState<'pay' | 'reschedule' | 'cancel' | 'complaint' | null>(null);

  if (!customer) return <Redirect href={{ pathname: '/login', params: { next: `/booking/${id}` } }} />;
  if (!booking) {
    return (
      <Screen back title="Booking" pageTitle="Booking">
        <EmptyState icon="receipt-outline" title="Booking not found" message="It may belong to another account." actionLabel="My Bookings" onAction={() => router.replace('/bookings')} />
      </Screen>
    );
  }

  const service = getService(booking.categoryId);
  const problemLabel = bookingProblemLabel(db, booking);
  const vendor = booking.vendorId ? db.vendors.find((v) => v.id === booking.vendorId) : undefined;
  const review = booking.reviewId ? db.reviews.find((r) => r.id === booking.reviewId) : undefined;
  const cancelled = booking.status === 'cancelled';
  const modifiable = canCustomerModify(booking.status);
  const unpaid = !cancelled && booking.payment.status !== 'paid';

  const left = (
    <View style={{ gap: spacing.lg }}>
      <LiveStatus booking={booking} />
      {vendor && !cancelled ? (
        <Card style={{ gap: spacing.md }}>
          <AppText variant="h3">Your professional</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.avatar}><Ionicons name="person" size={24} color={colors.primary} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{vendor.name}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {vendor.ratingCount ? <Stars value={vendor.rating} size={12} count={vendor.ratingCount} /> : <AppText variant="small">New professional</AppText>}
              </View>
              <AppText variant="tiny" color={colors.success}>✓ ID & background verified · {vendor.jobsCompleted} jobs done</AppText>
            </View>
            {booking.status !== 'completed' ? <UiButton label="Call" size="sm" variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:+91${vendor.phone}`)} /> : null}
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Schedule & address</AppText>
        <Line icon="calendar-outline" text={`${formatDate(booking.date)}, ${booking.slot}`} />
        <Line icon="location-outline" text={`${booking.address.line}${booking.address.landmark ? ` (near ${booking.address.landmark})` : ''}, ${booking.address.city}`} />
        <Line icon="call-outline" text={`${booking.customerName} · ${formatPhone(booking.customerPhone)}`} />
        {booking.notes ? <Line icon="chatbox-ellipses-outline" text={booking.notes} /> : null}
        {modifiable ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <UiButton label="Reschedule" size="sm" variant="secondary" icon="calendar-outline" onPress={() => setSheet('reschedule')} />
            <UiButton label="Cancel booking" size="sm" variant="danger" icon="close-circle-outline" onPress={() => setSheet('cancel')} />
          </View>
        ) : !cancelled && booking.status !== 'completed' ? (
          <AppText variant="small">Your professional is on the way, so changes need a call to support.</AppText>
        ) : null}
        {cancelled ? <Banner tone="danger" icon="close-circle" title="Booking cancelled" message={booking.cancelReason} /> : null}
      </Card>
    </View>
  );

  const right = (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ gap: 4 }}>
        <AppText variant="h3" style={{ marginBottom: 6 }}>Payment</AppText>
        {bookingProblemNames(db, booking).map((name) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.muted} />
            <AppText variant="bodyMedium">{name}</AppText>
          </View>
        ))}
        <Divider style={{ marginVertical: 6 }} />
        <KeyValue label="Total (Inc. GST)" value={formatINR(booking.price.total)} strong />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <AppText variant="small">{cancelled ? 'Not charged' : `${PAYMENT_STATUS[booking.payment.status].label}${booking.payment.method ? ` · ${PAYMENT_METHOD_LABEL[booking.payment.method]}` : ''}`}</AppText>
        </View>
        {booking.payment.status === 'failed' ? <Banner tone="danger" icon="alert-circle" title="Payment failed" message={booking.payment.failureReason ?? 'Please try again or choose another method.'} /> : null}
        {unpaid && booking.payment.method === 'cash' && booking.payment.status !== 'failed' ? (
          <AppText variant="small" style={{ marginTop: 6 }}>You’ll pay {formatINR(booking.price.total)} in cash to your professional after the service.</AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {unpaid ? <UiButton label={booking.status === 'completed' ? `Pay ${formatINR(booking.price.total)}` : 'Pay now / choose method'} size="sm" icon="card-outline" onPress={() => setSheet('pay')} /> : null}
          {booking.payment.status === 'paid' ? <UiButton label="View invoice" size="sm" variant="secondary" icon="receipt-outline" onPress={() => router.push(`/invoice/${booking.id}`)} /> : null}
        </View>
      </Card>

      {booking.status === 'completed' && vendor ? review ? (
        <Card style={{ gap: 6 }}>
          <AppText variant="h3">Your review</AppText>
          <Stars value={review.rating} size={18} />
          <AppText>{review.text || 'No written review.'}</AppText>
          {review.images.length ? <View style={{ flexDirection: 'row', gap: 8 }}>{review.images.map((u) => <Image key={u} source={u} style={styles.thumb} />)}</View> : null}
          <AppText variant="tiny">Posted {formatDateTime(review.createdAt)}{review.status !== 'published' ? ' · under moderation' : ''}</AppText>
        </Card>
      ) : (
        <ReviewCard booking={booking} vendorName={vendor.name} />
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Need help?</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <UiButton label={`Call ${APP_CONFIG.supportPhone}`} size="sm" icon="call-outline" onPress={() => Linking.openURL(`tel:${APP_CONFIG.supportPhone.replace(/s/g, '')}`)} />
          {!cancelled ? <UiButton label="Report an issue" size="sm" variant="outline" icon="flag-outline" onPress={() => setSheet('complaint')} /> : null}
        </View>
        {db.complaints.filter((c) => c.bookingId === booking.id).map((c) => (
          <Banner key={c.id} tone={c.status === 'resolved' ? 'success' : 'warning'} icon="chatbubbles-outline" title={`${c.subject} — ${c.status.replace('_', ' ')}`} message={c.resolution ?? 'Our support team will get back to you shortly.'} />
        ))}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Activity</AppText>
        <Timeline events={booking.timeline} />
      </Card>
    </View>
  );

  return (
    <Screen back title={service?.name ?? 'Booking'} pageTitle={`Booking ${booking.code}`} bottomNav={false}>
      <Container style={styles.page}>
        <View style={styles.head}>
          {service ? <Image source={service.image} style={[styles.headImg, isMobile && { width: 56, height: 56 }]} contentFit="cover" /> : null}
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <AppText variant={isMobile ? 'h2' : 'h1'} numberOfLines={2}>{service?.name}</AppText>
            <AppText variant="body" color={colors.muted}>{problemLabel} · #{booking.code}</AppText>
            {isMobile ? <StatusBadge status={booking.status} /> : null}
          </View>
          {!isMobile ? <StatusBadge status={booking.status} /> : null}
        </View>
        {isDesktop ? (
          <View style={{ flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' }}>
            <View style={{ flex: 1.2 }}>{left}</View>
            <View style={{ flex: 1 }}>{right}</View>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>{left}{right}</View>
        )}
      </Container>
      {sheet === 'pay' ? <PaySheet booking={booking} onClose={() => setSheet(null)} /> : null}
      {sheet === 'reschedule' ? <RescheduleSheet booking={booking} onClose={() => setSheet(null)} /> : null}
      {sheet === 'cancel' ? <CancelSheet booking={booking} onClose={() => setSheet(null)} /> : null}
      {sheet === 'complaint' ? <ComplaintSheet booking={booking} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

function Line({ icon, text }: { icon: 'calendar-outline' | 'location-outline' | 'call-outline' | 'chatbox-ellipses-outline'; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={17} color={colors.primary} style={{ marginTop: 2 }} />
      <AppText variant="bodyMedium" style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

/* ───────────── Live status ───────────── */

function LiveStatus({ booking }: { booking: Booking }) {
  const backend = useBackend();
  const { width } = useResponsive();
  // Seven labels don't fit on narrow phones — show bars plus a "step x of y" caption instead.
  const compact = width < 520;
  const db = useDb();
  const [simulating, setSimulating] = useState(false);
  const cancelled = booking.status === 'cancelled';
  const idx = TRACKING_STEPS.indexOf(booking.status);
  const meta = BOOKING_STATUS[booking.status];
  const headline: Record<string, string> = {
    pending_assignment: 'Finding the best professional near you',
    assigned: 'A professional has been assigned',
    accepted: 'Your professional confirmed the visit',
    on_the_way: 'Your professional is on the way',
    arrived: 'Your professional has arrived',
    in_progress: 'Service in progress',
    completed: 'Service completed',
    cancelled: 'This booking was cancelled',
  };

  /** Demo only: plays the admin + vendor side so the tracking flow can be seen in one app. */
  const simulate = async () => {
    setSimulating(true);
    try {
      if (booking.status === 'pending_assignment') {
        const best = suggestVendors(db, booking).find((s) => s.matchesService && s.available) ?? suggestVendors(db, booking)[0];
        if (best) await backend.admin.assignVendor(booking.id, best.vendor.id);
      } else if (booking.vendorId && VENDOR_NEXT[booking.status]) {
        await backend.vendor.advanceJob(booking.vendorId, booking.id);
      }
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={[styles.liveIcon, { backgroundColor: cancelled ? colors.dangerSoft : colors.primarySoft }]}>
          <Ionicons name={asIcon(meta.icon)} size={22} color={cancelled ? colors.danger : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{headline[booking.status]}</AppText>
          <AppText variant="small">Updated {formatDateTime(booking.timeline[booking.timeline.length - 1].at)}</AppText>
        </View>
        {!cancelled && booking.status !== 'completed' ? <View style={styles.liveDot} accessibilityLabel="Live" /> : null}
      </View>
      {!cancelled ? (
        <View style={styles.steps}>
          {TRACKING_STEPS.map((s, i) => {
            const done = i <= idx;
            return (
              <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={[styles.stepBar, { backgroundColor: done ? colors.primary : colors.border }]} />
                {!compact ? <AppText style={[styles.stepLabel, done && { color: colors.ink }]} numberOfLines={2}>{STEP_LABEL[s]}</AppText> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {!cancelled && compact ? (
        <AppText variant="small">Step {idx + 1} of {TRACKING_STEPS.length} · {STEP_LABEL[booking.status]}</AppText>
      ) : null}
      {!cancelled && booking.status !== 'completed' ? (
        <View style={{ gap: 4 }}>
          <UiButton label={simulating ? 'Updating…' : 'Simulate next update'} size="sm" variant="ghost" icon="flask-outline" loading={simulating} onPress={simulate} />
          <AppText variant="tiny">Demo only — in production this updates live as the admin assigns a professional and they progress through the job.</AppText>
        </View>
      ) : null}
    </Card>
  );
}

/* ───────────── Review ───────────── */

function ReviewCard({ booking, vendorName }: { booking: Booking; vendorName: string }) {
  const backend = useBackend();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const submit = useAction(backend.customer.submitReview);
  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={{ gap: 2 }}>
        <AppText variant="h3">Rate {vendorName.split(' ')[0]}</AppText>
        <AppText variant="small">Your feedback helps us keep quality high.</AppText>
      </View>
      <StarInput value={rating} onChange={setRating} />
      <TextField label="Write a review" optional multiline placeholder="What went well? What could be better?" value={text} onChangeText={setText} maxLength={500} />
      <PhotoPicker label="Add photos" value={images} onChange={setImages} max={3} />
      {submit.error ? <Banner tone="danger" icon="alert-circle" title={submit.error} /> : null}
      <UiButton label="Submit review" fullWidth disabled={!rating} loading={submit.pending} onPress={() => submit.run({ bookingId: booking.id, rating, text, images })} />
    </Card>
  );
}

/* ───────────── Sheets ───────────── */

function PaySheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const backend = useBackend();
  const [method, setMethod] = useState<PaymentMethod>(booking.payment.method && booking.payment.method !== 'cash' ? booking.payment.method : 'upi');
  const [fail, setFail] = useState(false);
  const [done, setDone] = useState(false);
  const pay = useAction(backend.customer.payOnline);
  const cash = useAction(backend.customer.chooseCash);
  const completed = booking.status === 'completed';

  const submit = async () => {
    if (method === 'cash') {
      if (await cash.run(booking.id)) onClose();
      return;
    }
    const res = await pay.run(booking.id, method as Exclude<PaymentMethod, 'cash'>, { simulateFailure: fail });
    if (res) setDone(true);
  };

  return (
    <Sheet visible onClose={onClose} title={done ? 'Payment successful' : `Pay ${formatINR(booking.price.total)}`}
      footer={done ? <UiButton label="View invoice" fullWidth icon="receipt-outline" onPress={() => { onClose(); router.push(`/invoice/${booking.id}`); }} />
        : <UiButton label={method === 'cash' ? 'Pay in cash after service' : `Pay ${formatINR(booking.price.total)}`} fullWidth loading={pay.pending || cash.pending} onPress={submit} />}>
      {done ? (
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <AppText variant="h3" align="center">{formatINR(booking.price.total)} paid</AppText>
          <AppText variant="small" align="center">Receipt sent on WhatsApp. Transaction {booking.payment.txnId ?? '—'}.</AppText>
        </View>
      ) : (
        <>
          {pay.error ? <Banner tone="danger" icon="alert-circle" title="Payment failed" message={`${pay.error}. Try again or pick another method.`} /> : null}
          <View style={{ gap: spacing.sm }}>
            {ONLINE_METHODS.map((m) => (
              <MethodRow key={m.method} icon={m.icon} title={m.label} hint={m.hint} selected={method === m.method} onPress={() => setMethod(m.method)} />
            ))}
            {!completed || booking.payment.method === 'cash' ? (
              <MethodRow icon="cash-outline" title="Cash after service" hint="Pay your professional when the job is done" selected={method === 'cash'} onPress={() => setMethod('cash')} />
            ) : null}
          </View>
          {method !== 'cash' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Toggle label="Simulate a failed payment" value={fail} onChange={setFail} />
              <AppText variant="small" style={{ flex: 1 }}>Sandbox: simulate a declined payment</AppText>
            </View>
          ) : null}
          <AppText variant="tiny">Payments are processed in sandbox mode until a gateway (e.g. Razorpay) is connected.</AppText>
        </>
      )}
    </Sheet>
  );
}

function MethodRow({ icon, title, hint, selected, onPress }: { icon: string; title: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }, selected && { borderColor: colors.primary, backgroundColor: colors.selectedBg }]}>
      <Ionicons name={asIcon(icon)} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="small">{hint}</AppText>
      </View>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.borderStrong} />
    </Card>
  );
}

function RescheduleSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const backend = useBackend();
  // Start from the current visit so the last selection is kept (if it is still bookable).
  const [date, setDate] = useState<string | undefined>(() => (hasOpenSlots(booking.date) ? booking.date : undefined));
  const [slot, setSlot] = useState<string | undefined>(() => (isSlotAvailable(booking.date, booking.slot) ? booking.slot : undefined));
  const save = useAction(backend.customer.rescheduleBooking);
  const unchanged = date === booking.date && slot === booking.slot;
  return (
    <Sheet visible onClose={onClose} title="Reschedule visit" width={640}
      footer={<UiButton label="Confirm new time" fullWidth disabled={!date || !slot || unchanged} loading={save.pending} onPress={async () => { if (date && slot && (await save.run(booking.id, date, slot))) onClose(); }} />}>
      <AppText variant="small">Currently {formatDate(booking.date)}, {booking.slot}. Your professional will be informed.</AppText>
      {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : null}
      <DateSlotPicker date={date} slot={slot} onDate={setDate} onSlot={setSlot} />
    </Sheet>
  );
}

function CancelSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const backend = useBackend();
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const cancel = useAction(backend.customer.cancelBooking);
  return (
    <Sheet visible onClose={onClose} title="Cancel booking?"
      footer={<UiButton label="Cancel booking" variant="danger" fullWidth loading={cancel.pending} onPress={async () => { if (await cancel.run(booking.id, reason)) onClose(); }} />}>
      <AppText variant="small">Free cancellation until your professional is on the way. Tell us why:</AppText>
      <ChipGroup value={reason} onChange={setReason} options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))} />
      {cancel.error ? <Banner tone="danger" icon="alert-circle" title={cancel.error} /> : null}
    </Sheet>
  );
}

function ComplaintSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const backend = useBackend();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const raise = useAction(backend.customer.raiseComplaint);
  const submit = async () => {
    if (subject.trim().length < 4 || message.trim().length < 10) return raise.setError('Add a short subject and describe the issue (10+ characters)');
    if (await raise.run({ bookingId: booking.id, subject, message })) onClose();
  };
  return (
    <Sheet visible onClose={onClose} title="Report an issue" footer={<UiButton label="Send to support" fullWidth loading={raise.pending} onPress={submit} />}>
      {raise.error ? <Banner tone="danger" icon="alert-circle" title={raise.error} /> : null}
      <TextField label="Subject" required placeholder="e.g. Issue came back after the visit" value={subject} onChangeText={setSubject} maxLength={80} />
      <TextField label="What happened?" required multiline value={message} onChangeText={setMessage} maxLength={600} />
    </Sheet>
  );
}

const styles = createStyles(() => ({
  page: { paddingTop: spacing.xxl, gap: spacing.xl, maxWidth: 1100 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  headImg: { width: 72, height: 72, borderRadius: radius.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
  liveIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  steps: { flexDirection: 'row', gap: 4 },
  stepBar: { height: 6, alignSelf: 'stretch', borderRadius: 3 },
  stepLabel: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.subtle, textAlign: 'center' },
}));

