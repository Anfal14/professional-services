import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { timeAgo, useBackend, useDb } from '@profecian/shared';
import { AppText, Button, Card, colors, EmptyState, spacing, type IconName } from '@profecian/ui';
import { useVendor } from '@/backend';
import { VendorScreen } from '@/components/VendorScreen';

const ICON: Record<string, IconName> = {
  new_assignment: 'briefcase-outline',
  job_reminder: 'alarm-outline',
  payout_credited: 'wallet-outline',
  booking_cancelled: 'close-circle-outline',
  booking_rescheduled: 'calendar-outline',
};

export default function Notifications() {
  const vendor = useVendor()!;
  const db = useDb();
  const backend = useBackend();
  const items = db.notifications.filter((n) => n.audience === 'vendor' && n.recipientId === vendor.id);
  return (
    <VendorScreen title="Notifications" back right={items.some((n) => !n.read) ? <Button label="Mark read" size="sm" variant="ghost" onPress={() => backend.vendor.markNotificationsRead(vendor.id)} /> : null}>
      {items.length === 0 ? <Card><EmptyState icon="notifications-outline" title="No notifications yet" message="New job assignments, reminders and payout updates show up here." /></Card> : null}
      <Card padded={false}>
        {items.map((n, i) => (
          <Pressable key={n.id} onPress={() => { backend.vendor.markNotificationsRead(vendor.id, [n.id]); if (n.bookingId) router.push(`/job/${n.bookingId}`); }}
            style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, backgroundColor: n.read ? colors.surface : colors.selectedBg }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={ICON[n.kind] ?? 'notifications-outline'} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{n.title}</AppText>
              <AppText variant="small">{n.body}</AppText>
              <AppText variant="tiny">{timeAgo(n.createdAt)} · {n.channels.join(', ')}</AppText>
            </View>
          </Pressable>
        ))}
      </Card>
    </VendorScreen>
  );
}
