import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { FadeIn } from '@/components/FadeIn';
import { Grid } from '@/components/Grid';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { ABOUT_IMAGE, TECH_IMAGE, stats, type IconName } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, gradients, radius, shadows, spacing } from '@/theme';

const VALUES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield-checkmark', title: 'Trust & safety', text: 'Every professional clears ID, address and background checks before their first job.' },
  { icon: 'school', title: 'Skilled & trained', text: 'Partners complete hands-on training and are re-assessed on quality every quarter.' },
  { icon: 'pricetags', title: 'Honest pricing', text: 'Standardised rate cards mean you always know what you’ll pay upfront.' },
  { icon: 'heart', title: 'Partner-first', text: 'Our professionals earn fairly, get insurance and grow with flexible work.' },
];

const MILESTONES = [
  { year: '2019', text: 'Started in Bengaluru with 20 electricians and a WhatsApp number.' },
  { year: '2021', text: 'Expanded to 10 cities and launched cleaning & pest control.' },
  { year: '2023', text: 'Crossed 1 million bookings with a 4.8★ average rating.' },
  { year: 'Today', text: '50,000+ verified professionals across 30+ cities.' },
];

export default function AboutScreen() {
  const { isMobile, isDesktop, select } = useResponsive();

  return (
    <Screen pageTitle="About Us">
      <View style={[styles.hero, { minHeight: select({ mobile: 340, tablet: 380, desktop: 440 }) }]}>
        <Image source={ABOUT_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={['rgba(40,16,110,0.55)', 'rgba(15,15,26,0.9)']} style={StyleSheet.absoluteFill} />
        <Container style={styles.heroContent}>
          <FadeIn style={{ gap: spacing.md, maxWidth: 680 }}>
            <AppText style={styles.eyebrow}>ABOUT QUICKJOB</AppText>
            <AppText style={[styles.heroTitle, { fontSize: select({ mobile: 32, desktop: 48 }), lineHeight: select({ mobile: 40, desktop: 56 }) }]} accessibilityRole="header">
              Making home services simple, safe and reliable.
            </AppText>
            <AppText style={styles.heroSub}>
              We connect busy households with skilled, verified professionals — so you can get things fixed without the
              stress of finding someone you trust.
            </AppText>
          </FadeIn>
        </Container>
      </View>

      <Container>
        <View style={[styles.stats, isMobile && { flexWrap: 'wrap' }]}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.stat, isMobile && { flexBasis: '50%', paddingVertical: spacing.sm }]}>
              <AppText style={styles.statValue}>{s.value}</AppText>
              <AppText variant="small">{s.label}</AppText>
            </View>
          ))}
        </View>
      </Container>

      <Container style={styles.section}>
        <View style={[styles.story, !isDesktop && { flexDirection: 'column' }]}>
          <View style={{ flex: 1, gap: spacing.lg }}>
            <SectionHeader eyebrow="Our story" title="Built by people who were tired of waiting for the repairman" />
            <AppText variant="body" color={colors.muted}>
              QuickJob began when our founders spent a week trying to get an AC fixed in the peak of summer — unanswered
              calls, no-shows and a surprise bill. We knew there had to be a better way.
            </AppText>
            <AppText variant="body" color={colors.muted}>
              Today we’re a technology platform that brings the same reliability you expect from ordering food to the
              services your home needs: instant booking, fixed prices, real-time WhatsApp updates and a warranty on every
              job.
            </AppText>
          </View>
          <View style={[styles.storyImage, !isDesktop && { width: '100%', height: 260 }]}>
            <Image source={TECH_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          </View>
        </View>
      </Container>

      <Container style={styles.section}>
        <SectionHeader eyebrow="What we stand for" title="Our values" center />
        <Grid columns={select({ mobile: 1, tablet: 2, desktop: 4 })} gap={16}>
          {VALUES.map((v, i) => (
            <FadeIn key={v.title} delay={80 * i} style={styles.value}>
              <View style={styles.valueIcon}>
                <Ionicons name={v.icon} size={24} color={colors.primary} />
              </View>
              <AppText variant="h3">{v.title}</AppText>
              <AppText variant="small">{v.text}</AppText>
            </FadeIn>
          ))}
        </Grid>
      </Container>

      <Container style={styles.section}>
        <SectionHeader eyebrow="Our journey" title="Milestones" />
        <View style={styles.timeline}>
          {MILESTONES.map((m, i) => (
            <View key={m.year} style={styles.milestone}>
              <View style={styles.dotCol}>
                <View style={styles.dot} />
                {i < MILESTONES.length - 1 && <View style={styles.lineV} />}
              </View>
              <View style={{ flex: 1, paddingBottom: spacing.xl }}>
                <AppText style={styles.year}>{m.year}</AppText>
                <AppText variant="body">{m.text}</AppText>
              </View>
            </View>
          ))}
        </View>
      </Container>

      <Container style={styles.section}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText style={styles.ctaTitle}>Ready to experience QuickJob?</AppText>
            <AppText style={styles.ctaText}>Book your first service today and see the difference.</AppText>
          </View>
          <Button label="Book a service" variant="light" iconRight="arrow-forward" onPress={() => router.push('/services')} />
        </LinearGradient>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { justifyContent: 'flex-end', backgroundColor: colors.ink, overflow: 'hidden' },
  heroContent: { paddingTop: spacing.huge, paddingBottom: 72 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: '#C9B8FF' },
  heroTitle: { fontFamily: fonts.extrabold, color: colors.white, letterSpacing: -1 },
  heroSub: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25, color: 'rgba(255,255,255,0.85)' },
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
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.primary },
  section: { marginTop: 56 },
  story: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'center' },
  storyImage: { width: '42%', height: 380, borderRadius: radius.xxl, overflow: 'hidden', ...shadows.md },
  value: {
    gap: 8,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    height: '100%',
    ...shadows.sm,
  },
  valueIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  timeline: { paddingLeft: spacing.xs },
  milestone: { flexDirection: 'row', gap: spacing.lg },
  dotCol: { alignItems: 'center', width: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.primarySoft },
  lineV: { flex: 1, width: 2, backgroundColor: colors.primaryBorder, marginTop: 4 },
  year: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.primary, marginBottom: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xxxl, borderRadius: radius.xxl },
  ctaTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white },
  ctaText: { fontFamily: fonts.regular, fontSize: 15, color: 'rgba(255,255,255,0.85)' },
});
