import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { BOOKING_STATUS, formatDate, formatDateTime, formatINR, formatPhone, useAction, useBackend } from '@profecian/shared';
import { AppText, Badge, Button, confirmAction, EmptyState, KeyValue, spacing, StatCard } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row } from '@/components/admin';
import { useLookups } from '@/components/lookups';

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, serviceLabel, vendorName } = useLookups();
  const backend = useBackend();
  const block = useAction(backend.admin.setCustomerBlocked);
  const c = db.customers.find((x) => x.id === id);
  if (!c) return <Page title="User"><EmptyState icon="search-outline" title="User not found" message="" actionLabel="All users" onAction={() => router.replace('/users')} /></Page>;

  const bookings = db.bookings.filter((b) => b.customerId === c.id);
  const spent = bookings.filter((b) => b.payment.status === 'paid').reduce((s, b) => s + b.price.total, 0);
  const complaints = db.complaints.filter((x) => x.customerId === c.id);

  return (
    <Page
      title={c.name}
      subtitle={`${formatPhone(c.phone)} · ${c.email ?? 'no email'} · ${c.city}`}
      permission="users"
      actions={
        <>
          <Badge label={c.blocked ? 'Blocked' : 'Active'} tone={c.blocked ? 'danger' : 'success'} />
          <Button
            label={c.blocked ? 'Unblock user' : 'Block user'}
            size="sm"
            variant={c.blocked ? 'secondary' : 'danger'}
            loading={block.pending}
            onPress={async () => {
              if (await confirmAction(c.blocked ? 'Unblock user' : 'Block user', `${c.blocked ? 'Allow' : 'Stop'} ${c.name} ${c.blocked ? 'to use' : 'from using'} the app?`)) await block.run(c.id, !c.blocked);
            }}
          />
        </>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Bookings" value={String(bookings.length)} icon="calendar-outline" />
        <StatCard label="Completed" value={String(bookings.filter((b) => b.status === 'completed').length)} icon="checkmark-done-outline" tone="success" />
        <StatCard label="Total spent" value={formatINR(spent)} icon="cash-outline" tone="info" />
        <StatCard label="Complaints" value={String(complaints.length)} icon="alert-circle-outline" tone={complaints.length ? 'danger' : 'neutral'} />
      </View>
      <Row min={340}>
        <Panel title="Profile">
          <KeyValue label="Joined" value={formatDateTime(c.createdAt)} />
          <KeyValue label="City" value={c.city} />
          {c.addresses.map((a) => <KeyValue key={a.id} label={a.label} value={`${a.line}, ${a.city}`} />)}
          {!c.addresses.length ? <AppText variant="small">No saved addresses.</AppText> : null}
        </Panel>
        <Panel title="Complaints">
          {complaints.length ? complaints.map((x) => <Cell key={x.id} title={x.subject} sub={`${x.status} · ${formatDateTime(x.createdAt)}`} />) : <AppText variant="small">None.</AppText>}
        </Panel>
      </Row>
      <Panel title="Booking history">
        <DataTable
          rows={bookings}
          rowKey={(b) => b.id}
          onRowPress={(b) => router.navigate(`/bookings/${b.id}`)}
          empty="No bookings yet."
          columns={[
            { key: 'code', title: 'Booking', min: 110, render: (b) => <Cell title={b.code} sub={formatDate(b.date)} /> },
            { key: 'svc', title: 'Service', flex: 2, min: 220, render: (b) => <Cell title={serviceLabel(b)} sub={vendorName(b.vendorId)} /> },
            { key: 'status', title: 'Status', min: 170, render: (b) => <Badge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} /> },
            { key: 'amt', title: 'Amount', min: 110, align: 'right', render: (b) => <Cell title={formatINR(b.price.total)} /> },
          ]}
        />
      </Panel>
    </Page>
  );
}
