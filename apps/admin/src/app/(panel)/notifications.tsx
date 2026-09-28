import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { timeAgo, useBackend, useDb } from '@profecian/shared';
import { AppText, Badge, Button, colors, EmptyState, spacing, type WebPressableState } from '@profecian/ui';
import { Page, Panel } from '@/components/admin';

const KIND_TONE = { new_booking: 'info', vendor_pending_approval: 'warning', payment_failed: 'danger', new_complaint: 'danger' } as const;

export default function Notifications() {
  const db = useDb();
  const backend = useBackend();
  const items = db.notifications.filter((n) => n.audience === 'admin');
  const unread = items.filter((n) => !n.read).length;

  return (
    <Page
      title="Notifications"
      subtitle="New bookings, vendor applications, failed payments and complaints."
      actions={unread ? <Button label="Mark all read" size="sm" variant="outline" onPress={() => backend.admin.markNotificationsRead('admin')} /> : null}
    >
      <Panel>
        {items.length === 0 ? <EmptyState icon="notifications-off-outline" title="All caught up" message="New activity will show up here." /> : null}
        {items.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => {
              backend.admin.markNotificationsRead('admin', [n.id]);
              if (n.bookingId) router.navigate(`/bookings/${n.bookingId}`);
              else if (n.kind === 'vendor_pending_approval') router.navigate('/vendors');
            }}
            style={({ hovered }: WebPressableState) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 10 }, hovered && { backgroundColor: colors.surfaceAlt }]}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? 'transparent' : colors.primary }} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <AppText variant="label">{n.title}</AppText>
                <Badge label={n.kind.replace(/_/g, ' ')} tone={KIND_TONE[n.kind as keyof typeof KIND_TONE] ?? 'neutral'} />
              </View>
              <AppText variant="small">{n.body}</AppText>
            </View>
            <AppText variant="tiny">{timeAgo(n.createdAt)}</AppText>
          </Pressable>
        ))}
      </Panel>
    </Page>
  );
}
