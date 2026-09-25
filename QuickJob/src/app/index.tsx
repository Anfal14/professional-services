import type { WebPressableState } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { FadeIn } from '@/components/FadeIn';
import { Grid } from '@/components/Grid';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/SectionHeader';
import { ServiceCard } from '@/components/ServiceCard';
import { TrustBadges } from '@/components/TrustBadges';
import { HERO_IMAGE, TECH_IMAGE, services, stats, testimonials, type IconName } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, gradients, radius, shadows, spacing } from '@/theme';
import { openWhatsApp } from '@/utils/whatsapp';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'search', title: 'Choose a service', text: 'Pick from 50+ services and tell us what needs fixing.' },
  { icon: 'calendar', title: 'Pick a slot', text: 'Choose a date and time that works for you — even today.' },
  { icon: 'happy', title: 'Relax', text: 'A verified pro arrives on time. Pay only after the job is done.' },
];

const WHY: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield-checkmark', title: 'Background-verified pros', text: 'Every professional is ID-checked and trained.' },
  { icon: 'pricetags', title: 'Fixed, upfront prices', text: 'No haggling, no hidden charges. Ever.' },
  { icon: 'ribbon', title: 'Service warranty', text: 'Free re-work if something isn’t right.' },
  { icon: 'logo-whatsapp', title: 'Instant WhatsApp updates', text: 'Booking and arrival updates in your chat.' },
];

const QUICK_SEARCHES = ['AC Repair', 'Cleaning', 'Electrician', 'Plumber'];

