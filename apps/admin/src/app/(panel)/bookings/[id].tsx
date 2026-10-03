import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import {
  BOOKING_STATUS, bookingProblemNames, formatDate, formatDateTime, formatINR, formatPhone, mapsUrl, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, PRICING_MODEL_LABEL,
  useAction, useBackend, type BookingStatus,
} from '@profecian/shared';
import {
  AppText, Badge, Banner, Button, ChipGroup, ComposeSheet, confirmAction, Divider, EmptyState, InspectionPanel, KeyValue, promptText, spacing, Timeline,
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
  const [asking, setAsking] = useState(false);

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
      {b.inspection ? (
        <InspectionPanel
          booking={b}
          categoryName={cat?.name}
          audience="admin"
          actions={closed ? null : (
            <>
              <Button label={b.inspection.awaitingCustomer ? 'Ask another question' : 'Ask customer'} icon="chatbubble-ellipses-outline" size="sm" variant="secondary" onPress={() => setAsking(true)} />
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
            <KeyValue label="Pricing model" value={b.inspection ? 'Inspection fee, then approved quote' : prob ? PRICING_MODEL_LABEL[prob.pricingModel] : '—'} />
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

          <Panel title="Timeline">
            <Timeline events={b.timeline} />
          </Panel>

          {b.proofPhotos.length ? (
            <Panel title="Proof photos">
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {b.proofPhotos.map((u) => <Image key={u} source={u} style={{ width: 96, height: 96, borderRadius: 10 }} contentFit="cover" />)}
              </View>
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
      <ComposeSheet
        visible={asking}
        onClose={() => setAsking(false)}
        title="Ask the customer"
        label="Question"
        placeholder="e.g. Is the wall inside or outside the house?"
        hint="Sent by WhatsApp and shown on their booking. Use this when details are missing before assigning or quoting."
        submitLabel="Send question"
        minLength={5}
        onSubmit={(text) => backend.admin.askCustomer(b.id, text)}
      />
    </Page>
  );
}
