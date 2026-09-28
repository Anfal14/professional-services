import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type ScrollView, type TextInput } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { FormCard } from '@/components/FormCard';
import { TextField } from '@/components/form/TextField';
import { PressableScale } from '@/components/PressableScale';
import { Rating } from '@/components/Rating';
import { Screen } from '@/components/Screen';
import { computeBreakdown, useBackend, useDb } from '@profecian/shared';
import { useCustomer } from '@/backend';
import { useLocation } from '@/context/LocationContext';
import { OTHER_ISSUE_ID, resolveIssue, useCatalog } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import type { BookingForm } from '@/types';
import { formatDate, formatPrice, isSlotAvailable, upcomingDays, TIME_SLOTS, BOOKING_WINDOW_DAYS } from '@/utils/format';
import { validateBooking } from '@/utils/validation';

type FormState = BookingForm;

export default function BookScreen() {
  const { id, issue: issueParam, date: dateParam, time: timeParam } = useLocalSearchParams<{ id: string; issue?: string; date?: string; time?: string }>();
  const { getService } = useCatalog();
  const service = getService(id);
  const backend = useBackend();
  const db = useDb();
  const customer = useCustomer();
  const { city } = useLocation();
  const savedAddress = customer?.addresses[0];
  const { isDesktop } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const landmarkRef = useRef<TextInput>(null);

  const validIssue = service?.issues.some((i) => i.id === issueParam) || issueParam === OTHER_ISSUE_ID;
  const validDate = dateParam && upcomingDays(BOOKING_WINDOW_DAYS).some((d) => d.iso === dateParam) ? dateParam : '';
  const validTime = validDate && timeParam && TIME_SLOTS.includes(timeParam) && isSlotAvailable(validDate, timeParam) ? timeParam : '';
  const [form, setForm] = useState<FormState>({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    address: savedAddress?.line ?? '',
    landmark: savedAddress?.landmark ?? '',
    issueId: validIssue && issueParam ? issueParam : '',
    date: validDate,
    time: validTime,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!customer) {
    const query = new URLSearchParams(Object.entries({ issue: issueParam, date: dateParam, time: timeParam }).filter(([, v]) => !!v) as [string, string][]).toString();
    return <Redirect href={{ pathname: '/login', params: { next: `/book/${id}${query ? `?${query}` : ''}` } }} />;
  }

  if (!service) {
    return (
      <Screen back title="Book">
        <EmptyState icon="alert-circle-outline" title="Service not found" message="Please choose a service to book." actionLabel="Browse services" onAction={() => router.replace('/services')} />
      </Screen>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    setSubmitError(null);
  };

  const blur = (key: keyof FormState) => setTouched((prev) => ({ ...prev, [key]: true }));

  const allErrors = validateBooking(form);
  const missingCount = Object.keys(allErrors).length;
  const canSubmit = missingCount === 0;
  const shownError = (key: keyof FormState) => (touched[key] ? allErrors[key] : undefined);
  const hasSchedule = !!form.issueId && !!form.date && !!form.time;

  const selectedIssue = service.issues.find((i) => i.id === form.issueId);
  const bookedIssue = form.issueId ? resolveIssue(service, form.issueId) : undefined;
  const category = db.categories.find((c) => c.id === service.id);
  const breakdown = computeBreakdown(bookedIssue?.price ?? service.startingPrice, category?.commissionRate ?? db.settings.defaultCommissionRate, db.settings.taxRate);
  const price = breakdown.total;
  const backToService = () => router.replace({ pathname: '/service/[id]', params: { id: service.id } });

  const submit = async () => {
    if (!canSubmit) {
      setTouched({ name: true, phone: true, address: true, issueId: true, date: true, time: true });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    try {
      setSubmitting(true);
      if (!bookedIssue) throw new Error('Please select the problem you are facing');
      const booking = await backend.customer.createBooking({
        customerId: customer.id,
        categoryId: service.id,
        problemTypeId: bookedIssue.id,
        date: form.date,
        slot: form.time,
        address: { id: savedAddress?.line === form.address.trim() ? savedAddress.id : undefined, label: 'Home', line: form.address.trim(), landmark: form.landmark?.trim() || undefined, city: savedAddress?.city ?? city },
        contactName: form.name,
        contactPhone: form.phone,
        notes: form.issueId === OTHER_ISSUE_ID ? 'Customer is not sure of the problem — inspection requested' : undefined,
      });
      router.replace({ pathname: '/success', params: { id: booking.id } });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong while booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const summaryCard = (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <Image source={service.image} style={styles.thumb} contentFit="cover" transition={200} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="h3">{service.name}</AppText>
          <Rating value={service.rating} reviews={service.reviews} />
        </View>
      </View>
      <View style={styles.divider} />
      <SummaryLine label="Issue" value={selectedIssue?.title ?? (form.issueId === OTHER_ISSUE_ID ? 'Inspection' : '—')} />
      <SummaryLine label="Date" value={form.date ? formatDate(form.date) : '—'} />
      <SummaryLine label="Time" value={form.time || '—'} />
      <View style={styles.divider} />
      <SummaryLine label="Service" value={formatPrice(breakdown.serviceAmount)} />
      <SummaryLine label={`GST (${Math.round(db.settings.taxRate * 100)}%)`} value={formatPrice(breakdown.tax)} />
      <View style={styles.line}>
        <AppText variant="label">Estimated total</AppText>
        <AppText style={styles.total}>{formatPrice(price)}</AppText>
      </View>
      <AppText variant="small">
        {bookedIssue?.pricingModel === 'starting_at' || form.issueId === OTHER_ISSUE_ID
          ? 'Final price confirmed by the professional after inspection. '
          : ''}
        Pay online or in cash after the service.
      </AppText>
      <PressableScale onPress={backToService} hoverLift accessibilityRole="button" style={styles.change}>
        <Ionicons name="create-outline" size={15} color={colors.primary} />
        <AppText variant="label" style={styles.changeText}>
          Change problem or schedule
        </AppText>
      </PressableScale>
    </View>
  );

  return (
    <Screen ref={scrollRef} back title="Book service" pageTitle={`Book ${service.name}`} bottomNav={false}>
      <Container style={styles.page}>
        <FadeIn style={{ gap: 6, marginBottom: spacing.xxl }}>
          <AppText variant="h1" accessibilityRole="header">
            Book {service.name}
          </AppText>
          <AppText variant="body" color={colors.muted}>
            Fill in your details and we’ll assign a verified professional.
          </AppText>
        </FadeIn>

        <View style={[styles.layout, isDesktop && styles.layoutRow]}>
          <View style={styles.formCol}>
            {!isDesktop && summaryCard}

            {!hasSchedule && (
              <View style={styles.alert} accessibilityRole="alert">
                <Ionicons name="calendar-outline" size={20} color={colors.warning} />
                <AppText style={styles.alertWarn}>
                  Your problem and visit time haven’t been chosen yet.
                </AppText>
                <PressableScale onPress={backToService} accessibilityRole="button" style={styles.alertAction}>
                  <AppText variant="tiny" style={styles.alertActionText}>
                    Choose now
                  </AppText>
                </PressableScale>
              </View>
            )}

            <FormCard title="Your details" icon="person-circle-outline">
              <TextField
                label="Full Name"
                required
                icon="person-outline"
                placeholder="e.g. Priya Sharma"
                value={form.name}
                onChangeText={(t) => update('name', t)}
                onBlur={() => blur('name')}
                error={shownError('name')}
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                maxLength={60}
              />
              <TextField
                ref={phoneRef}
                label="Contact Number"
                required
                prefix="+91"
                placeholder="98765 43210"
                value={form.phone}
                onChangeText={(t) => update('phone', t.replace(/[^\d\s]/g, ''))}
                onBlur={() => blur('phone')}
                error={shownError('phone')}
                hint="We’ll send booking updates on WhatsApp"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                onSubmitEditing={() => addressRef.current?.focus()}
                maxLength={14}
              />
            </FormCard>

            <FormCard title="Service address" icon="location-outline">
              <TextField
                ref={addressRef}
                label="Address"
                required
                icon="home-outline"
                placeholder="House / flat no., street, area, city, PIN"
                value={form.address}
                onChangeText={(t) => update('address', t)}
                onBlur={() => blur('address')}
                error={shownError('address')}
                multiline
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                maxLength={250}
              />
              <TextField
                ref={landmarkRef}
                label="Landmark"
                optional
                icon="flag-outline"
                placeholder="e.g. Near City Mall"
                value={form.landmark}
                onChangeText={(t) => update('landmark', t)}
                returnKeyType="done"
                maxLength={80}
              />
            </FormCard>

            {submitError ? (
              <View style={styles.alert} accessibilityRole="alert">
                <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
                <AppText style={styles.alertText}>{submitError}</AppText>
              </View>
            ) : null}

            <Button
              label={`Submit Booking · ${formatPrice(price)}`}
              icon="checkmark-circle"
              size="lg"
              fullWidth
              loading={submitting}
              onPress={submit}
              accessibilityHint={canSubmit ? undefined : 'Fill in the remaining details to continue'}
            />
            {!canSubmit ? (
              <View style={styles.pending} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color={colors.warning} />
                <AppText style={styles.pendingText}>
                  Complete {missingCount} more {missingCount === 1 ? 'field' : 'fields'} to place your booking.
                </AppText>
              </View>
            ) : null}
            <View style={styles.secure}>
              <Ionicons name="lock-closed" size={13} color={colors.muted} />
              <AppText variant="small">Your details are only shared with your assigned professional.</AppText>
            </View>
          </View>

          {isDesktop && <View style={styles.asideCol}>{summaryCard}</View>}
        </View>
      </Container>
    </Screen>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <AppText variant="small">{label}</AppText>
      <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: spacing.xxl, maxWidth: 1100 },
  layout: { gap: spacing.xxl },
  layoutRow: { flexDirection: 'row', alignItems: 'flex-start' },
  formCol: { flex: 1, gap: spacing.lg },
  asideCol: { width: 360 },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...shadows.md,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 60, height: 60, borderRadius: radius.md },
  divider: { height: 1, backgroundColor: colors.border },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  total: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.primary },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  changeText: { color: colors.primary },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  alertText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger, flex: 1 },
  alertWarn: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, flex: 1 },
  alertAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  alertActionText: { color: colors.warning, letterSpacing: 0 },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  pendingText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.warning },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