export default function HomeScreen() {
  const { isMobile, isDesktop, select, gutter } = useResponsive();
  const [query, setQuery] = useState('');

  const search = (q = query) => {
    const trimmed = q.trim();
    router.push(trimmed ? { pathname: '/services', params: { q: trimmed } } : '/services');
  };

  return (
    <Screen pageTitle="Home services at your doorstep">
      {/* ───────── Hero ───────── */}
      <View style={[styles.hero, { minHeight: select({ mobile: 520, tablet: 540, desktop: 600 }) }]}>
        <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} priority="high" />
        <LinearGradient
          colors={isMobile ? ['rgba(40,16,110,0.62)', 'rgba(15,15,26,0.86)'] : gradients.heroSide}
          start={isMobile ? { x: 0, y: 0 } : { x: 0, y: 0.5 }}
          end={isMobile ? { x: 0, y: 1 } : { x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Container style={[styles.heroInner, isDesktop && styles.heroRow]}>
          <FadeIn style={[styles.heroCopy, isDesktop && { maxWidth: 620 }]}>
            <View style={styles.eyebrow}>
              <Ionicons name="flash" size={14} color="#FFD66B" />
              <AppText style={styles.eyebrowText}>Professionals at your door in 45 mins</AppText>
            </View>
            <AppText
              style={[styles.heroTitle, { fontSize: select({ mobile: 34, tablet: 44, desktop: 54 }), lineHeight: select({ mobile: 42, tablet: 52, desktop: 62 }) }]}
              accessibilityRole="header"
            >
              Home services,{'\n'}
              <AppText style={[styles.heroTitle, styles.heroAccent, { fontSize: select({ mobile: 34, tablet: 44, desktop: 54 }) }]}>done right.</AppText>
            </AppText>
            <AppText style={styles.heroSub}>
              Book trusted electricians, plumbers, AC technicians, cleaners and more — at fixed prices with a service
              warranty.
            </AppText>

            <SearchBar value={query} onChangeText={setQuery} onSubmit={() => search()} showButton={!isMobile} style={styles.search} />

            <View style={styles.quick}>
              <AppText style={styles.quickLabel}>Popular:</AppText>
              {QUICK_SEARCHES.map((q) => (
                <Pressable key={q} onPress={() => search(q)} style={({ hovered }: WebPressableState) => [styles.quickChip, hovered && styles.quickChipHover]}>
                  <AppText style={styles.quickText}>{q}</AppText>
                </Pressable>
              ))}
            </View>

            <TrustBadges dark />
          </FadeIn>

          {isDesktop && (
            <FadeIn delay={200} style={styles.heroCard}>
              <Image source={TECH_IMAGE} style={styles.heroCardImage} contentFit="cover" transition={300} />
              <View style={styles.heroCardBody}>
                <View style={styles.row}>
                  <View style={styles.avatarDot}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </View>
                  <AppText variant="label">Verified professional</AppText>
                </View>
                <AppText variant="small">Trained, insured and rated 4.8★ by 2M+ customers.</AppText>
              </View>
              <View style={styles.floatBadge}>
                <Ionicons name="star" size={14} color={colors.star} />
                <AppText style={styles.floatText}>4.8 · 12M+ bookings</AppText>
              </View>
            </FadeIn>
          )}
        </Container>
      </View>

      {/* ───────── Stats ───────── */}
      <Container>
        <FadeIn delay={150} style={[styles.stats, isMobile && styles.statsMobile]}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, isMobile && styles.statMobile, i > 0 && !isMobile && styles.statDivider]}>
              <AppText style={styles.statValue}>{s.value}</AppText>
              <AppText variant="small">{s.label}</AppText>
            </View>
          ))}
        </FadeIn>
      </Container>

      {/* ───────── Services ───────── */}
      <Container style={styles.section}>
        <SectionHeader
          eyebrow="Our services"
          title="What are you looking for?"
          subtitle="Expert help for every corner of your home."
          actionLabel="View all"
          onAction={() => router.push('/services')}
        />
        <Grid columns={select({ mobile: 2, tablet: 3, desktop: 4 })} gap={isMobile ? 12 : 20}>
          {services.map((s, i) => (
            <FadeIn key={s.id} delay={80 * i}>
              <ServiceCard service={s} compact={isMobile} />
            </FadeIn>
          ))}
        </Grid>
      </Container>

      {/* ───────── How it works ───────── */}
      <Container style={styles.section}>
        <SectionHeader eyebrow="How it works" title="Booked in under 60 seconds" center />
        <View style={[styles.steps, isMobile && { flexDirection: 'column' }]}>
          {STEPS.map((step, i) => (
            <FadeIn key={step.title} delay={100 * i} style={styles.step}>
              <View style={styles.stepNum}>
                <AppText style={styles.stepNumText}>{i + 1}</AppText>
              </View>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={26} color={colors.primary} />
              </View>
              <AppText variant="h3" align="center">
                {step.title}
              </AppText>
              <AppText variant="small" align="center">
                {step.text}
              </AppText>
            </FadeIn>
          ))}
        </View>
      </Container>

      {/* ───────── Why QuickJob ───────── */}
      <Container style={styles.section}>
        <View style={[styles.why, !isDesktop && { flexDirection: 'column' }]}>
          <View style={[styles.whyImageWrap, !isDesktop && { width: '100%', height: 240 }]}>
            <Image source={TECH_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
            <View style={styles.whyImageBadge}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <AppText style={styles.floatText}>100% verified professionals</AppText>
            </View>
          </View>
          <View style={styles.whyContent}>
            <SectionHeader eyebrow="Why QuickJob" title="Your home deserves the best hands" />
            <View style={{ gap: spacing.lg }}>
              {WHY.map((w) => (
                <View key={w.title} style={styles.whyItem}>
                  <View style={styles.whyIcon}>
                    <Ionicons name={w.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{w.title}</AppText>
                    <AppText variant="small">{w.text}</AppText>
                  </View>
                </View>
              ))}
            </View>
            <Button label="Explore services" iconRight="arrow-forward" onPress={() => router.push('/services')} style={{ marginTop: spacing.xxl }} />
          </View>
        </View>
      </Container>

      {/* ───────── Testimonials ───────── */}
      <View style={styles.section}>
        <Container>
          <SectionHeader eyebrow="Loved by customers" title="Real stories from real homes" />
        </Container>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.testimonialRow, { paddingHorizontal: gutter }, isDesktop && styles.testimonialCenter]}
        >
            {testimonials.map((t) => (
              <View key={t.name} style={[styles.testimonial, { width: select({ mobile: 290, tablet: 320, desktop: 370 }) }]}>
                <View style={styles.stars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={15} color={colors.star} />
                  ))}
                </View>
                <AppText variant="body" style={{ flex: 1 }}>
                  “{t.text}”
                </AppText>
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    <AppText style={styles.avatarText}>{t.name[0]}</AppText>
                  </View>
                  <View>
                    <AppText variant="label">{t.name}</AppText>
                    <AppText variant="small">
                      {t.city} · {t.service}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
        </ScrollView>
      </View>

      {/* ───────── CTA ───────── */}
      <Container style={styles.section}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, isMobile && styles.ctaMobile]}>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText style={styles.ctaTitle}>Need help choosing a service?</AppText>
            <AppText style={styles.ctaText}>Chat with our experts on WhatsApp — we reply within 2 minutes.</AppText>
          </View>
          <Button label="Chat on WhatsApp" icon="logo-whatsapp" variant="light" onPress={() => openWhatsApp('Hi QuickJob, I need help choosing a service.')} />
        </LinearGradient>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hero: { justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.ink },
  heroInner: { paddingTop: spacing.huge, paddingBottom: 72 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.huge },
  heroCopy: { gap: spacing.lg, flexShrink: 1 },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  eyebrowText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.white },
  heroTitle: { fontFamily: fonts.extrabold, color: colors.white, letterSpacing: -1.2 },
  heroAccent: { color: '#C9B8FF' },
  heroSub: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25, color: 'rgba(255,255,255,0.85)', maxWidth: 540 },
  search: { maxWidth: 580, marginTop: spacing.xs },
  quick: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  quickLabel: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.1)' },
  quickChipHover: { backgroundColor: 'rgba(255,255,255,0.22)' },
  quickText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.white },
  heroCard: { width: 340, backgroundColor: colors.surface, borderRadius: radius.xxl, overflow: 'visible', ...shadows.lg },
  heroCardImage: { width: '100%', height: 260, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  heroCardBody: { padding: spacing.xl, gap: 6 },
  avatarDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  floatBadge: {
    position: 'absolute',
    top: 20,
    left: -28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    ...shadows.lg,
  },
  floatText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginTop: -44,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  statsMobile: { flexWrap: 'wrap', paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statMobile: { flexBasis: '50%', paddingVertical: spacing.sm },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.primary, letterSpacing: -0.5 },
  section: { marginTop: 56 },
  steps: { flexDirection: 'row', gap: spacing.lg },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  stepNum: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  stepIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  why: {
    flexDirection: 'row',
    gap: spacing.xxxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  whyImageWrap: { width: '44%', minHeight: 380, borderRadius: radius.xl, overflow: 'hidden' },
  whyImageBadge: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  whyContent: { flex: 1, padding: spacing.md, justifyContent: 'center' },
  whyItem: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  whyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  testimonialRow: { gap: spacing.lg, paddingBottom: spacing.md },
  testimonialCenter: { flexGrow: 1, justifyContent: 'center' },
  testimonial: {
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  stars: { flexDirection: 'row', gap: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xxxl, borderRadius: radius.xxl },
  ctaMobile: { flexDirection: 'column', alignItems: 'flex-start', padding: spacing.xxl },
  ctaTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white, letterSpacing: -0.3 },
  ctaText: { fontFamily: fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
});
