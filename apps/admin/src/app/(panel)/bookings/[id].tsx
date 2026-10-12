import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import {
  afterPhotosOf, awaitingAfterRelease, BOOKING_STATUS, isNotSure, bookingProblemNames, CANT_COMPLETE_REASON_LABEL, isSlotAvailable, JOB_ISSUE_LABEL, RELEASE_REASON_LABEL, formatDate, formatDateTime, formatINR, formatPhone, mapsUrl, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, PRICING_MODEL_LABEL,
  useAction, useBackend, type BookingStatus,
} from '@profecian/shared';
import {
  AppText, Badge, Banner, Button, ChipGroup, colors, confirmAction, DateSlotPicker, Divider, EmptyState, InspectionPanel, KeyValue, promptText, Sheet, spacing, Timeline,
} from '@profecian/ui';
import { Cell, Page, Panel, Row } from '@/components/admin';
import { useLookups } from '@/components/lookups';
import { VendorPicker } from '@/components/VendorPicker';

const STATUS_OPTIONS: BookingStatus[] = ['pending_assignment', 'assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed'];

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, category, problem, vendor, customer } = useLookups();
  const backend = useBackend();
  const b = db.bookings.find((x) => x.id === id);
  const [nextStatus, setNextStatus] = useState<BookingStatus | undefined>();
  const setStatus = useAction(backend.admin.setBookingStatus);
  const quote = useAction(backend.admin.respondToQuote);
  // Deciding an on-site report: mark it handled, or arrange a return visit.
  const resolve = useAction(backend.admin.resolveIssue);
  const returnVisit = useAction(backend.admin.scheduleReturnVisit);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState<string>();
  const [visitSlot, setVisitSlot] = useState<string>();

  if (!b) {
    return (
      <Page title="Booking">
        <EmptyState icon="search-outline" title="Booking not found" message="It may have been removed." actionLabel="All bookings" onAction={() => router.replace('/bookings')} />
      </Page>
    );
  }

  const cat = category.get(b.categoryId);
  const prob = b.problemTypeId ? problem.get(b.problemTypeId) : undefined;
  const ven = b.vendorId ? vendor.get(b.vendorId) : undefined;
  const cus = customer.get(b.customerId);
  const closed = b.status === 'completed' || b.status === 'cancelled';
  const review = b.reviewId ? db.reviews.find((r) => r.id === b.reviewId) : undefined;

  /** Support records the customer's answer to a quote (e.g. confirmed on a call). */
  const recordQuote = async (approve: boolean) => {
    const note = await promptText(approve ? 'Approve quote for customer' : 'Decline quote for customer', 'How did the customer confirm? This is shown on the booking timeline.', 'Confirmed by phone');
    if (note == null) return;
    await quote.run(b.id, approve, note);
  };

  const markHandled = async () => {
    const note = await promptText('Mark as handled', 'What was decided? e.g. “Customer is home now”, “Revised price agreed by phone”. The job carries on with the same professional.', '');
    if (note == null) return;
    await resolve.run(b.id, note);
  };

  const visitReady = !!visitDate && !!visitSlot && isSlotAvailable(visitDate, visitSlot, 0);
  const arrangeVisit = async () => {
    if (!visitDate || !visitSlot) return;
    if (await returnVisit.run(b.id, visitDate, visitSlot)) setVisitOpen(false);
  };

  const cancel = async () => {
    const reason = await promptText('Cancel booking', `Reason for cancelling ${b.code}? The customer and vendor are notified.`, 'Cancelled by support');
    if (reason == null) return;
    await setStatus.run(b.id, 'cancelled', reason || 'Cancelled by support');
  };

  return (
    <Page
      title={`Booking ${b.code}`}
      subtitle={`Placed ${formatDateTime(b.createdAt)} · ${cat?.name} in ${b.address.city}`}
      permission="bookings"
      actions={
        <>
          <Badge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />
          {!closed ? <Button label="Cancel booking" size="sm" variant="danger" icon="close-circle-outline" onPress={cancel} loading={setStatus.pending} /> : null}
        </>
      }
    >
      {setStatus.error ? <Banner tone="danger" icon="alert-circle" title={setStatus.error} /> : null}
      {quote.error ? <Banner tone="danger" icon="alert-circle" title={quote.error} /> : null}
      {resolve.error ? <Banner tone="danger" icon="alert-circle" title={resolve.error} /> : null}
      {awaitingAfterRelease(b) ? (
        <Banner
          tone={b.urgent ? 'danger' : 'warning'}
          icon={b.urgent ? 'flame-outline' : 'swap-horizontal-outline'}
          title={b.urgent ? 'Urgent — released close to the slot' : 'Released by the professional'}
          message={`${b.releases?.[b.releases.length - 1]?.vendorName ?? 'The professional'} gave this job back. The customer has been told we’re finding another professional — assign one below.`}
        />
      ) : null}
      {b.issue && !closed ? (
        <Panel title={`${JOB_ISSUE_LABEL[b.issue.kind]} — needs a decision`}>
          <AppText variant="bodyMedium">
            {b.issue.vendorName} reported this {b.status === 'in_progress' ? 'during the service' : 'at the door'} on {formatDateTime(b.issue.at)}
            {b.issue.reason ? ` · ${CANT_COMPLETE_REASON_LABEL[b.issue.reason]}` : ''}
          </AppText>
          {b.issue.note ? <AppText variant="small" color={colors.text}>“{b.issue.note}”</AppText> : null}
          <AppText variant="small">
            {b.issue.kind === 'cant_complete'
              ? 'Decide with the customer: a return visit, a revised price, another professional, or cancel. The job stays with the professional until you do.'
              : 'Decide with the customer: reschedule, send another professional, or cancel. The job stays with the professional until you do.'}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button label="Arrange return visit" size="sm" icon="calendar-outline" onPress={() => { returnVisit.setError(null); setVisitOpen(true); }} />
            <Button label="Mark as handled" size="sm" variant="secondary" icon="checkmark-circle-outline" loading={resolve.pending} onPress={markHandled} />
            <Button label="Call professional" size="sm" variant="outline" icon="call-outline" onPress={() => ven && Linking.openURL(`tel:+91${ven.phone}`)} />
            <Button label="Call customer" size="sm" variant="outline" icon="call-outline" onPress={() => Linking.openURL(`tel:+91${b.customerPhone}`)} />
            <Button label="Cancel booking" size="sm" variant="danger" icon="close-circle-outline" onPress={cancel} />
          </View>
          <AppText variant="small">To send someone else, use “Reassign” under Assigned vendor.</AppText>
        </Panel>
      ) : null}
      {b.inspection ? (
        <InspectionPanel
          booking={b}
          categoryName={cat?.name}
          audience="admin"
          actions={closed ? null : (
            <>
              {b.inspection.status === 'quoted' ? (
                <>
                  <Button label="Record approval" icon="checkmark-circle-outline" size="sm" variant="success" loading={quote.pending} onPress={() => recordQuote(true)} />
                  <Button label="Record decline" icon="close-circle-outline" size="sm" variant="outline" loading={quote.pending} onPress={() => recordQuote(false)} />
                </>
              ) : null}
              <Button label="Call customer" icon="call-outline" size="sm" variant="outline" onPress={() => Linking.openURL(`tel:+91${b.customerPhone}`)} />
            </>
          )}
        />
      ) : null}
      <Row min={380}>
        <View style={{ gap: spacing.lg }}>
          <Panel title="Service">
            <KeyValue label="Category" value={cat?.name ?? '—'} />
            <KeyValue label={bookingProblemNames(db, b).length > 1 ? 'Problems' : 'Problem type'} value={bookingProblemNames(db, b).join(', ') || '—'} />
            <KeyValue label="Pricing model" value={isNotSure(b) ? 'Inspection fee, then approved quote' : prob ? PRICING_MODEL_LABEL[prob.pricingModel] : '—'} />
            <KeyValue label="Scheduled" value={`${formatDate(b.date)}, ${b.slot}`} />
            {b.notes ? <KeyValue label="Customer notes" value={b.notes} /> : null}
          </Panel>

          <Panel title="Customer" action={cus ? <Button label="Profile" size="sm" variant="ghost" onPress={() => router.navigate(`/users/${cus.id}`)} /> : null}>
            <Cell title={b.customerName} sub={formatPhone(b.customerPhone)} />
            <AppText variant="bodyMedium">{b.address.line}{b.address.landmark ? ` (near ${b.address.landmark})` : ''}, {b.address.city} {b.address.pincode ?? ''}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button label="Call" size="sm" variant="outline" icon="call-outline" onPress={() => Linking.openURL(`tel:+91${b.customerPhone}`)} />
              <Button label="Map" size="sm" variant="outline" icon="map-outline" onPress={() => Linking.openURL(mapsUrl(b.address))} />
            </View>
          </Panel>

          <Panel title="Payment">
            <KeyValue label="Service amount" value={formatINR(b.price.serviceAmount)} />
            <KeyValue label="GST" value={formatINR(b.price.tax)} />
            <KeyValue label="Customer total" value={formatINR(b.price.total)} strong />
            <Divider />
            <KeyValue label={`Platform commission (${Math.round(b.price.commissionRate * 100)}%)`} value={formatINR(b.price.commission)} tone="primary" />
            <KeyValue label="Vendor payout" value={formatINR(b.price.vendorPayout)} tone="success" />
            <Divider />
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge label={PAYMENT_STATUS[b.payment.status].label} tone={PAYMENT_STATUS[b.payment.status].tone} />
              <AppText variant="small">{b.payment.method ? PAYMENT_METHOD_LABEL[b.payment.method] : 'Method not chosen'}{b.payment.txnId ? ` · ${b.payment.txnId}` : ''}</AppText>
            </View>
            {b.payment.failureReason ? <AppText variant="small">Failure: {b.payment.failureReason}</AppText> : null}
          </Panel>
        </View>

        <View style={{ gap: spacing.lg }}>
          <Panel title={ven ? 'Assigned vendor' : 'Assign a vendor'}>
            {ven ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}><Cell title={ven.name} sub={`${formatPhone(ven.phone)} · ★ ${ven.rating || 'New'} · ${ven.jobsCompleted} jobs`} /></View>
                <Button label="Profile" size="sm" variant="outline" onPress={() => router.navigate(`/vendors/${ven.id}`)} />
              </View>
            ) : (
              <Banner tone="warning" icon="hourglass-outline" title="Waiting for a professional" message="Pick the best match below — nearest, least busy, highest rated first." />
            )}
            {!closed ? <VendorPicker booking={b} /> : null}
          </Panel>

          {!closed ? (
            <Panel title="Change status">
              <AppText variant="small">Override the workflow if the vendor can’t update the app. The customer is notified on completion or cancellation.</AppText>
              {b.status === 'arrived' && b.startCode ? (
                <Banner
                  tone="info"
                  icon="key-outline"
                  title={`Start code ${b.startCode}`}
                  message="The customer reads this to the professional to start the service. Give it only to the customer — if they can’t find it, set the status to In progress here instead."
                />
              ) : null}
              <ChipGroup<BookingStatus>
                value={nextStatus ?? b.status}
                onChange={setNextStatus}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: BOOKING_STATUS[s].label }))}
              />
              <Button
                label="Update status"
                size="sm"
                disabled={!nextStatus || nextStatus === b.status}
                loading={setStatus.pending}
                onPress={async () => {
                  if (!nextStatus) return;
                  if (await confirmAction('Update status', `Set ${b.code} to "${BOOKING_STATUS[nextStatus].label}"?`)) {
                    await setStatus.run(b.id, nextStatus, 'Updated by admin');
                    setNextStatus(undefined);
                  }
                }}
              />
            </Panel>
          ) : null}

          {b.releases?.length ? (
            <Panel title={`Releases (${b.releases.length})`}>
              {b.releases.map((r, i) => (
                <View key={`${r.vendorId}-${r.at}-${i}`} style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                    <AppText variant="label" style={{ flexShrink: 1 }}>{r.vendorName} · {RELEASE_REASON_LABEL[r.reason]}</AppText>
                    <Badge label={r.late ? 'Late release' : 'Early release'} tone={r.late ? 'danger' : 'neutral'} />
                  </View>
                  <AppText variant="small">{formatDateTime(r.at)}{r.note ? ` · “${r.note}”` : ''}</AppText>
                </View>
              ))}
              <AppText variant="small">Only late releases (2 hours or less before the slot, or once on the way) count against a professional’s completion rate.</AppText>
            </Panel>
          ) : null}

          <Panel title="Timeline">
            <Timeline events={b.timeline} />
          </Panel>

          {b.proofPhotos.length || afterPhotosOf(b).length ? (
            <Panel title="Proof photos">
              {([['Before', b.proofPhotos], ['After', afterPhotosOf(b)]] as const).map(([label, photos]) => (photos.length ? (
                <View key={label} style={{ gap: 6 }}>
                  <AppText variant="small">{label} ({photos.length})</AppText>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {photos.map((u) => <Image key={u} source={u} style={{ width: 96, height: 96, borderRadius: 10 }} contentFit="cover" />)}
                  </View>
                </View>
              ) : null))}
            </Panel>
          ) : null}

          {review ? (
            <Panel title="Customer review">
              <AppText variant="h3">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</AppText>
              <AppText>{review.text || 'No written review.'}</AppText>
            </Panel>
          ) : null}
        </View>
      </Row>
      <Sheet
        visible={visitOpen}
        onClose={() => setVisitOpen(false)}
        title="Arrange a return visit"
        footer={<Button label="Confirm return visit" fullWidth disabled={!visitReady} loading={returnVisit.pending} onPress={arrangeVisit} />}
      >
        {returnVisit.error ? <Banner tone="danger" icon="alert-circle" title={returnVisit.error} /> : null}
        <AppText variant="small">{ven?.name ?? 'The same professional'} comes back at the new time. The booking returns to “Accepted” and the customer and professional are notified.</AppText>
        <DateSlotPicker date={visitDate} slot={visitSlot} onDate={setVisitDate} onSlot={setVisitSlot} />
      </Sheet>
    </Page>
  );
}
