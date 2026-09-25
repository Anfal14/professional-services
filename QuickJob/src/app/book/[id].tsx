import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ScrollView, type TextInput } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { DateSelector } from '@/components/form/DateSelector';
import { SelectField, type SelectOption } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { TimeSlotSelector } from '@/components/form/TimeSlotSelector';
import { Rating } from '@/components/Rating';
import { Screen } from '@/components/Screen';
import { useBookings } from '@/context/BookingsContext';
import { getService, OTHER_ISSUE_ID } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import type { BookingInput } from '@/types';
import { formatDate, formatPrice, isSlotAvailable } from '@/utils/format';
import { validateBooking, type BookingErrors } from '@/utils/validation';

type FormState = Omit<BookingInput, 'serviceId'>;

export default function BookScreen() {
  const { id, issue: issueParam } = useLocalSearchParams<{ id: string; issue?: string }>();
  const service = getService(id);
  const { addBooking } = useBookings();
  const { isDesktop } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const landmarkRef = useRef<TextInput>(null);

  const validIssue = service?.issues.some((i) => i.id === issueParam) || issueParam === OTHER_ISSUE_ID;
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    address: '',
    landmark: '',
    issueId: validIssue && issueParam ? issueParam : '',
    date: '',
    time: '',
  });
  const [errors, setErrors] = useState<BookingErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const issueOptions = useMemo<SelectOption[]>(
    () =>
      service
        ? [
            ...service.issues.map((i) => ({
              value: i.id,
              label: i.title,
              description: i.description,
              meta: formatPrice(i.price),
              icon: i.icon,
            })),
            { value: OTHER_ISSUE_ID, label: 'Other / Not sure', description: 'Our expert will inspect and quote', meta: formatPrice(service.startingPrice), icon: 'help-circle-outline' as const },
          ]
        : [],
    [service],
  );

  if (!service) {
    return (
      <Screen back title="Book">
        <EmptyState icon="alert-circle-outline" title="Service not found" message="Please choose a service to book." actionLabel="Browse services" onAction={() => router.replace('/services')} />
      </Screen>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    const next = { ...form, [key]: value };
    // Changing the date can invalidate an already-picked slot (e.g. past slots today).
    if (key === 'date' && next.time && !isSlotAvailable(next.date, next.time)) next.time = '';
    setForm(next);
    if (submitted) setErrors(validateBooking({ ...next, serviceId: service.id }));
    setSubmitError(null);
  };

  const selectedIssue = service.issues.find((i) => i.id === form.issueId);
  const price = selectedIssue?.price ?? service.startingPrice;

  const submit = async () => {
    setSubmitted(true);
    const payload: BookingInput = { ...form, serviceId: service.id };
    const errs = validateBooking(payload);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    try {
      setSubmitting(true);
      const booking = await addBooking(payload);
      router.replace({ pathname: '/success', params: { id: booking.id } });
    } catch {
      setSubmitError('Something went wrong while booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const errorCount = Object.keys(errors).length;

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
      <View style={styles.line}>
        <AppText variant="label">Estimated total</AppText>
        <AppText style={styles.total}>{formatPrice(price)}</AppText>
      </View>
      <AppText variant="small">Final price confirmed by the professional after inspection. Pay after service.</AppText>
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

            {submitted && errorCount > 0 && (
              <View style={styles.alert} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <AppText style={styles.alertText}>
                  Please fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} highlighted below.
                </AppText>
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
                error={errors.name}
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
                error={errors.phone}
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
                error={errors.address}
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

            <FormCard title="Problem & schedule" icon="calendar-outline">
              <SelectField
                label="Select Issue / Problem"
                required
                icon="construct-outline"
                placeholder="What do you need help with?"
                value={form.issueId}
                options={issueOptions}
                onChange={(v) => update('issueId', v)}
                error={errors.issueId}
              />
              <DateSelector value={form.date} onChange={(d) => update('date', d)} error={errors.date} />
              <TimeSlotSelector date={form.date} value={form.time} onChange={(t) => update('time', t)} error={errors.time} />
            </FormCard>

            {submitError ? (
              <View style={styles.alert} accessibilityRole="alert">
                <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
                <AppText style={styles.alertText}>{submitError}</AppText>
              </View>
            ) : null}

            <Button label={`Submit Booking · ${formatPrice(price)}`} icon="checkmark-circle" size="lg" fullWidth loading={submitting} onPress={submit} />
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

function FormCard({ title, icon, children }: { title: string; icon: 'person-circle-outline' | 'location-outline' | 'calendar-outline'; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <AppText variant="h3">{title}</AppText>
      </View>
      <View style={{ gap: spacing.xl }}>{children}</View>
    </View>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xl,
    ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
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
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  alertText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger, flex: 1 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
