import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { FormCard } from '@/components/FormCard';
import { Grid } from '@/components/Grid';
import { IssueCard } from '@/components/IssueCard';
import { Rating } from '@/components/Rating';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { ServiceCard } from '@/components/ServiceCard';
import { useCart } from '@/context/CartContext';
import { groupCart, otherIssue, useCatalog } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, createStyles, fonts, gradients, radius, shadows, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services, getService } = useCatalog();
  const service = getService(id);
  const cart = useCart();
  const { isMobile, isDesktop, select } = useResponsive();

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

  const options = [...service.issues, otherIssue(service)];
  const group = groupCart(services, cart.items).find((g) => g.service.id === service.id);
  const selectedCount = group?.lines.length ?? 0;
  const otherCount = cart.count - selectedCount;
  const others = services.filter((s) => s.id !== service.id).slice(0, select({ mobile: 2, tablet: 3, desktop: 4 }));

  const summary = (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="small" numberOfLines={1}>
          {selectedCount ? `${selectedCount} selected${otherCount ? ` · ${otherCount} more in cart` : ''}` : otherCount ? `${otherCount} in cart from other services` : 'Select one or more problems'}
        </AppText>
        <AppText style={styles.summaryPrice}>
          {group ? `${group.estimate ? 'from ' : ''}${formatPrice(group.subtotal)}` : formatPrice(0)}
        </AppText>
      </View>
      <Button
        label={cart.count ? `View cart (${cart.count})` : 'View cart'}
        icon="cart"
        onPress={() => router.push('/cart')}
        disabled={!cart.count}
        size={isMobile ? 'md' : 'lg'}
        accessibilityHint={cart.count ? undefined : 'Select a problem to add it to your cart'}
      />
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

          <FormCard title="What do you need help with?" icon="construct-outline">
            <AppText variant="small">Pick one or more — each one you select goes into your cart. Pick the date and address at checkout.</AppText>
            <View style={styles.issues} accessibilityLabel="Problems">
              {options.map((issue) => (
                <IssueCard key={issue.id} issue={issue} selected={cart.has(service.id, issue.id)} onPress={() => cart.toggle(service.id, issue.id)} />
              ))}
            </View>
          </FormCard>

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
              <AppText variant="h3">Your selection</AppText>
              <View style={styles.divider} />
              {group ? (
                group.lines.map((l) => (
                  <View key={l.issueId} style={styles.asideLine}>
                    <AppText variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                      {l.issue.title}
                    </AppText>
                    <AppText variant="label">{formatPrice(l.issue.price)}</AppText>
                  </View>
                ))
              ) : (
                <AppText variant="small">Nothing selected yet. Tap a problem to add it.</AppText>
              )}
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

const styles = createStyles(() => ({
  hero: { justifyContent: 'flex-end', backgroundColor: colors.night, overflow: 'hidden' },
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
  issues: { gap: spacing.md },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  asideLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
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
}));
