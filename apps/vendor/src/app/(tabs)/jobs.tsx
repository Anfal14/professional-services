import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { bySchedule, isActive, toISODate, useDb, type Booking } from '@profecian/shared';
import { Card, ChipGroup, EmptyState, spacing } from '@profecian/ui';
import { useVendor } from '@/backend';
import { JobCard } from '@/components/JobCard';
import { VendorScreen } from '@/components/VendorScreen';

type Filter = 'new' | 'today' | 'upcoming' | 'completed' | 'cancelled';

export default function Jobs() {
  const vendor = useVendor()!;
  const db = useDb();
  const today = toISODate(new Date());
  const mine = useMemo(() => db.bookings.filter((b) => b.vendorId === vendor.id), [db.bookings, vendor.id]);
  const groups: Record<Filter, Booking[]> = {
    new: mine.filter((b) => b.status === 'assigned'),
    today: mine.filter((b) => b.date === today && isActive(b.status) && b.status !== 'assigned'),
    upcoming: mine.filter((b) => b.date > today && isActive(b.status) && b.status !== 'assigned'),
    completed: mine.filter((b) => b.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)),
    cancelled: mine.filter((b) => b.status === 'cancelled'),
  };
  const [filter, setFilter] = useState<Filter>(groups.new.length ? 'new' : 'today');
  const list = filter === 'completed' || filter === 'cancelled' ? groups[filter] : [...groups[filter]].sort(bySchedule);

  return (
    <VendorScreen title="My jobs" subtitle={`${mine.filter((b) => isActive(b.status)).length} open`}>
      <ChipGroup<Filter>
        value={filter}
        onChange={setFilter}
        options={(['new', 'today', 'upcoming', 'completed', 'cancelled'] as Filter[]).map((f) => ({ value: f, label: `${f[0].toUpperCase()}${f.slice(1)} (${groups[f].length})` }))}
      />
      {list.length ? (
        <View style={{ gap: spacing.md }}>{list.map((j) => <JobCard key={j.id} job={j} />)}</View>
      ) : (
        <Card><EmptyState icon="briefcase-outline" title="No jobs here" message="Jobs assigned to you by the Profecian team show up in these lists." /></Card>
      )}
    </VendorScreen>
  );
}
