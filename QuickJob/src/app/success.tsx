import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { Screen } from '@/components/Screen';
import { WhatsAppPreview } from '@/components/WhatsAppPreview';
import { useBookings } from '@/context/BookingsContext';
import { getIssueTitle, getService } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import { formatAddress, formatDate, formatPrice } from '@/utils/format';
import { buildAcknowledgement, openWhatsApp } from '@/utils/whatsapp';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBooking, loading } = useBookings();
  const { isDesktop } = useResponsive();
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

  const service = getService(booking.serviceId);
  const message = buildAcknowledgement(booking);
  const time = new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const details: { icon: 'construct-outline' | 'calendar-outline' | 'time-outline' | 'location-outline' | 'call-outline'; label: string; value: string }[] = [
    { icon: 'construct-outline', label: 'Service', value: `${service?.name ?? ''} · ${service ? getIssueTitle(service, booking.issueId) : ''}` },
    { icon: 'calendar-outline', label: 'Date', value: formatDate(booking.date) },
    { icon: 'time-outline', label: 'Time', value: booking.time },
    { icon: 'location-outline', label: 'Address', value: formatAddress(booking.address, booking.landmark) },
    { icon: 'call-outline', label: 'Contact', value: `+91 ${booking.phone}` },
  ];

  return (
    <Screen pageTitle="Booking Confirmed">
      <Container style={styles.page}>
        <View style={styles.top}>
          <SuccessCheck />
          <FadeIn delay={250} style={{ alignItems: 'center', gap: 6 }}>
            <AppText variant="h1" align="center" accessibilityRole="header">
              Booking Confirmed!
            </AppText>
            <AppText variant="body" color={colors.muted} align="center" style={{ maxWidth: 440 }}>
              Thanks, {booking.name.split(' ')[0]}! A verified professional will call you before arriving.
            </AppText>
            <View style={styles.idPill}>
              <AppText style={styles.idLabel}>Booking ID</AppText>
              <AppText style={styles.idValue} selectable>
                {booking.id}
              </AppText>
            </View>
          </FadeIn>
        </View>

        <View style={[styles.grid, isDesktop && styles.gridRow]}>
          <FadeIn delay={350} style={[styles.card, isDesktop && { flex: 1 }]}>
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
              <AppText variant="label">Estimated total</AppText>
              <AppText style={styles.total}>{formatPrice(booking.price)}</AppText>
            </View>
          </FadeIn>

          <FadeIn delay={450} style={[{ gap: spacing.md }, isDesktop && { flex: 1 }]}>
            <View style={styles.waHeader}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.whatsappDark} />
              <AppText variant="h3">WhatsApp acknowledgement</AppText>
            </View>
            <WhatsAppPreview message={message} time={time} />
            <Button
              label="Send confirmation to WhatsApp"
              icon="logo-whatsapp"
              variant="whatsapp"
              fullWidth
              size="lg"
              onPress={() => openWhatsApp(message)}
            />
            <AppText variant="small" align="center">
              Opens WhatsApp with your booking details so our team can confirm in chat.
            </AppText>
          </FadeIn>
        </View>

        <View style={styles.actions}>
          <Button label="View My Bookings" icon="calendar" variant="dark" onPress={() => router.replace('/bookings')} />
          <Button label="Back to Home" icon="home-outline" variant="outline" onPress={() => router.replace('/')} />
        </View>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: spacing.xxxl, maxWidth: 1000 },
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
  gridRow: { flexDirection: 'row', alignItems: 'flex-start' },
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
  waHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xxxl },
});
