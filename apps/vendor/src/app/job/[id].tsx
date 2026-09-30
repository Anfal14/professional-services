import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import {
  BOOKING_STATUS, bookingProblemLabel, formatDate, formatINR, formatPhone, mapsUrl, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, TRACKING_STEPS, useAction, useBackend, useDb,
  VENDOR_ACTION_LABEL, VENDOR_NEXT,
} from '@profecian/shared';
import {
  AppText, asIcon, Badge, Banner, Button, Card, colors, confirmAction, Divider, EmptyState, KeyValue, PhotoPicker, promptText, radius, spacing, Timeline, tintTile } from '@profecian/ui';
import { useVendor } from '@/backend';
import { VendorScreen } from '@/components/VendorScreen';

const ACTION_ICON = { assigned: 'checkmark-circle-outline', accepted: 'navigate-outline', on_the_way: 'location-outline', arrived: 'construct-outline', in_progress: 'checkmark-done-outline' } as const;

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendor = useVendor();
  const db = useDb();
  const backend = useBackend();
  const advance = useAction(backend.vendor.advanceJob);
  const decline = useAction(backend.vendor.declineJob);
  const cash = useAction(backend.vendor.collectCash);
  const job = db.bookings.find((b) => b.id === id && b.vendorId === vendor?.id);

  if (!vendor || !job) {
    return (
      <VendorScreen title="Job" back>
        <EmptyState icon="briefcase-outline" title="Job not available" message="It may have been reassigned or cancelled." actionLabel="My jobs" onAction={() => router.replace('/jobs')} />
      </VendorScreen>
    );
  }

  const category = db.categories.find((c) => c.id === job.categoryId);
  const problem = db.problemTypes.find((p) => p.id === job.problemTypeId);
  const next = VENDOR_NEXT[job.status];
  const label = VENDOR_ACTION_LABEL[job.status];
  const stepIndex = TRACKING_STEPS.indexOf(job.status);
  const canShowContact = job.status !== 'assigned';
  const error = advance.error ?? decline.error ?? cash.error;

  const onAdvance = async () => {
    if (next === 'completed' && !(await confirmAction('Complete service', 'Confirm the work is finished and checked with the customer?', 'Complete'))) return;
    await advance.run(vendor.id, job.id);
  };

  const onDecline = async () => {
    const reason = await promptText('Decline job', 'Tell us why you can’t take this job:', 'Not available at this time');
    if (reason == null) return;
    if (await decline.run(vendor.id, job.id, reason || 'Not available')) router.replace('/jobs');
  };

  const footer = job.status === 'cancelled' ? null : next && label ? (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {job.status === 'assigned' ? <Button label="Decline" variant="outline" size="lg" onPress={onDecline} loading={decline.pending} /> : null}
      <Button label={label} size="lg" icon={ACTION_ICON[job.status as keyof typeof ACTION_ICON]} fullWidth style={{ flex: 1 }} loading={advance.pending} onPress={onAdvance} variant={next === 'completed' ? 'success' : 'primary'} />
    </View>
  ) : job.status === 'completed' && job.payment.status !== 'paid' ? (
    <Button label={`Collect ${formatINR(job.price.total)} in cash`} size="lg" icon="cash-outline" variant="success" fullWidth loading={cash.pending}
      onPress={async () => { if (await confirmAction('Cash received?', `Confirm you collected ${formatINR(job.price.total)} from ${job.customerName}.`, 'Yes, collected')) await cash.run(vendor.id, job.id); }} />
  ) : null;

  return (
    <VendorScreen title={bookingProblemLabel(db, job) || 'Job'} subtitle={`${category?.name} · ${job.code}`} back footer={footer}>
      {error ? <Banner tone="danger" icon="alert-circle" title={error} /> : null}
      {job.status === 'assigned' ? <Banner tone="warning" icon="flash-outline" title="New job — please accept" message="Customer contact details are shared once you accept." /> : null}
      {job.status === 'cancelled' ? <Banner tone="danger" icon="close-circle" title="This job was cancelled" message={job.cancelReason} /> : null}

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: tintTile(category?.tint).bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={asIcon(problem?.icon ?? 'construct-outline')} size={24} color={tintTile(category?.tint).fg} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3">{formatDate(job.date)}, {job.slot}</AppText>
            <AppText variant="small">Est. {problem?.durationMins ?? 60} min</AppText>
          </View>
          <Badge label={job.status === 'assigned' ? 'New job' : BOOKING_STATUS[job.status].label} tone={job.status === 'assigned' ? 'warning' : BOOKING_STATUS[job.status].tone} />
        </View>
        {stepIndex > 0 ? (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {TRACKING_STEPS.slice(1).map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < stepIndex ? colors.success : colors.border }} />)}
          </View>
        ) : null}
        {job.notes ? <Banner tone="info" icon="chatbox-ellipses-outline" title="Customer note" message={job.notes} /> : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Customer</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">{job.customerName}</AppText>
            <AppText variant="small">{canShowContact ? formatPhone(job.customerPhone) : 'Phone shown after you accept'}</AppText>
          </View>
          {canShowContact ? <Button label="Call" size="sm" variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:+91${job.customerPhone}`)} /> : null}
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
          <Ionicons name="location-outline" size={22} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyMedium">{job.address.line}</AppText>
            <AppText variant="small">{job.address.landmark ? `Near ${job.address.landmark} · ` : ''}{job.address.city} {job.address.pincode ?? ''}</AppText>
          </View>
        </View>
        <Button label="Navigate" icon="navigate" variant="dark" fullWidth onPress={() => Linking.openURL(mapsUrl(job.address))} />
      </Card>

      <Card style={{ gap: 4 }}>
        <AppText variant="h3" style={{ marginBottom: 6 }}>Payment</AppText>
        <KeyValue label="Service amount" value={formatINR(job.price.serviceAmount)} />
        <KeyValue label={`Platform commission (${Math.round(job.price.commissionRate * 100)}%)`} value={`−${formatINR(job.price.commission)}`} />
        <KeyValue label="You earn" value={formatINR(job.price.vendorPayout)} strong tone="success" />
        <AppText variant="small">Customer pays {formatINR(job.price.total)} incl. {formatINR(job.price.tax)} GST.</AppText>
        <Divider style={{ marginVertical: 6 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge label={PAYMENT_STATUS[job.payment.status].label} tone={PAYMENT_STATUS[job.payment.status].tone} />
          <AppText variant="small">{job.payment.method ? PAYMENT_METHOD_LABEL[job.payment.method] : 'Customer will choose online or cash'}</AppText>
        </View>
        {job.payment.method === 'cash' && job.payment.status !== 'paid' ? <AppText variant="small">Collect cash after completing the service, then tap “Collect”.</AppText> : null}
      </Card>

      {['arrived', 'in_progress', 'completed'].includes(job.status) ? (
        <Card style={{ gap: spacing.md }}>
          <AppText variant="h3">Proof of work</AppText>
          <AppText variant="small">Add before/after photos (optional). They help resolve disputes and warranty claims.</AppText>
          <PhotoPicker value={job.proofPhotos} max={6} onChange={(uris) => uris.filter((u) => !job.proofPhotos.includes(u)).forEach((u) => backend.vendor.addProofPhoto(vendor.id, job.id, u))} />
          {job.proofPhotos.length ? <AppText variant="tiny">{job.proofPhotos.length} photo(s) attached</AppText> : null}
        </Card>
      ) : null}

      {job.status === 'completed' && job.reviewId ? (() => {
        const r = db.reviews.find((x) => x.id === job.reviewId);
        return r ? (
          <Card style={{ gap: 6 }}>
            <AppText variant="h3">Customer review</AppText>
            <AppText variant="label" color={colors.warning}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</AppText>
            <AppText>{r.text || 'No written feedback.'}</AppText>
            {r.images.length ? <View style={{ flexDirection: 'row', gap: 8 }}>{r.images.map((u) => <Image key={u} source={u} style={{ width: 64, height: 64, borderRadius: 8 }} />)}</View> : null}
          </Card>
        ) : null;
      })() : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Timeline</AppText>
        <Timeline events={job.timeline} />
      </Card>
    </VendorScreen>
  );
}
