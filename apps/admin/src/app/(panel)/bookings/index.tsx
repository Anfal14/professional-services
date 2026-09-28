import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ACTIVE_STATUSES, BOOKING_STATUS, formatDate, formatINR, formatPhone, PAYMENT_STATUS, type Booking } from '@profecian/shared';
import { Badge, spacing } from '@profecian/ui';
import { Cell, DataTable, Page, SearchInput, Tabs } from '@/components/admin';
import { useLookups } from '@/components/lookups';

type Filter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

const match: Record<Filter, (b: Booking) => boolean> = {
  all: () => true,
  pending: (b) => b.status === 'pending_assignment',
  active: (b) => ACTIVE_STATUSES.includes(b.status) && b.status !== 'pending_assignment',
  completed: (b) => b.status === 'completed',
  cancelled: (b) => b.status === 'cancelled',
};

export default function Bookings() {
  const { db, serviceLabel, vendorName } = useLookups();
  const params = useLocalSearchParams<{ customer?: string; vendor?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const scoped = useMemo(
    () => db.bookings.filter((b) => (!params.customer || b.customerId === params.customer) && (!params.vendor || b.vendorId === params.vendor)),
    [db.bookings, params.customer, params.vendor],
  );
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scoped.filter(match[filter]).filter((b) =>
      !needle || [b.code, b.customerName, b.customerPhone, b.address.city, serviceLabel(b), vendorName(b.vendorId)].some((s) => s.toLowerCase().includes(needle)),
    );
  }, [scoped, filter, q, serviceLabel, vendorName]);

  const counts = Object.fromEntries((Object.keys(match) as Filter[]).map((f) => [f, scoped.filter(match[f]).length])) as Record<Filter, number>;
  const scopeName = params.customer ? db.customers.find((c) => c.id === params.customer)?.name : params.vendor ? vendorName(params.vendor) : null;

  return (
    <Page title="Bookings" subtitle={scopeName ? `Filtered to ${scopeName}` : 'Every booking on the platform, newest first.'} permission="bookings">
      <View style={{ gap: spacing.md }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search code, customer, phone, city, service or vendor" />
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'pending', label: 'Awaiting assignment', count: counts.pending },
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'completed', label: 'Completed', count: counts.completed },
            { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ]}
        />
      </View>
      <DataTable
        rows={rows}
        rowKey={(b) => b.id}
        onRowPress={(b) => router.navigate(`/bookings/${b.id}`)}
        empty="No bookings match these filters."
        columns={[
          { key: 'code', title: 'Booking', min: 120, render: (b) => <Cell title={b.code} sub={formatDate(b.createdAt.slice(0, 10))} />, sort: (b) => b.createdAt },
          { key: 'cust', title: 'Customer', flex: 1.4, min: 170, render: (b) => <Cell title={b.customerName} sub={formatPhone(b.customerPhone)} />, sort: (b) => b.customerName },
          { key: 'svc', title: 'Service', flex: 1.8, min: 210, render: (b) => <Cell title={serviceLabel(b)} sub={b.address.city} /> },
          { key: 'when', title: 'Scheduled', min: 130, render: (b) => <Cell title={formatDate(b.date)} sub={b.slot} />, sort: (b) => `${b.date}` },
          { key: 'vendor', title: 'Vendor', flex: 1.2, min: 150, render: (b) => <Cell title={vendorName(b.vendorId)} /> },
          { key: 'status', title: 'Status', min: 170, render: (b) => <Badge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />, sort: (b) => b.status },
          {
            key: 'amt', title: 'Amount', min: 130, align: 'right', sort: (b) => b.price.total,
            render: (b) => (
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Cell title={formatINR(b.price.total)} />
                <Badge label={PAYMENT_STATUS[b.payment.status].label} tone={PAYMENT_STATUS[b.payment.status].tone} />
              </View>
            ),
          },
        ]}
      />
    </Page>
  );
}
