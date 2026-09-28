import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDateTime, formatINR, formatPhone, useAction, useBackend } from '@profecian/shared';
import { Badge, Button, confirmAction, spacing } from '@profecian/ui';
import { Cell, DataTable, Page, SearchInput, Tabs } from '@/components/admin';
import { useLookups } from '@/components/lookups';

type Filter = 'all' | 'active' | 'blocked';

export default function Users() {
  const { db } = useLookups();
  const backend = useBackend();
  const block = useAction(backend.admin.setCustomerBlocked);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; spent: number; last?: string }>();
    for (const b of db.bookings) {
      const s = m.get(b.customerId) ?? { count: 0, spent: 0 };
      s.count += 1;
      if (b.payment.status === 'paid') s.spent += b.price.total;
      if (!s.last || b.createdAt > s.last) s.last = b.createdAt;
      m.set(b.customerId, s);
    }
    return m;
  }, [db.bookings]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.customers
      .filter((c) => filter === 'all' || (filter === 'blocked' ? c.blocked : !c.blocked))
      .filter((c) => !needle || [c.name, c.phone, c.email ?? '', c.city].some((s) => s.toLowerCase().includes(needle)));
  }, [db.customers, filter, q]);

  const toggle = async (id: string, name: string, blocked: boolean) => {
    const ok = await confirmAction(blocked ? 'Unblock user' : 'Block user', blocked ? `${name} will be able to log in and book again.` : `${name} won't be able to log in or book until unblocked.`, blocked ? 'Unblock' : 'Block');
    if (ok) await block.run(id, !blocked);
  };

  return (
    <Page title="Users" subtitle="Customers who have signed up on the app." permission="users">
      <View style={{ gap: spacing.md }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email or city" />
        <Tabs value={filter} onChange={setFilter} tabs={[
          { value: 'all', label: 'All', count: db.customers.length },
          { value: 'active', label: 'Active', count: db.customers.filter((c) => !c.blocked).length },
          { value: 'blocked', label: 'Blocked', count: db.customers.filter((c) => c.blocked).length },
        ]} />
      </View>
      <DataTable
        rows={rows}
        rowKey={(c) => c.id}
        onRowPress={(c) => router.navigate(`/users/${c.id}`)}
        columns={[
          { key: 'name', title: 'Customer', flex: 1.5, min: 190, sort: (c) => c.name, render: (c) => <Cell title={c.name} sub={c.email ?? '—'} /> },
          { key: 'phone', title: 'Phone', min: 150, render: (c) => <Cell title={formatPhone(c.phone)} /> },
          { key: 'city', title: 'City', min: 110, sort: (c) => c.city, render: (c) => <Cell title={c.city} /> },
          { key: 'bookings', title: 'Bookings', min: 110, align: 'right', sort: (c) => stats.get(c.id)?.count ?? 0, render: (c) => <Cell title={String(stats.get(c.id)?.count ?? 0)} sub={formatINR(stats.get(c.id)?.spent ?? 0)} /> },
          { key: 'joined', title: 'Joined', min: 150, sort: (c) => c.createdAt, render: (c) => <Cell title={formatDateTime(c.createdAt)} /> },
          { key: 'status', title: 'Status', min: 190, render: (c) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge label={c.blocked ? 'Blocked' : 'Active'} tone={c.blocked ? 'danger' : 'success'} />
              <Button label={c.blocked ? 'Unblock' : 'Block'} size="sm" variant={c.blocked ? 'secondary' : 'danger'} onPress={() => toggle(c.id, c.name, c.blocked)} />
            </View>
          ) },
        ]}
      />
    </Page>
  );
}
