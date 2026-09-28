import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { bySchedule, formatINR, isActive, toISODate, useBackend, useDb } from '@profecian/shared';
import { AppText, Banner, Card, colors, EmptyState, IconButton, SectionTitle, spacing, StatCard, Toggle } from '@profecian/ui';
import { useVendor } from '@/backend';
import { JobCard } from '@/components/JobCard';
import { VendorScreen } from '@/components/VendorScreen';

export default function Dashboard() {
  const vendor = useVendor()!;
  const db = useDb();
  const backend = useBackend();
  const today = toISODate(new Date());
  const mine = useMemo(() => db.bookings.filter((b) => b.vendorId === vendor.id), [db.bookings, vendor.id]);
  const newJobs = mine.filter((b) => b.status === 'assigned');
  const todays = mine.filter((b) => b.date === today && isActive(b.status) && b.status !== 'assigned').sort(bySchedule);
  const upcoming = mine.filter((b) => b.date > today && isActive(b.status) && b.status !== 'assigned').sort(bySchedule);
  const wallet = backend.wallet(vendor.id);
  const unread = db.notifications.filter((n) => n.audience === 'vendor' && n.recipientId === vendor.id && !n.read).length;
  const hour = new Date().getHours();

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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatCard label="Today's jobs" value={String(todays.length)} icon="today-outline" style={{ minWidth: 140 }} />
        <StatCard label="Upcoming" value={String(upcoming.length)} icon="calendar-outline" tone="info" style={{ minWidth: 140 }} />
        <StatCard label="Net earnings" value={formatINR(wallet.netEarnings)} icon="wallet-outline" tone="success" style={{ minWidth: 140 }} />
        <StatCard label="Completed" value={String(wallet.completedJobs)} icon="checkmark-done-outline" tone="success" style={{ minWidth: 140 }} />
        <StatCard label="Rating" value={vendor.rating ? `★ ${vendor.rating}` : 'New'} icon="star-outline" tone="warning" hint={`${vendor.ratingCount} reviews`} style={{ minWidth: 140 }} />
      </View>

      {newJobs.length ? (
        <View>
          <SectionTitle title={`New assignments (${newJobs.length})`} action="All jobs" onAction={() => router.push('/jobs')} />
          <Banner tone="warning" icon="flash-outline" title="Accept new jobs quickly" message="Unaccepted jobs may be reassigned to another professional." />
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>{newJobs.map((j) => <JobCard key={j.id} job={j} />)}</View>
        </View>
      ) : null}

      <View>
        <SectionTitle title="Today's schedule" />
        {todays.length ? <View style={{ gap: spacing.md }}>{todays.map((j) => <JobCard key={j.id} job={j} />)}</View> : (
          <Card><EmptyState icon="cafe-outline" title="No jobs today" message={vendor.available ? 'New assignments will appear here.' : 'Go online to start receiving jobs.'} /></Card>
        )}
      </View>

      {upcoming.length ? (
        <View>
          <SectionTitle title="Upcoming" action="See all" onAction={() => router.push('/jobs')} />
          <View style={{ gap: spacing.md }}>{upcoming.slice(0, 3).map((j) => <JobCard key={j.id} job={j} />)}</View>
        </View>
      ) : null}
    </VendorScreen>
  );
}
