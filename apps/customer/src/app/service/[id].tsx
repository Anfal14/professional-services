import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { FormCard } from '@/components/FormCard';
import { DateSelector } from '@/components/form/DateSelector';
import { SelectField, type SelectOption } from '@/components/form/SelectField';
import { TimeSlotSelector } from '@/components/form/TimeSlotSelector';
import { Grid } from '@/components/Grid';
import { Rating } from '@/components/Rating';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { ServiceCard } from '@/components/ServiceCard';
import { OTHER_ISSUE_ID, useCatalog } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, gradients, radius, shadows, spacing } from '@/theme';
import { formatDate, formatPrice, isSlotAvailable } from '@/utils/format';
import { validateSchedule } from '@/utils/validation';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services, getService } = useCatalog();
  const service = getService(id);
  const { isMobile, isDesktop, select } = useResponsive();
  const [selected, setSelected] = useState<string | undefined>();
  const [date, setDate] = useState<string | undefined>();
  const [time, setTime] = useState<string | undefined>();
  const [touched, setTouched] = useState<Partial<Record<'issueId' | 'date' | 'time', boolean>>>({});

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
            {
              value: OTHER_ISSUE_ID,
              label: 'Other / Not sure',
              description: 'Our expert will inspect and quote',
              meta: formatPrice(service.startingPrice),
              icon: 'help-circle-outline' as const,
            },
          ]
        : [],
    [service],
  );

  if (!service) {
    return (
      <Screen back title="Service">
        <EmptyState
          icon="alert-circle-outline"
          title="Service not found"
          message="The service you’re looking for doesn’t exist or has moved."
          actionLabel="Browse services"
          onAction={() => router.replace('/services')}
        />
      </Screen>
    );
  }

  const issue = service.issues.find((i) => i.id === selected);
  const priceLabel = issue
    ? formatPrice(issue.price)
    : selected === OTHER_ISSUE_ID
      ? `from ${formatPrice(service.startingPrice)}`
      : formatPrice(0);

  const scheduleErrors = validateSchedule({ issueId: selected, date, time });
  const missingCount = Object.keys(scheduleErrors).length;
  const canBook = missingCount === 0;
  const shownError = (key: 'issueId' | 'date' | 'time') => (touched[key] ? scheduleErrors[key] : undefined);

  // Changing the date can invalidate an already-picked slot (e.g. past slots today).
  const pickDate = (d: string) => {
    setTouched((prev) => ({ ...prev, date: true, time: true }));
    setDate(d);
    if (time && !isSlotAvailable(d, time)) setTime(undefined);
  };

  const book = () => {
    if (!canBook) {
      setTouched({ issueId: true, date: true, time: true });
      return;
    }
    router.push({
      pathname: '/book/[id]',
      params: { id: service.id, issue: selected, date, time },
    });
  };
  const others = services.filter((s) => s.id !== service.id).slice(0, select({ mobile: 2, tablet: 3, desktop: 4 }));

  const summary = (
    <View style={styles.summaryWrap}>
      <View style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="small" numberOfLines={1}>
            {issue ? issue.title : selected === OTHER_ISSUE_ID ? 'Other / Not sure' : 'Select an issue to continue'}
          </AppText>
          <AppText style={styles.summaryPrice}>{priceLabel}</AppText>
          {date ? (
            <AppText variant="tiny" numberOfLines={1}>
              {time ? `${formatDate(date)} · ${time}` : formatDate(date)}
            </AppText>
          ) : null}
        </View>
        <Button
          label="Book Now"
          iconRight="arrow-forward"
          onPress={book}
          size={isMobile ? 'md' : 'lg'}
          accessibilityHint={canBook ? undefined : 'Choose a problem, date and time to continue'}
        />
      </View>
    </View>
  );

  return (
    <Screen back title={service.name} pageTitle={service.name} actionBar={isDesktop ? undefined : summary}>

      {/* Hero */}
      <View style={[styles.hero, { minHeight: select({ mobile: 220, tablet: 280, desktop: 320 }) }]}>
        <Image source={service.image.replace('w=900', 'w=1800')} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={gradients.hero} style={StyleSheet.absoluteFill} />
        <Container style={styles.heroContent}>
          <FadeIn style={{ gap: spacing.sm }}>
            <AppText style={[styles.heroTitle, { fontSize: select({ mobile: 30, desktop: 44 }) }]} accessibilityRole="header">
              {service.name}
            </AppText>
            <AppText style={styles.heroSub}>{service.tagline}</AppText>
            <View style={styles.heroMeta}>
              <View style={styles.metaPill}>
                <Rating value={service.rating} reviews={`${service.reviews} reviews`} light />
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={14} color={colors.white} />
                <AppText style={styles.metaText}>Arrives in {service.eta}</AppText>
              </View>
            </View>
          </FadeIn>
        </Container>
      </View>

      <Container style={[styles.body, isDesktop && styles.bodyRow]}>
        <View style={styles.main}>
          <FadeIn delay={100}>
            <AppText variant="body" color={colors.muted} style={{ marginBottom: spacing.xxl }}>
              {service.description}
            </AppText>
          </FadeIn>

          <View style={styles.scheduleCards}>
            <FormCard title="Problem" icon="construct-outline">
              <SelectField
                label="Select Issue / Problem"
                hideLabel
                required
                icon="construct-outline"
                placeholder="What do you need help with?"
                value={selected}
                options={issueOptions}
                onChange={(v) => {
                  setTouched((prev) => ({ ...prev, issueId: true }));
                  setSelected(v);
                }}
                error={shownError('issueId')}
              />
            </FormCard>

            <FormCard title="Date" icon="calendar-outline">
              <DateSelector hideLabel value={date} onChange={pickDate} error={shownError('date')} />
            </FormCard>

            <FormCard title="Time" icon="time-outline">
              <TimeSlotSelector
                hideLabel
                date={date}
                value={time}
                onChange={(t) => {
                  setTouched((prev) => ({ ...prev, time: true }));
                  setTime(t);
                }}
                error={shownError('time')}
              />
            </FormCard>
          </View>

          <View style={styles.includes}>
            <AppText variant="h3" style={{ marginBottom: spacing.md }}>
              Every booking includes
            </AppText>
            <Grid columns={select({ mobile: 1, tablet: 2 })} gap={12}>
              {service.includes.map((inc) => (
                <View key={inc} style={styles.includeItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <AppText variant="bodyMedium">{inc}</AppText>
                </View>
              ))}
            </Grid>
          </View>
        </View>

        {isDesktop && (
          <View style={styles.aside}>
            <View style={styles.summaryCard}>
              <AppText variant="h3">Booking summary</AppText>
              <View style={styles.divider} />
              <View style={styles.asideLine}>
                <AppText variant="small">Service</AppText>
                <AppText variant="label">{service.name}</AppText>
              </View>
              <View style={styles.asideLine}>
                <AppText variant="small">Arrival</AppText>
                <AppText variant="label">{service.eta}</AppText>
              </View>
              <View style={styles.divider} />
              {summary}
              <View style={styles.safe}>
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <AppText variant="small" style={{ flex: 1 }}>
                  Pay after service. Free cancellation up to 2 hrs before.
                </AppText>
              </View>
            </View>
          </View>
        )}
      </Container>

      <Container style={{ marginTop: 56 }}>
        <SectionHeader title="You may also need" actionLabel="View all" onAction={() => router.push('/services')} />
        <Grid columns={select({ mobile: 2, tablet: 3, desktop: 4 })} gap={isMobile ? 12 : 20}>
          {others.map((s) => (
            <ServiceCard key={s.id} service={s} compact />
          ))}
        </Grid>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { justifyContent: 'flex-end', backgroundColor: colors.ink, overflow: 'hidden' },
  heroContent: { paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  heroTitle: { fontFamily: fonts.extrabold, color: colors.white, letterSpacing: -1 },
  heroSub: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  metaText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  body: { paddingTop: spacing.huge },
  bodyRow: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'flex-start' },
  main: { flex: 1 },
  aside: { width: 360 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  asideLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryWrap: { gap: spacing.sm },
  scheduleCards: { gap: spacing.lg },
  summaryPrice: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  safe: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.successSoft, padding: 12, borderRadius: radius.md },
  includes: {
    marginTop: spacing.xxxl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  includeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
