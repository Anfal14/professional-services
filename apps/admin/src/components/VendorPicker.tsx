import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { suggestVendors, useAction, useBackend, useDb, type Booking } from '@profecian/shared';
import { AppText, Avatar, Badge, Banner, Button, ChipGroup, colors, spacing, Stars } from '@profecian/ui';

type Filter = 'match' | 'available' | 'all';

/**
 * Ranked vendor suggestions for a booking: nearest first, penalising
 * workload on the booking date, unavailable vendors and non-matching services.
 */
export function VendorPicker({ booking, onDone, limit = 6 }: { booking: Booking; onDone?: () => void; limit?: number }) {
  const db = useDb();
  const backend = useBackend();
  const [filter, setFilter] = useState<Filter>('match');
  const assign = useAction(backend.admin.assignVendor);
  const all = useMemo(() => suggestVendors(db, booking), [db, booking]);
  const list = all.filter((s) => (filter === 'all' ? true : filter === 'available' ? s.available && s.matchesService : s.matchesService)).slice(0, limit);
  const category = db.categories.find((c) => c.id === booking.categoryId);

  return (
    <View style={{ gap: spacing.md }}>
      <ChipGroup<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'match', label: `Offers ${category?.name ?? 'service'}` },
          { value: 'available', label: 'Available now' },
          { value: 'all', label: 'All approved' },
        ]}
      />
      {assign.error ? <Banner tone="danger" icon="alert-circle" title={assign.error} /> : null}
      {list.length === 0 ? <AppText variant="small">No approved vendors match this filter in range.</AppText> : null}
      {list.map((s, i) => {
        const current = booking.vendorId === s.vendor.id;
        return (
          <View key={s.vendor.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Avatar name={s.vendor.name} size={38} tone={i === 0 && !current ? 'success' : 'primary'} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <AppText variant="label">{s.vendor.name}</AppText>
                {i === 0 && !current ? <Badge label="Best match" tone="success" icon="sparkles-outline" /> : null}
                {current ? <Badge label="Assigned" tone="primary" /> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <AppText variant="small">{s.distanceKm} km</AppText>
                <AppText variant="small">· {s.workload} job{s.workload === 1 ? '' : 's'} that day</AppText>
                {s.vendor.ratingCount ? <Stars value={s.vendor.rating} size={11} count={s.vendor.ratingCount} /> : <AppText variant="small">· New</AppText>}
                {!s.available ? <Badge label="Offline" tone="neutral" /> : null}
                {!s.matchesService ? <Badge label="Different service" tone="warning" /> : null}
              </View>
            </View>
            <Button
              label={current ? 'Current' : booking.vendorId ? 'Reassign' : 'Assign'}
              size="sm"
              variant={i === 0 && !current ? 'primary' : 'outline'}
              disabled={current}
              loading={assign.pending}
              onPress={async () => {
                const ok = await assign.run(booking.id, s.vendor.id);
                if (ok) onDone?.();
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
