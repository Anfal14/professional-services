import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { timeAgo, useBackend, useDb } from '@profecian/shared';
import { Badge, Button as UiButton, Card } from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { useCustomer } from '@/backend';
import type { IconName } from '@/data/services';
import { colors, spacing } from '@/theme';

const ICON: Record<string, IconName> = {
  booking_confirmed: 'checkmark-circle-outline',
  vendor_assigned: 'person-outline',
  vendor_on_the_way: 'navigate-outline',
  service_completed: 'checkmark-done-outline',
  payment_received: 'card-outline',
  booking_cancelled: 'close-circle-outline',
  booking_rescheduled: 'calendar-outline',
};

/** Booking updates sent to the customer (WhatsApp + push, mirrored in-app). */
export default function Notifications() {
  const customer = useCustomer();
  const db = useDb();
  const backend = useBackend();
  if (!customer) return <Redirect href={{ pathname: '/login', params: { next: '/notifications' } }} />;
  const items = db.notifications.filter((n) => n.audience === 'customer' && n.recipientId === customer.id);
  const unread = items.some((n) => !n.read);

  return (
    <Screen back title="Notifications" pageTitle="Notifications">
      <Container style={styles.page}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <AppText variant="h1">Notifications</AppText>
            <AppText variant="body" color={colors.muted}>Booking updates you also receive on WhatsApp.</AppText>
          </View>
          {unread ? <UiButton label="Mark all read" size="sm" variant="outline" onPress={() => backend.customer.markNotificationsRead(customer.id)} /> : null}
        </View>
        {items.length === 0 ? (
          <EmptyState icon="notifications-outline" title="No updates yet" message="Book a service and we'll keep you posted here and on WhatsApp." actionLabel="Book a service" onAction={() => router.push('/services')} />
        ) : (
          <Card padded={false}>
            {items.map((n, i) => (
              <Pressable
                key={n.id}
                onPress={() => {
                  backend.customer.markNotificationsRead(customer.id, [n.id]);
                  if (n.bookingId) router.push(`/booking/${n.bookingId}`);
                }}
                style={[styles.item, i > 0 && styles.itemBorder, !n.read && { backgroundColor: '#FBF9FF' }]}
              >
                <View style={styles.icon}>
                  <Ionicons name={ICON[n.kind] ?? 'notifications-outline'} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="label" style={{ flex: 1 }}>{n.title}</AppText>
                    <AppText variant="tiny">{timeAgo(n.createdAt)}</AppText>
                  </View>
                  <AppText variant="small" color={colors.text}>{n.body}</AppText>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {n.channels.map((c) => (
                      <Badge key={c} label={c === 'whatsapp' ? 'WhatsApp' : c === 'push' ? 'Push' : c.toUpperCase()} tone={c === 'whatsapp' ? 'success' : 'neutral'} />
                    ))}
                    {n.whatsappUrl ? (
                      <UiButton label="Open in WhatsApp" size="sm" variant="ghost" icon="logo-whatsapp" onPress={() => n.whatsappUrl && Linking.openURL(n.whatsappUrl)} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))}
          </Card>
        )}
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: spacing.xxl, gap: spacing.xl, maxWidth: 760 },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, flexWrap: 'wrap' },
  item: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
