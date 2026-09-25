import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { Grid } from '@/components/Grid';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { effectiveStatus, useBookings } from '@/context/BookingsContext';
import { getIssueTitle, getService } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import type { Booking, BookingStatus } from '@/types';
import { confirmAction } from '@/utils/confirm';
import { formatAddress, formatDate, formatPrice, scheduledAt } from '@/utils/format';
import { buildAcknowledgement, openWhatsApp } from '@/utils/whatsapp';

type Filter = 'all' | 'upcoming' | 'completed' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const UPCOMING: BookingStatus[] = ['pending', 'confirmed', 'in_progress'];

function matches(filter: Filter, status: BookingStatus): boolean {
  if (filter === 'all') return true;
  if (filter === 'upcoming') return UPCOMING.includes(status);
  return status === filter;
}

export default function BookingsScreen() {
  const { bookings, loading, cancelBooking } = useBookings();
  const [filter, setFilter] = useState<Filter>('all');
  const { isMobile, select } = useResponsive();

  const withStatus = useMemo(() => {
    const now = new Date();
    return bookings
      .map((b) => ({ booking: b, status: effectiveStatus(b, now) }))
      .sort((a, b) => {
        // Upcoming first (soonest first), then everything else newest first.
        const aUp = UPCOMING.includes(a.status);
        const bUp = UPCOMING.includes(b.status);
        if (aUp !== bUp) return aUp ? -1 : 1;
        const at = scheduledAt(a.booking.date, a.booking.time).getTime();
        const bt = scheduledAt(b.booking.date, b.booking.time).getTime();
        return aUp ? at - bt : bt - at;
      });
  }, [bookings]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, withStatus.filter((x) => matches(f.key, x.status)).length])) as Record<Filter, number>,
    [withStatus],
  );
  const visible = withStatus.filter((x) => matches(filter, x.status));

  const onCancel = async (b: Booking) => {
    const ok = await confirmAction('Cancel booking?', `Booking ${b.id} on ${formatDate(b.date)} at ${b.time} will be cancelled.`, 'Cancel booking');
    if (ok) await cancelBooking(b.id);
  };

  return (
    <Screen pageTitle="My Bookings">
      <Container style={styles.page}>
        <FadeIn style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant={isMobile ? 'h1' : 'display'} accessibilityRole="header">
              My Bookings
            </AppText>
            <AppText variant="body" color={colors.muted}>
              Track, manage and get help with your service requests.
            </AppText>
          </View>
          {!isMobile && <Button label="New booking" icon="add" onPress={() => router.push('/services')} />}
        </FadeIn>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="tablist">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filter, active && styles.filterActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <AppText style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</AppText>
                <View style={[styles.count, active && styles.countActive]}>
                  <AppText style={[styles.countText, active && styles.countTextActive]}>{counts[f.key]}</AppText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.huge }} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={bookings.length === 0 ? 'No bookings yet' : 'Nothing here'}
            message={
              bookings.length === 0
                ? 'Your service bookings will appear here. Book a verified professional in under a minute.'
                : 'No bookings match this filter.'
            }
            actionLabel={bookings.length === 0 ? 'Book a service' : undefined}
            onAction={bookings.length === 0 ? () => router.push('/services') : undefined}
          />
        ) : (
          <Grid columns={select({ mobile: 1, tablet: 2 })} gap={16}>
            {visible.map(({ booking, status }, i) => (
              <FadeIn key={booking.id} delay={50 * i}>
                <BookingCard booking={booking} status={status} onCancel={() => onCancel(booking)} />
              </FadeIn>
            ))}
          </Grid>
        )}
      </Container>
    </Screen>
  );
}

function BookingCard({ booking, status, onCancel }: { booking: Booking; status: BookingStatus; onCancel: () => void }) {
  const service = getService(booking.serviceId);
  const canCancel = status === 'confirmed' || status === 'pending';

  return (
    <View style={[styles.card, status === 'cancelled' && styles.cardMuted]}>
      <View style={styles.cardTop}>
        {service ? <Image source={service.image} style={styles.thumb} contentFit="cover" transition={200} /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.titleRow}>
            <AppText variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
              {service?.name ?? 'Service'}
            </AppText>
            <StatusBadge status={status} />
          </View>
          <AppText variant="small" numberOfLines={1}>
            {service ? getIssueTitle(service, booking.issueId) : booking.issueId}
          </AppText>
          <AppText style={styles.id}>#{booking.id}</AppText>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Info icon="calendar-outline" text={formatDate(booking.date)} />
        <Info icon="time-outline" text={booking.time} />
      </View>
      <Info icon="location-outline" text={formatAddress(booking.address, booking.landmark)} />

      <View style={styles.footer}>
        <AppText style={styles.price}>{formatPrice(booking.price)}</AppText>
        <View style={styles.actions}>
          {canCancel && <Button label="Cancel" size="sm" variant="outline" onPress={onCancel} />}
          <Button
            label="Help"
            size="sm"
            variant="secondary"
            icon="logo-whatsapp"
            onPress={() => openWhatsApp(`Hi QuickJob, I need help with my booking.\n\n${buildAcknowledgement(booking)}`)}
          />
        </View>
      </View>
    </View>
  );
}

function Info({ icon, text }: { icon: 'calendar-outline' | 'time-outline' | 'location-outline'; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <AppText variant="small" color={colors.text} numberOfLines={2} style={{ flexShrink: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg, marginBottom: spacing.xxl },
  filters: { gap: 8, paddingBottom: spacing.xl },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 8,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  filterTextActive: { color: colors.white },
  count: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  countActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  countText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  countTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardMuted: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  id: { fontFamily: fonts.semibold, fontSize: 12, color: colors.subtle, letterSpacing: 0.4 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  price: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  actions: { flexDirection: 'row', gap: 8 },
});
