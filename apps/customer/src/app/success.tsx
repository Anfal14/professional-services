import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { Screen } from '@/components/Screen';
import { useBookings } from '@/context/BookingsContext';
import { bookingProblemLabel, formatPhone, useDb } from '@profecian/shared';
import { useCatalog } from '@/data/services';
import { colors, fonts, radius, shadows, spacing, createStyles } from '@/theme';
import { formatAddress, formatDate, formatPrice } from '@/utils/format';

const useNativeDriver = Platform.OS !== 'web';

function SuccessCheck() {
  const [scale] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver, speed: 8, bounciness: 14 }).start();
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver }),
      { iterations: 4 },
    );
    loop.start();
    return () => loop.stop();
  }, [scale, ring]);

  return (
    <View style={styles.checkWrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.check, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={46} color={colors.white} />
      </Animated.View>
    </View>
  );
}

export default function SuccessScreen() {
  const { id, more } = useLocalSearchParams<{ id: string; more?: string }>();
  const { getBooking, loading } = useBookings();
  const db = useDb();
  const { getService } = useCatalog();
  const booking = getBooking(id);

  if (!booking) {
    return (
      <Screen pageTitle="Booking">
        {!loading && (
          <EmptyState
            icon="receipt-outline"
            title="Booking not found"
            message="We couldn’t find this booking. You can view all your bookings instead."
            actionLabel="My Bookings"
            onAction={() => router.replace('/bookings')}
          />
        )}
      </Screen>
    );
  }

  const service = getService(booking.categoryId);
  const issueTitle = bookingProblemLabel(db, booking);
  // Other visits placed from the same cart checkout (one booking per service).
  const extra = (more ?? '').split(',').map((x) => getBooking(x)).filter((b): b is NonNullable<typeof b> => !!b);

  const details: { icon: 'construct-outline' | 'calendar-outline' | 'time-outline' | 'location-outline' | 'call-outline'; label: string; value: string }[] = [
    { icon: 'construct-outline', label: 'Service', value: `${service?.name ?? ''} · ${issueTitle}` },
    { icon: 'calendar-outline', label: 'Date', value: formatDate(booking.date) },
    { icon: 'time-outline', label: 'Time', value: booking.slot },
    { icon: 'location-outline', label: 'Address', value: `${formatAddress(booking.address.line, booking.address.landmark)}, ${booking.address.city}` },
    { icon: 'call-outline', label: 'Contact', value: formatPhone(booking.customerPhone) },
  ];

  return (
    <Screen pageTitle="Booking Confirmed">
      <Container style={styles.page}>
        <View style={styles.top}>
          <SuccessCheck />
          <FadeIn delay={250} style={{ alignItems: 'center', gap: 6 }}>
            <AppText variant="h1" align="center" accessibilityRole="header">
              {extra.length ? `${extra.length + 1} Bookings Confirmed!` : 'Booking Confirmed!'}
            </AppText>
            <AppText variant="body" color={colors.muted} align="center" style={{ maxWidth: 440 }}>
              Thanks, {booking.customerName.split(' ')[0]}! We’re assigning a verified professional — you’ll get updates by SMS and WhatsApp.
            </AppText>
            <View style={styles.idPill}>
              <AppText style={styles.idLabel}>Booking ID</AppText>
              <AppText style={styles.idValue} selectable>
                {booking.code}
              </AppText>
            </View>
            {extra.length ? (
              <View style={styles.extra}>
                {extra.map((b) => (
                  <Button
                    key={b.id}
                    label={`${getService(b.categoryId)?.name ?? 'Service'} · ${b.code}`}
                    icon="navigate-outline"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.replace(`/booking/${b.id}`)}
                  />
                ))}
              </View>
            ) : null}
          </FadeIn>
        </View>

        <View style={styles.grid}>
          <FadeIn delay={350} style={styles.card}>
            <AppText variant="h3">Booking details</AppText>
            {details.map((d) => (
              <View key={d.label} style={styles.detail}>
                <View style={styles.detailIcon}>
                  <Ionicons name={d.icon} size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="small">{d.label}</AppText>
                  <AppText variant="bodyMedium">{d.value}</AppText>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}>
              <AppText variant="label">Estimated total (Inc. GST)</AppText>
              <AppText style={styles.total}>{formatPrice(booking.price.total)}</AppText>
            </View>
          </FadeIn>

        </View>

        <View style={styles.actions}>
          <Button label="Track booking" icon="navigate-outline" variant="dark" onPress={() => router.replace(`/booking/${booking.id}`)} />
          <Button label="View My Bookings" icon="calendar" variant="outline" onPress={() => router.replace('/bookings')} />
          <Button label="Back to Home" icon="home-outline" variant="outline" onPress={() => router.replace('/')} />
        </View>
      </Container>
    </Screen>
  );
}

const styles = createStyles(() => ({
  extra: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  page: { paddingTop: spacing.xxxl, maxWidth: 640 },
  top: { alignItems: 'center', gap: spacing.xl, marginBottom: spacing.xxxl },
  checkWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.success },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  idLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  idValue: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.primary, letterSpacing: 0.5 },
  grid: { gap: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  detail: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  detailIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xxxl },
}));
