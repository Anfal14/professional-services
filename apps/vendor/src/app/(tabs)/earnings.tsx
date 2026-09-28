import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  formatDate, formatDateTime, formatINR, formatINRCompact, PAYOUT_STATUS, toISODate, useAction, useBackend, useDb,
} from '@profecian/shared';
import { AppText, Badge, Banner, Button, Card, colors, ColumnChart, Divider, fonts, KeyValue, SectionTitle, spacing, StatCard } from '@profecian/ui';
import { useVendor } from '@/backend';
import { VendorScreen } from '@/components/VendorScreen';

export default function Earnings() {
  const vendor = useVendor()!;
  const db = useDb();
  const backend = useBackend();
  const request = useAction(backend.vendor.requestPayout);
  const w = backend.wallet(vendor.id);
  const payouts = db.payouts.filter((p) => p.vendorId === vendor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const done = db.bookings.filter((b) => b.vendorId === vendor.id && b.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));

  // Net earnings per day for the last 14 days (by job date).
  const days = useMemo(() => {
    const out: { label: string; value: number; detail: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODate(d);
      out.push({ label: String(d.getDate()), value: done.filter((b) => b.date === iso).reduce((s, b) => s + b.price.vendorPayout, 0), detail: formatDate(iso) });
    }
    return out;
  }, [done]);

  return (
    <VendorScreen title="Earnings" subtitle="Wallet, commission and payouts">
      <Card style={{ gap: spacing.sm, backgroundColor: colors.ink, borderColor: colors.ink }}>
        <AppText variant="small" color="rgba(255,255,255,0.7)">Wallet balance</AppText>
        <AppText style={{ fontSize: 34, lineHeight: 40, color: colors.white, fontFamily: fonts.extrabold }}>{formatINR(w.balance)}</AppText>
        <AppText variant="small" color="rgba(255,255,255,0.7)">
          {w.inProcess ? `${formatINR(w.inProcess)} payout in process · ` : ''}Payouts are settled weekly to {vendor.bank ? `${vendor.bank.bankName} ••${vendor.bank.accountLast4}` : 'your bank account'}
        </AppText>
        <Button label="Request payout" variant="light" icon="arrow-down-circle-outline" disabled={w.balance < 100} loading={request.pending} onPress={() => request.run(vendor.id)} style={{ marginTop: spacing.sm }} />
      </Card>
      {request.error ? <Banner tone="danger" icon="alert-circle" title={request.error} /> : null}
      {w.balance < 0 ? <Banner tone="warning" icon="cash-outline" title="Commission due on cash jobs" message={`You collected cash on some jobs. ${formatINR(-w.balance)} will be adjusted against your next online earnings.`} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Gross earnings" value={formatINRCompact(w.grossEarnings)} icon="trending-up-outline" style={{ minWidth: 140 }} />
        <StatCard label="Commission deducted" value={formatINRCompact(w.commissionDeducted)} icon="remove-circle-outline" tone="danger" style={{ minWidth: 140 }} />
        <StatCard label="Net earnings" value={formatINRCompact(w.netEarnings)} icon="wallet-outline" tone="success" style={{ minWidth: 140 }} />
        <StatCard label="Paid out" value={formatINRCompact(w.settled)} icon="checkmark-done-outline" tone="info" style={{ minWidth: 140 }} />
      </View>

      <Card style={{ gap: spacing.sm }}>
        <AppText variant="h3">Last 14 days</AppText>
        <AppText variant="small">Your net earnings per day (after commission).</AppText>
        <ColumnChart accessibilityLabel="Net earnings per day over the last 14 days" data={days} format={formatINRCompact} height={200} xLabelEvery={2} />
      </Card>

      <Card style={{ gap: 4 }}>
        <AppText variant="h3" style={{ marginBottom: 6 }}>Pending settlements</AppText>
        <KeyValue label="Online payments owed to you" value={formatINR(w.onlinePayoutOwed)} />
        <KeyValue label="Commission owed on cash jobs" value={`−${formatINR(w.cashCommissionOwed)}`} />
        <KeyValue label="Already paid / in process" value={`−${formatINR(w.settled + w.inProcess)}`} />
        <Divider style={{ marginVertical: 6 }} />
        <KeyValue label="Balance" value={formatINR(w.balance)} strong tone={w.balance >= 0 ? 'success' : 'danger'} />
      </Card>

      <View>
        <SectionTitle title="Payout history" />
        <Card style={{ gap: spacing.md }}>
          {payouts.length === 0 ? <AppText variant="small">No payouts yet.</AppText> : null}
          {payouts.map((p, i) => (
            <View key={p.id} style={{ gap: spacing.md }}>
              {i ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{formatINR(p.amount)}</AppText>
                  <AppText variant="small">{p.bookingIds.length} jobs · {formatDateTime(p.settledAt ?? p.createdAt)}{p.utr ? ` · ${p.utr}` : ''}</AppText>
                </View>
                <Badge label={PAYOUT_STATUS[p.status].label} tone={PAYOUT_STATUS[p.status].tone} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionTitle title="Job earnings" />
        <Card style={{ gap: spacing.md }}>
          {done.slice(0, 15).map((b, i) => (
            <View key={b.id} style={{ gap: spacing.md }}>
              {i ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" onPress={() => router.push(`/job/${b.id}`)}>{b.code} · {formatDate(b.date)}</AppText>
                  <AppText variant="small">{formatINR(b.price.serviceAmount)} − {formatINR(b.price.commission)} commission · {b.payment.method === 'cash' ? 'cash' : 'online'}</AppText>
                </View>
                <AppText variant="label" color={colors.success}>{formatINR(b.price.vendorPayout)}</AppText>
              </View>
            </View>
          ))}
          {!done.length ? <AppText variant="small">Complete your first job to start earning.</AppText> : null}
        </Card>
      </View>
    </VendorScreen>
  );
}
