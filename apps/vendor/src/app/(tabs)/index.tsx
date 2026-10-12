import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { toISODate, useBackend, useDb, type Booking } from '@profecian/shared';
import { AppText, Banner, Card, colors, EmptyState, IconButton, SectionTitle, spacing, StatCard, Toggle } from '@profecian/ui';
import { useVendor } from '@/backend';
import { JobCard } from '@/components/JobCard';
import { VendorScreen } from '@/components/VendorScreen';
import { groupJobs, type JobFilter } from '@/jobGroups';

/** How many upcoming jobs the home screen lists before "See all". */
const UPCOMING_SHOWN = 3;

export default function Dashboard() {
  const vendor = useVendor()!;
  const db = useDb();
  const backend = useBackend();
  const today = toISODate(new Date());
  const mine = useMemo(() => db.bookings.filter((b) => b.vendorId === vendor.id), [db.bookings, vendor.id]);
  const jobs = useMemo(() => groupJobs(mine, today), [mine, today]);
  const unread = db.notifications.filter((n) => n.audience === 'vendor' && n.recipientId === vendor.id && !n.read).length;
  const hour = new Date().getHours();
  const open = (filter: JobFilter) => () => router.push({ pathname: '/jobs', params: { filter } });
  const nothingOpen = !jobs.in_progress.length && !jobs.upcoming.length && !jobs.new.length;

  return (
    <VendorScreen
      title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${vendor.name.split(' ')[0]}`}
      subtitle={vendor.available ? 'You are online and receiving jobs' : 'You are offline'}
      right={<IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: vendor.available ? colors.success : colors.border }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: vendor.available ? colors.success : colors.subtle }} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">{vendor.available ? 'Available for jobs' : 'Not available'}</AppText>
          <AppText variant="small">Working hours {vendor.workingHours.start}–{vendor.workingHours.end}</AppText>
        </View>
        <Toggle label="Availability" value={vendor.available} onChange={(v) => backend.vendor.updateProfile(vendor.id, { available: v })} />
      </Card>

      {/* Each card opens the list it counts. Earnings live on the Earnings tab. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Today's jobs" value={String(jobs.today.length)} icon="today-outline" style={{ minWidth: 140 }} onPress={open('today')} />
        <StatCard label="Upcoming" value={String(jobs.upcoming.length)} icon="calendar-outline" tone="info" style={{ minWidth: 140 }} onPress={open('upcoming')} />
        <StatCard label="Completed" value={String(jobs.completed.length)} icon="checkmark-done-outline" tone="success" style={{ minWidth: 140 }} onPress={open('completed')} />
        <StatCard label="Rating" value={vendor.rating ? `★ ${vendor.rating}` : 'New'} icon="star-outline" tone="warning" hint={`${vendor.ratingCount} reviews`} style={{ minWidth: 140 }} onPress={() => router.push('/reviews')} />
      </View>

      {jobs.in_progress.length ? (
        <Section title={`In progress (${jobs.in_progress.length})`} jobs={jobs.in_progress} />
      ) : null}

      {jobs.upcoming.length ? (
        <Section
          title={`Upcoming (${jobs.upcoming.length})`}
          jobs={jobs.upcoming.slice(0, UPCOMING_SHOWN)}
          action={jobs.upcoming.length > UPCOMING_SHOWN ? 'See all' : undefined}
          onAction={open('upcoming')}
        />
      ) : null}

      {jobs.new.length ? (
        <Section title={`Assigned (${jobs.new.length})`} jobs={jobs.new}>
          <Banner tone="warning" icon="flash-outline" title="Accept new jobs quickly" message="Unaccepted jobs may be reassigned to another professional." />
        </Section>
      ) : null}

      {nothingOpen ? (
        <Card><EmptyState icon="cafe-outline" title="No open jobs" message={vendor.available ? 'New assignments will appear here.' : 'Go online to start receiving jobs.'} /></Card>
      ) : null}
    </VendorScreen>
  );
}

function Section({ title, jobs, action, onAction, children }: { title: string; jobs: Booking[]; action?: string; onAction?: () => void; children?: ReactNode }) {
  return (
    <View>
      <SectionTitle title={title} action={action} onAction={onAction} />
      <View style={{ gap: spacing.md }}>
        {children}
        {jobs.map((j) => <JobCard key={j.id} job={j} />)}
      </View>
    </View>
  );
}
