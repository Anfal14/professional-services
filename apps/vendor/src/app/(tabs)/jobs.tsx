import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isActive, toISODate, useDb } from '@profecian/shared';
import { Card, ChipGroup, EmptyState, spacing } from '@profecian/ui';
import { useVendor } from '@/backend';
import { JobCard } from '@/components/JobCard';
import { VendorScreen } from '@/components/VendorScreen';
import { groupJobs, JOB_FILTER_LABEL, JOB_FILTERS, type JobFilter } from '@/jobGroups';

const EMPTY: Record<JobFilter, string> = {
  in_progress: 'Jobs you are travelling to or working on show up here.',
  upcoming: 'Jobs you have accepted and not started yet show up here.',
  new: 'New jobs assigned to you by the Profecian team show up here.',
  today: 'Nothing is scheduled for today.',
  completed: 'Jobs you finish show up here.',
  cancelled: 'Cancelled jobs show up here.',
};

export default function Jobs() {
  const vendor = useVendor()!;
  const db = useDb();
  // The home screen's cards open a particular list, e.g. /jobs?filter=completed.
  const params = useLocalSearchParams<{ filter?: string }>();
  const today = toISODate(new Date());
  const mine = useMemo(() => db.bookings.filter((b) => b.vendorId === vendor.id), [db.bookings, vendor.id]);
  const groups = useMemo(() => groupJobs(mine, today), [mine, today]);
  const requested = JOB_FILTERS.find((f) => f === params.filter);
  // Otherwise start on what needs attention first: work underway, then new jobs, then upcoming.
  const first = groups.in_progress.length ? 'in_progress' : groups.new.length ? 'new' : 'upcoming';
  const [picked, setPicked] = useState<{ filter: JobFilter; from?: string } | null>(null);
  // A choice made on this screen wins until the home screen asks for a different list.
  const filter = picked && picked.from === params.filter ? picked.filter : requested ?? first;
  const list = groups[filter];

  return (
    <VendorScreen title="My jobs" subtitle={`${mine.filter((b) => isActive(b.status)).length} open`}>
      <ChipGroup<JobFilter>
        value={filter}
        onChange={(f) => setPicked({ filter: f, from: params.filter })}
        options={JOB_FILTERS.map((f) => ({ value: f, label: `${JOB_FILTER_LABEL[f]} (${groups[f].length})` }))}
      />
      {list.length ? (
        <View style={{ gap: spacing.md }}>{list.map((j) => <JobCard key={j.id} job={j} />)}</View>
      ) : (
        <Card><EmptyState icon="briefcase-outline" title="No jobs here" message={EMPTY[filter]} /></Card>
      )}
    </VendorScreen>
  );
}
