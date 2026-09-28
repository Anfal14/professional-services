import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { COMPLAINT_STATUS, formatDateTime, REVIEW_STATUS, useAction, useBackend, type ComplaintStatus, type ReviewStatus } from '@profecian/shared';
import { AppText, Badge, Banner, Button, colors, EmptyState, promptText, spacing, Stars } from '@profecian/ui';
import { Page, Panel, Tabs } from '@/components/admin';
import { useLookups } from '@/components/lookups';

type Tab = 'flagged' | 'all' | 'complaints';

export default function Reviews() {
  const { db, vendorName, category } = useLookups();
  const backend = useBackend();
  const [tab, setTab] = useState<Tab>('flagged');
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | 'any'>('any');
  const setStatus = useAction(backend.admin.setReviewStatus);
  const updateComplaint = useAction(backend.admin.updateComplaint);

  const flagged = db.reviews.filter((r) => r.status === 'flagged' || r.rating <= 2);
  const list = tab === 'flagged' ? flagged : db.reviews.filter((r) => reviewFilter === 'any' || r.status === reviewFilter);
  const complaints = db.complaints;
  const bookingCode = (id: string) => db.bookings.find((b) => b.id === id)?.code ?? '';

  const resolve = async (id: string, status: ComplaintStatus) => {
    const resolution = status === 'resolved' ? await promptText('Resolve complaint', 'Resolution note (shared with the customer):', 'Issue resolved with the customer') : undefined;
    if (status === 'resolved' && resolution == null) return;
    await updateComplaint.run(id, status, resolution ?? undefined);
  };

  return (
    <Page title="Reviews & complaints" subtitle="Moderate what customers see and resolve service issues." permission="reviews">
      {setStatus.error || updateComplaint.error ? <Banner tone="danger" icon="alert-circle" title={setStatus.error ?? updateComplaint.error ?? ''} /> : null}
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'flagged', label: 'Needs moderation', count: flagged.length },
        { value: 'all', label: 'All reviews', count: db.reviews.length },
        { value: 'complaints', label: 'Complaints', count: complaints.filter((c) => c.status !== 'resolved').length },
      ]} />

      {tab === 'all' ? (
        <Tabs<ReviewStatus | 'any'> value={reviewFilter} onChange={setReviewFilter} tabs={[{ value: 'any', label: 'Any status' }, ...(['published', 'hidden', 'flagged'] as ReviewStatus[]).map((s) => ({ value: s, label: REVIEW_STATUS[s].label }))]} />
      ) : null}

      {tab !== 'complaints' ? (
        list.length === 0 ? <Panel><EmptyState icon="checkmark-done-circle-outline" title="Nothing to moderate" message="Flagged and low-rated reviews show up here." /></Panel> : (
          <View style={{ gap: spacing.md }}>
            {list.slice(0, 40).map((r) => (
              <Panel key={r.id}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
                  <Stars value={r.rating} />
                  <AppText variant="label">{r.customerName}</AppText>
                  <AppText variant="small">→ {vendorName(r.vendorId)} · {category.get(r.categoryId)?.name} · {formatDateTime(r.createdAt)}</AppText>
                  <View style={{ flex: 1 }} />
                  <Badge label={REVIEW_STATUS[r.status].label} tone={REVIEW_STATUS[r.status].tone} />
                </View>
                <AppText color={colors.text}>{r.text || <AppText variant="small">No written review.</AppText>}</AppText>
                {r.images.length ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>{r.images.map((u) => <Image key={u} source={u} style={{ width: 72, height: 72, borderRadius: 8 }} contentFit="cover" />)}</View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button label="Publish" size="sm" variant="secondary" icon="eye-outline" disabled={r.status === 'published'} onPress={() => setStatus.run(r.id, 'published')} />
                  <Button label="Hide" size="sm" variant="outline" icon="eye-off-outline" disabled={r.status === 'hidden'} onPress={() => setStatus.run(r.id, 'hidden')} />
                  <Button label="Flag" size="sm" variant="danger" icon="flag-outline" disabled={r.status === 'flagged'} onPress={() => setStatus.run(r.id, 'flagged')} />
                  <Button label="Booking" size="sm" variant="ghost" onPress={() => router.navigate(`/bookings/${r.bookingId}`)} />
                </View>
              </Panel>
            ))}
          </View>
        )
      ) : (
        <View style={{ gap: spacing.md }}>
          {complaints.map((c) => (
            <Panel key={c.id}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
                <AppText variant="h3" style={{ flex: 1 }}>{c.subject}</AppText>
                <Badge label={COMPLAINT_STATUS[c.status].label} tone={COMPLAINT_STATUS[c.status].tone} />
              </View>
              <AppText variant="small">{bookingCode(c.bookingId)} · {db.customers.find((x) => x.id === c.customerId)?.name} · vendor {vendorName(c.vendorId)} · {formatDateTime(c.createdAt)}</AppText>
              <AppText color={colors.text}>{c.message}</AppText>
              {c.resolution ? <Banner tone="success" icon="checkmark-circle" title="Resolution" message={c.resolution} /> : null}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {c.status === 'open' ? <Button label="Start handling" size="sm" variant="secondary" onPress={() => resolve(c.id, 'in_progress')} /> : null}
                {c.status !== 'resolved' ? <Button label="Resolve" size="sm" variant="success" icon="checkmark" onPress={() => resolve(c.id, 'resolved')} /> : null}
                <Button label="Booking" size="sm" variant="ghost" onPress={() => router.navigate(`/bookings/${c.bookingId}`)} />
              </View>
            </Panel>
          ))}
        </View>
      )}
    </Page>
  );
}
