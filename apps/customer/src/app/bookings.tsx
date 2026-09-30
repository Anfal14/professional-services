import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { bookingProblemLabel, bySchedule, isActive, PAYMENT_STATUS, useDb, type Booking } from '@profecian/shared';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { Grid } from '@/components/Grid';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { useCustomer } from '@/backend';
import { useBookings } from '@/context/BookingsContext';
import { useCatalog } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing, createStyles } from '@/theme';
import { formatAddress, formatDate, formatPrice } from '@/utils/format';

type Filter = 'upcoming' | 'history' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
  { key: 'cancelled', label: 'Cancelled' },
];

const matches: Record<Filter, (b: Booking) => boolean> = {
  upcoming: (b) => isActive(b.status),
  history: (b) => b.status === 'completed',
  cancelled: (b) => b.status === 'cancelled',
};

export default function BookingsScreen() {
  const customer = useCustomer();
  const { bookings } = useBookings();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const { isMobile, select } = useResponsive();

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, bookings.filter(matches[f.key]).length])) as Record<Filter, number>,
    [bookings],
  );
  const visible = useMemo(() => {
    const list = bookings.filter(matches[filter]);
    // Upcoming: soonest first. History/cancelled: most recent first.
    return filter === 'upcoming' ? [...list].sort(bySchedule) : [...list].sort((a, b) => bySchedule(b, a));
  }, [bookings, filter]);

  if (!customer) return <Redirect href={{ pathname: '/login', params: { next: '/bookings' } }} />;

  return (
    <Screen pageTitle="My Bookings">
      <Container style={styles.page}>
        <FadeIn style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant={isMobile ? 'h1' : 'display'} accessibilityRole="header">
              My Bookings
            </AppText>
            <AppText variant="body" color={colors.muted}>
              Track live status, pay, reschedule or rate your professional.
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

        {visible.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={bookings.length === 0 ? 'No bookings yet' : 'Nothing here'}
            message={bookings.length === 0 ? 'Your service bookings will appear here. Book a verified professional in under a minute.' : 'No bookings in this list.'}
            actionLabel={bookings.length === 0 || filter === 'upcoming' ? 'Book a service' : undefined}
            onAction={bookings.length === 0 || filter === 'upcoming' ? () => router.push('/services') : undefined}
          />
        ) : (
          <Grid columns={select({ mobile: 1, tablet: 2 })} gap={16}>
            {visible.map((booking, i) => (
              <FadeIn key={booking.id} delay={50 * i}>
                <BookingCard booking={booking} />
              </FadeIn>
            ))}
          </Grid>
        )}
      </Container>
    </Screen>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const { getService } = useCatalog();
  const db = useDb();
  const service = getService(booking.categoryId);
  const problemLabel = bookingProblemLabel(db, booking);
  const vendor = booking.vendorId ? db.vendors.find((v) => v.id === booking.vendorId) : undefined;
  const pay = PAYMENT_STATUS[booking.payment.status];
  const needsPayment = booking.status === 'completed' && booking.payment.status !== 'paid';
  const needsReview = booking.status === 'completed' && !booking.reviewId;

  return (
    <PressableScale onPress={() => router.push(`/booking/${booking.id}`)} hoverLift style={[styles.card, booking.status === 'cancelled' && styles.cardMuted]} accessibilityRole="button" accessibilityLabel={`${service?.name ?? 'Booking'} ${booking.code}`}>
      <View style={styles.cardTop}>
        {service ? <Image source={service.image} style={styles.thumb} contentFit="cover" transition={200} /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.titleRow}>
            <AppText variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
              {service?.name ?? 'Service'}
            </AppText>
            <StatusBadge status={booking.status} />
          </View>
          <AppText variant="small" numberOfLines={1}>{problemLabel}</AppText>
          <AppText style={styles.id}>#{booking.code}</AppText>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Info icon="calendar-outline" text={formatDate(booking.date)} />
        <Info icon="time-outline" text={booking.slot} />
        {vendor ? <Info icon="person-outline" text={vendor.name} /> : null}
      </View>
      <Info icon="location-outline" text={formatAddress(booking.address.line, booking.address.landmark)} />

      <View style={styles.footer}>
        <View>
          <AppText style={styles.price}>{formatPrice(booking.price.total)}</AppText>
          <AppText variant="tiny" color={colors.muted}>{booking.status === 'cancelled' ? 'Not charged' : `Inc. GST · ${pay.label}`}</AppText>
        </View>
        <View style={styles.cta}>
          <AppText variant="label" color={needsPayment ? colors.danger : colors.primary}>
            {needsPayment ? 'Pay now' : needsReview ? 'Rate service' : isActive(booking.status) ? 'Track' : 'Details'}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={needsPayment ? colors.danger : colors.primary} />
        </View>
      </View>
    </PressableScale>
  );
}

function Info({ icon, text }: { icon: 'calendar-outline' | 'time-outline' | 'location-outline' | 'person-outline'; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <AppText variant="small" color={colors.text} numberOfLines={2} style={{ flexShrink: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = createStyles(() => ({
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
  filterTextActive: { color: colors.inverse },
  count: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  countActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  countText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  countTextActive: { color: colors.inverse },
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
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
}));
