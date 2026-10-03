import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  BOOKING_STATUS, can, dailySeries, formatDate, formatINR, formatINRCompact, kpis, timeAgo, VENDOR_STATUS, inspectionNeedsAttention, } from '@profecian/shared';
import { AppText, Badge, Button, colors, LineChart, spacing, StatCard } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row, useAdmin } from '@/components/admin';
import { useLookups } from '@/components/lookups';

export default function Dashboard() {
  const { db, serviceLabel } = useLookups();
  const admin = useAdmin();
  const k = useMemo(() => kpis(db), [db]);
  const series = useMemo(() => dailySeries(db, 30), [db]);
  const pending = db.bookings.filter((b) => b.status === 'pending_assignment');
  const pendingVendors = db.vendors.filter((v) => v.status === 'pending');
  const inbox = db.notifications.filter((n) => n.audience === 'admin').slice(0, 6);
  const showMoney = can(admin, 'payments') || can(admin, 'analytics');

  return (
    <Page title={`Good day, ${admin?.name.split(' ')[0]}`} subtitle="Here's what's happening across Profecian today." permission="dashboard">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Total users" value={String(k.totalUsers)} icon="people-outline" />
        <StatCard label="Total vendors" value={String(k.totalVendors)} icon="construct-outline" tone="info" hint={`${k.approvedVendors} approved · ${k.pendingVendors} pending`} />
        <StatCard label="Active bookings" value={String(k.activeBookings)} icon="pulse-outline" tone="info" />
        <StatCard label="Completed bookings" value={String(k.completedBookings)} icon="checkmark-done-outline" tone="success" />
        <StatCard label="Pending assignments" value={String(k.pendingAssignments)} icon="hourglass-outline" tone="warning" />
        {showMoney ? <StatCard label="Revenue (collected)" value={formatINRCompact(k.revenue)} icon="cash-outline" tone="success" hint="incl. GST" /> : null}
        {showMoney ? <StatCard label="Commission earned" value={formatINRCompact(k.commission)} icon="trending-up-outline" tone="primary" /> : null}
      </View>

      <Row min={420}>
        {showMoney ? (
          <Panel title="Revenue · last 30 days" action={<Button label="Analytics" size="sm" variant="ghost" iconRight="arrow-forward" onPress={() => router.navigate('/analytics')} />}>
            <LineChart
              accessibilityLabel="Daily collected revenue for the last 30 days"
              data={series.map((p) => ({ label: p.date.slice(8), value: p.revenue, detail: formatDate(p.date) }))}
              format={(n) => formatINRCompact(n)}
            />
          </Panel>
        ) : null}
        <Panel title="Needs attention">
          <View style={{ gap: spacing.md }}>
            <Attention icon="hourglass-outline" tone="warning" label={`${pending.length} bookings waiting for a professional`} action="Assign" onPress={() => router.navigate('/assign')} />
            <Attention icon="help-circle-outline" tone="warning" label={`${db.bookings.filter(inspectionNeedsAttention).length} “Not sure” requests need follow-up`} action="Review" onPress={() => router.navigate('/bookings?filter=not_sure' as never)} />
            <Attention icon="shield-outline" tone="info" label={`${pendingVendors.length} vendors pending KYC approval`} action="Review" onPress={() => router.navigate('/vendors')} />
            <Attention icon="alert-circle-outline" tone="danger" label={`${k.openComplaints} open complaints`} action="Open" onPress={() => router.navigate('/reviews')} />
            <Attention icon="card-outline" tone="danger" label={`${db.bookings.filter((b) => b.payment.status === 'failed').length} failed payments`} action="View" onPress={() => router.navigate('/payments')} />
          </View>
        </Panel>
      </Row>

      <Row min={520}>
        <Panel title="Pending assignments" action={<Button label="Assignment board" size="sm" variant="secondary" onPress={() => router.navigate('/assign')} />}>
          <DataTable
            rows={pending.slice(0, 6)}
            rowKey={(b) => b.id}
            onRowPress={(b) => router.navigate(`/bookings/${b.id}`)}
            empty="Every booking has a professional 🎉"
            columns={[
              { key: 'code', title: 'Booking', min: 110, render: (b) => <Cell title={b.code} sub={b.address.city} /> },
              { key: 'svc', title: 'Service', flex: 2, min: 200, render: (b) => <Cell title={serviceLabel(b)} sub={b.customerName} /> },
              { key: 'when', title: 'Scheduled', min: 140, render: (b) => <Cell title={formatDate(b.date)} sub={b.slot} /> },
            ]}
          />
        </Panel>
        <Panel title="Vendors awaiting approval">
          {pendingVendors.length === 0 ? <AppText variant="small">No pending applications.</AppText> : null}
          {pendingVendors.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}><Cell title={v.name} sub={`${v.city} · joined ${timeAgo(v.joinedAt)}`} /></View>
              <Badge label={VENDOR_STATUS[v.status].label} tone={VENDOR_STATUS[v.status].tone} />
              <Button label="Review" size="sm" variant="outline" onPress={() => router.navigate(`/vendors/${v.id}`)} />
            </View>
          ))}
        </Panel>
      </Row>

      <Panel title="Latest activity" action={<Button label="All notifications" size="sm" variant="ghost" onPress={() => router.navigate('/notifications')} />}>
        {inbox.map((n) => (
          <View key={n.id} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? colors.border : colors.primary }} />
            <View style={{ flex: 1 }}><Cell title={n.title} sub={n.body} /></View>
            <AppText variant="tiny">{timeAgo(n.createdAt)}</AppText>
          </View>
        ))}
        {!inbox.length ? <AppText variant="small">No activity yet.</AppText> : null}
      </Panel>

      {showMoney ? (
        <AppText variant="tiny">
          Revenue counts completed, paid bookings (incl. GST). Commission = platform share of the service amount; vendors receive {formatINR(k.vendorPayouts)} in total. Active = assigned through in progress. Status legend: {Object.values(BOOKING_STATUS).map((s) => s.label).join(' · ')}.
        </AppText>
      ) : null}
    </Page>
  );
}

function Attention({ icon, tone, label, action, onPress }: { icon: 'hourglass-outline' | 'help-circle-outline' | 'shield-outline' | 'alert-circle-outline' | 'card-outline'; tone: 'warning' | 'info' | 'danger'; label: string; action: string; onPress: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Badge label="" tone={tone} icon={icon} />
      <AppText variant="bodyMedium" style={{ flex: 1 }}>{label}</AppText>
      <Button label={action} size="sm" variant="outline" onPress={onPress} />
    </View>
  );
}
