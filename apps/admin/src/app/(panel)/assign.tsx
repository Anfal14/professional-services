import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { bySchedule, formatDate, formatINR, useDb } from '@profecian/shared';
import { AppText, Badge, Button, ChipGroup, colors, EmptyState, radius, spacing, type WebPressableState } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row } from '@/components/admin';
import { useLookups } from '@/components/lookups';
import { VendorPicker } from '@/components/VendorPicker';

export default function AssignmentBoard() {
  const db = useDb();
  const { serviceLabel, category } = useLookups();
  const [service, setService] = useState<string>('all');
  const queue = useMemo(
    () => db.bookings
      .filter((b) => b.status === 'pending_assignment' && (service === 'all' || b.categoryId === service))
      .sort(bySchedule),
    [db.bookings, service],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = queue.find((b) => b.id === selectedId) ?? queue[0];

  // Workload: active jobs per approved vendor today and in total.
  const today = new Date().toISOString().slice(0, 10);
  const workload = useMemo(
    () => db.vendors
      .filter((v) => v.status === 'approved')
      .map((v) => {
        const active = db.bookings.filter((b) => b.vendorId === v.id && !['completed', 'cancelled', 'pending_assignment'].includes(b.status));
        return { v, today: active.filter((b) => b.date === today).length, open: active.length };
      })
      .sort((a, b) => b.open - a.open),
    [db, today],
  );

  const serviceOptions = [{ value: 'all', label: 'All services' }, ...db.categories.filter((c) => c.enabled).map((c) => ({ value: c.id, label: c.name }))];

  return (
    <Page title="Vendor assignment" subtitle="Unassigned bookings, soonest first. Suggestions rank the nearest, least busy and best rated professionals." permission="bookings">
      <ChipGroup value={service} onChange={setService} options={serviceOptions} />
      {queue.length === 0 ? (
        <Panel><EmptyState icon="checkmark-done-circle-outline" title="Queue is empty" message="Every booking has a professional assigned." /></Panel>
      ) : (
        <Row min={380}>
          <Panel title={`Queue (${queue.length})`}>
            {queue.map((b) => {
              const on = selected?.id === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedId(b.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ hovered }: WebPressableState) => [
                    { padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, gap: 4 },
                    hovered && !on ? { backgroundColor: colors.surfaceAlt } : null,
                    on ? { backgroundColor: '#FBF9FF' } : null,
                  ]}
                >
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <AppText variant="label" style={{ flex: 1 }}>{b.code}</AppText>
                    <Badge label={formatDate(b.date) === formatDate(today) ? 'Today' : formatDate(b.date)} tone={b.date === today ? 'warning' : 'neutral'} />
                  </View>
                  <AppText variant="bodyMedium" numberOfLines={1}>{serviceLabel(b)}</AppText>
                  <AppText variant="small" numberOfLines={1}>{b.slot} · {b.address.city} · {b.customerName} · {formatINR(b.price.total)}</AppText>
                </Pressable>
              );
            })}
          </Panel>
          {selected ? (
            <Panel
              title={`Suggestions for ${selected.code}`}
              action={<Button label="Details" size="sm" variant="ghost" onPress={() => router.navigate(`/bookings/${selected.id}`)} />}
            >
              <AppText variant="small">{category.get(selected.categoryId)?.name} · {selected.address.line}, {selected.address.city}</AppText>
              <VendorPicker booking={selected} limit={8} onDone={() => setSelectedId(null)} />
            </Panel>
          ) : null}
        </Row>
      )}

      <Panel title="Vendor workload">
        <DataTable
          rows={workload}
          rowKey={(r) => r.v.id}
          onRowPress={(r) => router.navigate(`/vendors/${r.v.id}`)}
          pageSize={10}
          columns={[
            { key: 'v', title: 'Vendor', flex: 1.6, min: 180, render: (r) => <Cell title={r.v.name} sub={`${r.v.city} · ${r.v.categoryIds.map((id) => category.get(id)?.name).join(', ')}`} /> },
            { key: 'status', title: 'Availability', min: 120, render: (r) => <Badge label={r.v.available ? 'Online' : 'Offline'} tone={r.v.available ? 'success' : 'neutral'} /> },
            { key: 'today', title: 'Jobs today', min: 110, align: 'right', sort: (r) => r.today, render: (r) => <AppText variant="bodyMedium">{r.today}</AppText> },
            { key: 'open', title: 'Open jobs', min: 110, align: 'right', sort: (r) => r.open, render: (r) => <AppText variant="bodyMedium">{r.open}</AppText> },
            { key: 'rating', title: 'Rating', min: 100, align: 'right', sort: (r) => r.v.rating, render: (r) => <AppText variant="bodyMedium">{r.v.rating ? `★ ${r.v.rating}` : 'New'}</AppText> },
          ]}
        />
      </Panel>
    </Page>
  );
}
