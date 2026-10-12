import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatPhone, RELIABILITY_LOW, reliabilityLabel, reliabilityOf, timeAgo, VENDOR_STATUS, type VendorStatus } from '@profecian/shared';
import { AppText, Badge, colors, spacing } from '@profecian/ui';
import { Cell, DataTable, Page, SearchInput, Tabs } from '@/components/admin';
import { useScopedLookups } from '@/components/lookups';

type Filter = 'all' | VendorStatus;

export default function Vendors() {
  const { db, allDb, category, city } = useScopedLookups();
  // Counted over every city's bookings, whatever the city filter.
  const reliability = (v: (typeof db.vendors)[number]) => reliabilityOf(allDb, v);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.vendors
      .filter((v) => filter === 'all' || v.status === filter)
      .filter((v) => !needle || [v.name, v.phone, v.city, ...v.categoryIds.map((c) => category.get(c)?.name ?? '')].some((s) => s.toLowerCase().includes(needle)));
  }, [db.vendors, filter, q, category]);
  const count = (s: Filter) => (s === 'all' ? db.vendors.length : db.vendors.filter((v) => v.status === s).length);

  return (
    <Page title="Vendors" subtitle={city ? `Professionals based in ${city}.` : 'Approve applications, verify KYC and track performance.'} permission="vendors" cityFilter>
      <View style={{ gap: spacing.md }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, city or service" />
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={(['all', 'pending', 'approved', 'rejected', 'suspended'] as Filter[]).map((s) => ({ value: s, label: s === 'all' ? 'All' : VENDOR_STATUS[s].label, count: count(s) }))}
        />
      </View>
      <DataTable
        rows={rows}
        rowKey={(v) => v.id}
        onRowPress={(v) => router.navigate(`/vendors/${v.id}`)}
        columns={[
          { key: 'name', title: 'Vendor', flex: 1.5, min: 190, sort: (v) => v.name, render: (v) => <Cell title={v.name} sub={formatPhone(v.phone)} /> },
          { key: 'city', title: 'City', min: 110, sort: (v) => v.city, render: (v) => <Cell title={v.city} sub={v.serviceAreas.slice(0, 2).join(', ')} /> },
          { key: 'svc', title: 'Services', flex: 1.6, min: 200, render: (v) => <AppText variant="small" numberOfLines={2}>{v.categoryIds.map((c) => category.get(c)?.name).join(', ')}</AppText> },
          { key: 'kyc', title: 'KYC', min: 110, render: (v) => {
            const verified = v.kyc.filter((k) => k.status === 'verified').length;
            return <Badge label={`${verified}/${v.kyc.length} verified`} tone={verified === v.kyc.length ? 'success' : v.kyc.some((k) => k.status === 'rejected') ? 'danger' : 'warning'} />;
          } },
          { key: 'rate', title: 'Completion', min: 120, sort: (v) => reliability(v).rate ?? 101, render: (v) => {
            const r = reliability(v);
            const low = r.rate != null && r.rate < RELIABILITY_LOW;
            return (
              <View style={{ gap: 1 }}>
                <AppText variant="label" color={low ? colors.danger : r.rate == null ? colors.muted : colors.ink}>{reliabilityLabel(r)}</AppText>
                <AppText variant="small">{r.lateReleases ? `${r.lateReleases} late of ${r.accepted}` : `${r.accepted} accepted`}</AppText>
              </View>
            );
          } },
          { key: 'perf', title: 'Performance', min: 140, sort: (v) => v.jobsCompleted, render: (v) => <Cell title={v.rating ? `★ ${v.rating} (${v.ratingCount})` : 'No ratings'} sub={`${v.jobsCompleted} jobs done`} /> },
          { key: 'status', title: 'Status', min: 150, sort: (v) => v.status, render: (v) => (
            <View style={{ gap: 3 }}>
              <Badge label={VENDOR_STATUS[v.status].label} tone={VENDOR_STATUS[v.status].tone} />
              <AppText variant="tiny">joined {timeAgo(v.joinedAt)}</AppText>
            </View>
          ) },
        ]}
      />
    </Page>
  );
}
