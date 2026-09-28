import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { BOOKING_STATUS, formatDate, formatINR, toISODate, useDb, type Booking } from '@profecian/shared';
import { AppText, asIcon, Badge, Card, colors, radius, spacing } from '@profecian/ui';

export function JobCard({ job }: { job: Booking }) {
  const db = useDb();
  const category = db.categories.find((c) => c.id === job.categoryId);
  const problem = db.problemTypes.find((p) => p.id === job.problemTypeId);
  // "Professional assigned" is customer wording; to the vendor it's a new job.
  const s = job.status === 'assigned' ? { label: 'New job', tone: 'warning' as const } : BOOKING_STATUS[job.status];
  const today = job.date === toISODate(new Date());
  return (
    <Card onPress={() => router.push(`/job/${job.id}`)} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: category?.tint ?? colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={asIcon(category?.icon ?? 'construct-outline')} size={22} color={colors.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label" numberOfLines={1}>{problem?.name ?? category?.name}</AppText>
          <AppText variant="small" numberOfLines={1}>{category?.name} · {job.code}</AppText>
        </View>
        <Badge label={s.label} tone={s.tone} />
      </View>
      <View style={{ gap: 6 }}>
        <Line icon="time-outline" text={`${today ? 'Today' : formatDate(job.date)}, ${job.slot}`} strong={today} />
        <Line icon="person-outline" text={job.customerName} />
        <Line icon="location-outline" text={`${job.address.line}, ${job.address.city}`} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
        <AppText variant="small">You earn</AppText>
        <AppText variant="h3" color={colors.success}>{formatINR(job.price.vendorPayout)}</AppText>
      </View>
    </Card>
  );
}

function Line({ icon, text, strong }: { icon: 'time-outline' | 'person-outline' | 'location-outline'; text: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Ionicons name={icon} size={15} color={strong ? colors.primary : colors.muted} />
      <AppText variant={strong ? 'label' : 'small'} color={strong ? colors.primary : colors.text} numberOfLines={1} style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}
