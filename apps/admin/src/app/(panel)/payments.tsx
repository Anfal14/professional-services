import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  computeVendorWallet, formatDate, formatDateTime, formatINR, formatINRCompact, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, paymentMix, PAYOUT_STATUS,
  useAction, useBackend, type PaymentMethod,
} from '@profecian/shared';
import { AppText, Badge, Banner, BarList, Button, confirmAction, spacing, StatCard } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row, SearchInput, Tabs } from '@/components/admin';
import { useLookups } from '@/components/lookups';

type Tab = 'payments' | 'payouts' | 'settlements' | 'reports';

export default function Payments() {
  const { db, serviceLabel, vendorName } = useLookups();
  const backend = useBackend();
  const [tab, setTab] = useState<Tab>('payments');
  const [q, setQ] = useState('');
  const payout = useAction(backend.admin.createPayout);
  const updatePayout = useAction(backend.admin.updatePayout);

  const charged = useMemo(() => db.bookings.filter((b) => b.payment.status !== 'unpaid'), [db.bookings]);
  const paid = charged.filter((b) => b.payment.status === 'paid');
  const totals = useMemo(() => ({
    collected: paid.reduce((s, b) => s + b.price.total, 0),
    tax: paid.reduce((s, b) => s + b.price.tax, 0),
    commission: paid.reduce((s, b) => s + b.price.commission, 0),
    vendorShare: paid.reduce((s, b) => s + b.price.vendorPayout, 0),
    failed: charged.filter((b) => b.payment.status === 'failed').length,
  }), [paid, charged]);
  const wallets = useMemo(
    () => db.vendors.filter((v) => v.status !== 'pending' && v.status !== 'rejected').map((v) => ({ v, w: computeVendorWallet(v.id, db.bookings, db.payouts) })).sort((a, b) => b.w.balance - a.w.balance),
    [db],
  );
  const payouts = db.payouts.filter((p) => p.status !== 'settled');
  const settled = db.payouts.filter((p) => p.status === 'settled').sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? ''));
  const needle = q.trim().toLowerCase();
  const paymentRows = charged.filter((b) => !needle || [b.code, b.customerName, b.payment.txnId ?? ''].some((s) => s.toLowerCase().includes(needle)));
  const error = payout.error ?? updatePayout.error;

  return (
    <Page title="Payments" subtitle="Customer payments, vendor payouts and platform commission." permission="payments">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Collected (incl. GST)" value={formatINRCompact(totals.collected)} icon="cash-outline" tone="success" />
        <StatCard label="Platform commission" value={formatINRCompact(totals.commission)} icon="trending-up-outline" />
        <StatCard label="Vendor share" value={formatINRCompact(totals.vendorShare)} icon="people-outline" tone="info" />
        <StatCard label="GST collected" value={formatINRCompact(totals.tax)} icon="receipt-outline" tone="neutral" />
        <StatCard label="Failed payments" value={String(totals.failed)} icon="alert-circle-outline" tone="danger" />
      </View>
      {error ? <Banner tone="danger" icon="alert-circle" title={error} /> : null}
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'payments', label: 'Customer payments', count: charged.length },
        { value: 'payouts', label: 'Vendor payouts', count: payouts.length },
        { value: 'settlements', label: 'Settlement history', count: settled.length },
        { value: 'reports', label: 'Reports' },
      ]} />

      {tab === 'payments' ? (
        <>
          <SearchInput value={q} onChange={setQ} placeholder="Search booking code, customer or transaction ID" />
          <DataTable
            rows={paymentRows}
            rowKey={(b) => b.id}
            onRowPress={(b) => router.navigate(`/bookings/${b.id}`)}
            columns={[
              { key: 'code', title: 'Booking', min: 120, render: (b) => <Cell title={b.code} sub={b.payment.paidAt ? formatDateTime(b.payment.paidAt) : formatDate(b.date)} />, sort: (b) => b.payment.paidAt ?? b.createdAt },
              { key: 'cust', title: 'Customer', flex: 1.4, min: 170, render: (b) => <Cell title={b.customerName} sub={serviceLabel(b)} /> },
              { key: 'method', title: 'Method', min: 150, render: (b) => <Cell title={b.payment.method ? PAYMENT_METHOD_LABEL[b.payment.method] : '—'} sub={b.payment.txnId ?? b.payment.failureReason} /> },
              { key: 'status', title: 'Status', min: 110, render: (b) => <Badge label={PAYMENT_STATUS[b.payment.status].label} tone={PAYMENT_STATUS[b.payment.status].tone} /> },
              { key: 'amt', title: 'Total', min: 110, align: 'right', sort: (b) => b.price.total, render: (b) => <Cell title={formatINR(b.price.total)} /> },
              { key: 'com', title: 'Commission', min: 120, align: 'right', render: (b) => <Cell title={formatINR(b.price.commission)} sub={`${Math.round(b.price.commissionRate * 100)}%`} /> },
              { key: 'ven', title: 'Vendor payout', min: 130, align: 'right', render: (b) => <Cell title={formatINR(b.price.vendorPayout)} sub={vendorName(b.vendorId)} /> },
            ]}
          />
        </>
      ) : null}

      {tab === 'payouts' ? (
        <Row min={420}>
          <Panel title="Vendor wallets">
            <AppText variant="small">Balance = online payouts owed − commission owed on cash jobs − payouts already made.</AppText>
            <DataTable
              rows={wallets}
              rowKey={(r) => r.v.id}
              pageSize={10}
              columns={[
                { key: 'v', title: 'Vendor', flex: 1.4, min: 160, render: (r) => <Cell title={r.v.name} sub={r.v.bank ? `${r.v.bank.bankName} ••${r.v.bank.accountLast4}` : 'No bank account'} /> },
                { key: 'net', title: 'Net earned', min: 110, align: 'right', render: (r) => <Cell title={formatINR(r.w.netEarnings)} sub={`−${formatINR(r.w.commissionDeducted)} fee`} /> },
                { key: 'bal', title: 'Balance', min: 110, align: 'right', sort: (r) => r.w.balance, render: (r) => <Cell title={formatINR(r.w.balance)} sub={r.w.cashCommissionOwed ? `cash fee ${formatINR(r.w.cashCommissionOwed)}` : undefined} /> },
                { key: 'act', title: '', min: 130, align: 'right', render: (r) => (
                  <Button label="Create payout" size="sm" variant="secondary" disabled={r.w.balance < 100 || !r.v.bank} loading={payout.pending}
                    onPress={async () => { if (await confirmAction('Create payout', `Pay ${formatINR(r.w.balance)} to ${r.v.name}?`)) await payout.run(r.v.id); }} />
                ) },
              ]}
            />
          </Panel>
          <Panel title="Payouts in progress">
            {payouts.length === 0 ? <AppText variant="small">No pending payouts.</AppText> : null}
            {payouts.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}><Cell title={`${formatINR(p.amount)} → ${vendorName(p.vendorId)}`} sub={`${p.bookingIds.length} bookings · created ${formatDateTime(p.createdAt)}`} /></View>
                <Badge label={PAYOUT_STATUS[p.status].label} tone={PAYOUT_STATUS[p.status].tone} />
                {p.status === 'pending' ? <Button label="Processing" size="sm" variant="outline" onPress={() => updatePayout.run(p.id, 'processing')} /> : null}
                <Button label="Mark settled" size="sm" variant="success" onPress={async () => { if (await confirmAction('Mark settled', `Confirm ${formatINR(p.amount)} was transferred to ${vendorName(p.vendorId)}?`)) await updatePayout.run(p.id, 'settled'); }} />
              </View>
            ))}
          </Panel>
        </Row>
      ) : null}

      {tab === 'settlements' ? (
        <DataTable
          rows={settled}
          rowKey={(p) => p.id}
          columns={[
            { key: 'v', title: 'Vendor', flex: 1.4, min: 170, render: (p) => <Cell title={vendorName(p.vendorId)} /> },
            { key: 'amt', title: 'Amount', min: 120, align: 'right', sort: (p) => p.amount, render: (p) => <Cell title={formatINR(p.amount)} /> },
            { key: 'n', title: 'Bookings', min: 100, align: 'right', render: (p) => <Cell title={String(p.bookingIds.length)} /> },
            { key: 'when', title: 'Settled', min: 160, sort: (p) => p.settledAt ?? '', render: (p) => <Cell title={p.settledAt ? formatDateTime(p.settledAt) : '—'} /> },
            { key: 'utr', title: 'UTR', min: 160, render: (p) => <Cell title={p.utr ?? '—'} /> },
          ]}
        />
      ) : null}

      {tab === 'reports' ? (
        <Row min={360}>
          <Panel title="Collections by payment method">
            <BarList
              format={(n) => formatINR(n)}
              data={paymentMix(db).map((m) => ({ label: PAYMENT_METHOD_LABEL[m.method as PaymentMethod] ?? m.method, value: m.amount, detail: `${m.count} payments` }))}
            />
          </Panel>
          <Panel title="Money flow (all paid bookings)">
            <BarList
              format={(n) => formatINR(n)}
              data={[
                { label: 'Collected from customers', value: totals.collected },
                { label: 'Vendor share', value: totals.vendorShare },
                { label: 'Platform commission', value: totals.commission },
                { label: 'GST to remit', value: totals.tax },
              ]}
            />
          </Panel>
        </Row>
      ) : null}
    </Page>
  );
}
