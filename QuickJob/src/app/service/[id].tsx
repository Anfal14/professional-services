import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { Grid } from '@/components/Grid';
import { IssueCard } from '@/components/IssueCard';
import { Rating } from '@/components/Rating';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { ServiceCard } from '@/components/ServiceCard';
import { getService, OTHER_ISSUE_ID, services } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, gradients, radius, shadows, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = getService(id);
  const { isMobile, isDesktop, select } = useResponsive();
  const [selected, setSelected] = useState<string | undefined>();

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
  const book = () =>
    router.push({ pathname: '/book/[id]', params: { id: service.id, ...(selected ? { issue: selected } : {}) } });
  const others = services.filter((s) => s.id !== service.id).slice(0, select({ mobile: 2, tablet: 3, desktop: 4 }));

  const summary = (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="small" numberOfLines={1}>
          {issue ? issue.title : selected === OTHER_ISSUE_ID ? 'Other / Not sure' : 'Select an issue to continue'}
        </AppText>
        <AppText style={styles.summaryPrice}>
          {issue ? formatPrice(issue.price) : `from ${formatPrice(service.startingPrice)}`}
        </AppText>
      </View>
      <Button label="Book Now" iconRight="arrow-forward" onPress={book} size={isMobile ? 'md' : 'lg'} />
    </View>
  );

  return (
    <Screen back title={service.name} pageTitle={service.name} actionBar={isDesktop ? undefined : summary}>

      {/* Hero */}
      <View style={[styles.hero, { minHeight: select({ mobile: 280, tablet: 340, desktop: 380 }) }]}>
        <Image source={service.image.replace('w=900', 'w=1800')} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={gradients.hero} style={StyleSheet.absoluteFill} />
        <Container style={styles.heroContent}>
          <FadeIn style={{ gap: spacing.sm }}>
            <View style={[styles.iconChip, { backgroundColor: service.tint }]}>
              <Ionicons name={service.icon} size={22} color={colors.ink} />
            </View>
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

          <SectionHeader title="What’s the problem?" subtitle="Select an issue to see the price — you can change it later." />
          <View accessibilityRole="radiogroup">
            <Grid columns={select({ mobile: 1, tablet: 2, desktop: 2 })} gap={12}>
              {service.issues.map((i, idx) => (
                <FadeIn key={i.id} delay={60 * idx}>
                  <IssueCard issue={i} selected={selected === i.id} onPress={() => setSelected(selected === i.id ? undefined : i.id)} />
                </FadeIn>
              ))}
            </Grid>
          </View>
          <Button
            label="Not sure? Get it inspected"
            variant={selected === OTHER_ISSUE_ID ? 'secondary' : 'ghost'}
            icon="help-circle-outline"
            onPress={() => setSelected(selected === OTHER_ISSUE_ID ? undefined : OTHER_ISSUE_ID)}
            style={{ marginTop: spacing.md }}
          />

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
  heroContent: { paddingTop: spacing.huge, paddingBottom: spacing.xxl },
  iconChip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
  body: { paddingTop: spacing.xxl },
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
