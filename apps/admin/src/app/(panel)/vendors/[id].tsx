import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  computeVendorWallet, DOC_STATUS, formatDateTime, formatINR, formatPhone, KYC_LABEL, useAction, useBackend, VENDOR_STATUS,
} from '@profecian/shared';
import {
  AppText, Badge, Banner, Button, ChipGroup, colors, confirmAction, Divider, EmptyState, KeyValue, promptText, radius, spacing, StatCard,
} from '@profecian/ui';
import { Cell, Page, Panel, Row } from '@/components/admin';
import { useLookups } from '@/components/lookups';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VendorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, category } = useLookups();
  const backend = useBackend();
  const v = db.vendors.find((x) => x.id === id);
  const review = useAction(backend.admin.reviewVendor);
  const verify = useAction(backend.admin.verifyDocument);
  const setCats = useAction(backend.admin.setVendorCategories);

  const stats = useMemo(() => {
    if (!v) return null;
    const mine = db.bookings.filter((b) => b.vendorId === v.id);
    const done = mine.filter((b) => b.status === 'completed');
    const cancelled = mine.filter((b) => b.status === 'cancelled').length;
    return { total: mine.length, done: done.length, cancelled, completionRate: mine.length ? Math.round((done.length / mine.length) * 100) : 0, wallet: computeVendorWallet(v.id, db.bookings, db.payouts) };
  }, [v, db]);

  if (!v || !stats) {
    return <Page title="Vendor"><EmptyState icon="search-outline" title="Vendor not found" message="" actionLabel="All vendors" onAction={() => router.replace('/vendors')} /></Page>;
  }

  const allVerified = v.kyc.filter((k) => k.type !== 'driving_license').every((k) => k.status === 'verified' || k.status === 'pending');
  const reviews = db.reviews.filter((r) => r.vendorId === v.id).slice(0, 5);

  const decide = async (decision: 'approved' | 'rejected' | 'suspended') => {
    if (decision === 'rejected' || decision === 'suspended') {
      const reason = await promptText(decision === 'rejected' ? 'Reject application' : 'Suspend vendor', 'Reason (shared with the vendor):', decision === 'rejected' ? 'Documents could not be verified' : 'Repeated customer complaints');
      if (reason == null) return;
      await review.run(v.id, decision, reason);
      return;
    }
    if (await confirmAction('Approve vendor', `Approve ${v.name}? Pending documents will be marked verified and they can receive jobs.`, 'Approve')) {
      await review.run(v.id, 'approved');
    }
  };

  return (
    <Page
      title={v.name}
      subtitle={`${formatPhone(v.phone)} · ${v.city} · joined ${formatDateTime(v.joinedAt)}`}
      permission="vendors"
      actions={
        <>
          <Badge label={VENDOR_STATUS[v.status].label} tone={VENDOR_STATUS[v.status].tone} />
          {v.status !== 'approved' ? <Button label="Approve" size="sm" variant="success" icon="checkmark" onPress={() => decide('approved')} loading={review.pending} disabled={!allVerified} /> : null}
          {v.status === 'pending' ? <Button label="Reject" size="sm" variant="danger" icon="close" onPress={() => decide('rejected')} /> : null}
          {v.status === 'approved' ? <Button label="Suspend" size="sm" variant="danger" icon="pause" onPress={() => decide('suspended')} /> : null}
          <Button label="Bookings" size="sm" variant="outline" onPress={() => router.navigate(`/bookings?vendor=${v.id}`)} />
        </>
      }
    >
      {v.rejectionReason ? <Banner tone="danger" icon="alert-circle" title={v.status === 'rejected' ? 'Application rejected' : 'Note'} message={v.rejectionReason} /> : null}
      {!allVerified && v.status === 'pending' ? <Banner tone="warning" icon="document-text-outline" title="Documents incomplete" message="All required KYC documents must be uploaded (and none rejected) before approval." /> : null}
      {review.error || verify.error ? <Banner tone="danger" icon="alert-circle" title={review.error ?? verify.error ?? ''} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Rating" value={v.rating ? `★ ${v.rating}` : '—'} icon="star-outline" tone="warning" hint={`${v.ratingCount} reviews`} />
        <StatCard label="Jobs completed" value={String(stats.done)} icon="checkmark-done-outline" tone="success" hint={`${stats.completionRate}% completion`} />
        <StatCard label="Cancelled" value={String(stats.cancelled)} icon="close-circle-outline" tone="danger" />
        <StatCard label="Net earnings" value={formatINR(stats.wallet.netEarnings)} icon="wallet-outline" hint={`Balance ${formatINR(stats.wallet.balance)}`} />
      </View>

      <Row min={380}>
        <Panel title="KYC documents">
          {v.kyc.map((k) => (
            <View key={k.type} style={{ gap: 8, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {k.imageUri ? <Image source={k.imageUri} style={{ width: 52, height: 52, borderRadius: radius.sm }} contentFit="cover" /> : null}
                <View style={{ flex: 1 }}>
                  <Cell title={`${KYC_LABEL[k.type]}${k.type === 'driving_license' ? ' (if required)' : ''}`} sub={k.number ? k.number : k.uploadedAt ? `Uploaded ${formatDateTime(k.uploadedAt)}` : 'Not uploaded'} />
                </View>
                <Badge label={DOC_STATUS[k.status].label} tone={DOC_STATUS[k.status].tone} />
              </View>
              {k.note ? <AppText variant="small">Note: {k.note}</AppText> : null}
              {k.status === 'pending' || k.status === 'verified' || k.status === 'rejected' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Verify" size="sm" variant="secondary" icon="checkmark" disabled={k.status === 'verified'} onPress={() => verify.run(v.id, k.type, 'verified')} />
                  <Button
                    label="Reject"
                    size="sm"
                    variant="danger"
                    disabled={k.status === 'rejected'}
                    onPress={async () => {
                      const note = await promptText('Reject document', `Why is the ${KYC_LABEL[k.type]} rejected?`, 'Image unclear — please re-upload');
                      if (note != null) await verify.run(v.id, k.type, 'rejected', note);
                    }}
                  />
                </View>
              ) : null}
            </View>
          ))}
          <View style={{ gap: 4 }}>
            <AppText variant="label">Bank account</AppText>
            {v.bank ? <AppText variant="small">{v.bank.holderName} · {v.bank.bankName} · ••••{v.bank.accountLast4} · {v.bank.ifsc}</AppText> : <AppText variant="small">Not added</AppText>}
          </View>
        </Panel>

        <View style={{ gap: spacing.lg }}>
          <Panel title="Service categories">
            <ChipGroup
              multi
              value={v.categoryIds}
              onChange={(c) => setCats.run(v.id, v.categoryIds.includes(c) ? v.categoryIds.filter((x) => x !== c) : [...v.categoryIds, c])}
              options={db.categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Panel>
          <Panel title="Availability">
            <KeyValue label="Status" value={v.available ? 'Online — accepting jobs' : 'Offline'} tone={v.available ? 'success' : undefined} />
            <KeyValue label="Working hours" value={`${v.workingHours.start}–${v.workingHours.end}`} />
            <KeyValue label="Working days" value={v.workingHours.days.map((d) => DAYS[d]).join(', ')} />
            <KeyValue label="Service areas" value={v.serviceAreas.join(', ') || '—'} />
          </Panel>
          <Panel title="Recent reviews">
            {reviews.length === 0 ? <AppText variant="small">No reviews yet.</AppText> : null}
            {reviews.map((r, i) => (
              <View key={r.id} style={{ gap: 2 }}>
                {i ? <Divider style={{ marginBottom: 8 }} /> : null}
                <AppText variant="label">{'★'.repeat(r.rating)} <AppText variant="small">· {r.customerName} · {category.get(r.categoryId)?.name}</AppText></AppText>
                <AppText variant="small" color={colors.text}>{r.text}</AppText>
              </View>
            ))}
          </Panel>
        </View>
      </Row>
    </Page>
  );
}
