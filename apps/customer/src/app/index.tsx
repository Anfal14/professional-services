import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Container } from "@/components/Container";
import { FadeIn } from "@/components/FadeIn";
import { Grid } from "@/components/Grid";
import { RoadmapSteps, type RoadmapStep } from "@/components/RoadmapSteps";
import { Screen } from "@/components/Screen";
import { SearchBar } from "@/components/SearchBar";
import { SectionHeader } from "@/components/SectionHeader";
import { ServiceCard } from "@/components/ServiceCard";
import { TrustBadges } from "@/components/TrustBadges";
import {
  HERO_IMAGE,
  TECH_IMAGE,
  testimonials,
  useCatalog,
  type IconName,
} from "@/data/services";
import { bookingProblemLabel, formatDate, formatINR, useDb } from "@profecian/shared";
import { Card } from "@profecian/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { useBookings } from "@/context/BookingsContext";
import { useResponsive } from "@/hooks/useResponsive";
import { accentShade, colors, fonts, gradients, radius, shadows, spacing, createStyles } from "@/theme";
import { openWhatsApp } from "@/utils/whatsapp";

const STEPS: RoadmapStep[] = [
  {
    icon: "search",
    title: "Choose a service",
    text: "Pick from 50+ services and tell us what needs fixing.",
  },
  {
    icon: "calendar",
    title: "Pick a slot",
    text: "Choose a date and time that works for you — even today.",
  },
  {
    icon: "happy",
    title: "Relax",
    text: "A verified pro arrives on time. Pay only after the job is done.",
  },
];

const WHY: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shield-checkmark",
    title: "Background-verified pros",
    text: "Every professional is ID-checked and trained.",
  },
  {
    icon: "pricetags",
    title: "Fixed, upfront prices",
    text: "No haggling, no hidden charges. Ever.",
  },
  {
    icon: "ribbon",
    title: "Service warranty",
    text: "Free re-work if something isn’t right.",
  },
  {
    icon: "logo-whatsapp",
    title: "Instant WhatsApp updates",
    text: "Booking and arrival updates in your chat.",
  },
];

export default function HomeScreen() {
  const { isMobile, isDesktop, select, gutter } = useResponsive();
  const { services } = useCatalog();
  const { bookings } = useBookings();
  const db = useDb();
  const recent = bookings.slice(0, isMobile ? 2 : 3);
  /** Four service photos shown as a clean 2×2 grid on the hero (desktop only). */
  const heroPreviewServices = services.slice(0, 4);
  const [query, setQuery] = useState("");

  const search = (q = query) => {
    const trimmed = q.trim();
    router.push(
      trimmed ? { pathname: "/services", params: { q: trimmed } } : "/services",
    );
  };

  return (
    <Screen pageTitle="Home services at your doorstep">
      {/* ───────── Hero ───────── */}
      <View
        style={[
          styles.hero,
          { minHeight: select({ mobile: 300, tablet: 540, desktop: 600 }) },
        ]}
      >
        <Image
          source={HERO_IMAGE}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={400}
          priority="high"
        />
        <LinearGradient
          colors={
            isMobile
              ? [accentShade(0.62), "rgba(15,15,26,0.86)"] as const
              : gradients.heroSide
          }
          start={isMobile ? { x: 0, y: 0 } : { x: 0, y: 0.5 }}
          end={isMobile ? { x: 0, y: 1 } : { x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Container
          style={[
            styles.heroInner,
            isMobile && styles.heroInnerMobile,
            isDesktop && styles.heroRow,
          ]}
        >
          <FadeIn
            style={[
              styles.heroCopy,
              isMobile && styles.heroCopyMobile,
              isDesktop && { maxWidth: 620 },
            ]}
          >
            <View style={styles.eyebrow}>
              <Ionicons name="flash" size={14} color="#FFD66B" />
              <AppText style={styles.eyebrowText}>
                Professionals at your door in 30 mins
              </AppText>
            </View>
            {!isMobile && (
              <AppText
                style={[
                  styles.heroTitle,
                  {
                    fontSize: select({ mobile: 34, tablet: 44, desktop: 54 }),
                    lineHeight: select({ mobile: 42, tablet: 52, desktop: 62 }),
                  },
                ]}
                accessibilityRole="header"
              >
                Home services,{"\n"}
                <AppText
                  style={[
                    styles.heroTitle,
                    styles.heroAccent,
                    {
                      fontSize: select({ mobile: 34, tablet: 44, desktop: 54 }),
                    },
                  ]}
                >
                  done right.
                </AppText>
              </AppText>
            )}
            <AppText style={styles.heroSub}>
              Book trusted electricians, plumbers, AC technicians, cleaners and
              more.
            </AppText>

            <SearchBar
              value={query}
              onChangeText={setQuery}
              onSubmit={() => search()}
              showButton={!isMobile}
              style={styles.search}
            />

            <TrustBadges dark />
          </FadeIn>

          {isDesktop && heroPreviewServices.length === 4 && (
            <FadeIn delay={200} style={styles.heroCollage}>
              <View style={styles.heroCollageRow}>
                <Image
                  source={heroPreviewServices[0].image}
                  style={[styles.heroCollageTile, { height: 240 }]}
                  contentFit="cover"
                  transition={300}
                />
                <Image
                  source={heroPreviewServices[1].image}
                  style={[styles.heroCollageTile, { height: 240 }]}
                  contentFit="cover"
                  transition={300}
                />
              </View>
              <View style={styles.heroCollageRow}>
                <Image
                  source={heroPreviewServices[2].image}
                  style={[styles.heroCollageTile, { height: 190 }]}
                  contentFit="cover"
                  transition={300}
                />
                <Image
                  source={heroPreviewServices[3].image}
                  style={[styles.heroCollageTile, { height: 190 }]}
                  contentFit="cover"
                  transition={300}
                />
              </View>
            </FadeIn>
          )}
        </Container>
      </View>

      {/* ───────── Recent bookings (signed-in customers) ───────── */}
      {recent.length ? (
        <Container style={styles.section}>
          <SectionHeader eyebrow="Your bookings" title="Recent bookings" actionLabel="View all" onAction={() => router.push("/bookings")} />
          <Grid columns={select({ mobile: 1, tablet: 2, desktop: 3 })} gap={16}>
            {recent.map((b) => {
              const svc = services.find((s) => s.id === b.categoryId);
              return (
                <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)} style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>{svc?.name ?? "Service"}</AppText>
                    <StatusBadge status={b.status} />
                  </View>
                  <AppText variant="small" numberOfLines={1}>
                    {bookingProblemLabel(db, b)} · {formatDate(b.date)}, {b.slot}
                  </AppText>
                  <AppText variant="label">{formatINR(b.price.total)} · #{b.code}</AppText>
                </Card>
              );
            })}
          </Grid>
        </Container>
      ) : null}

      {/* ───────── Services ───────── */}
      <Container style={[styles.section, isMobile && styles.sectionAfterHero]}>
        <SectionHeader
          eyebrow="Our services"
          title="What are you looking for?"
          subtitle="Expert help for every corner of your home."
          actionLabel="View all"
          onAction={() => router.push("/services")}
        />
        <Grid
          columns={select({ mobile: 2, tablet: 3, desktop: 4 })}
          gap={isMobile ? 12 : 20}
        >
          {services.map((s, i) => (
            <FadeIn key={s.id} delay={80 * i}>
              <ServiceCard service={s} compact={isMobile} />
            </FadeIn>
          ))}
        </Grid>
      </Container>

      {/* ───────── How it works ───────── */}
      <Container style={styles.section}>
        <SectionHeader
          eyebrow="How it works"
          title="Booked in under 60 seconds"
          center
        />
        <View style={styles.roadmapWrap}>
          <View style={styles.roadmapCard}>
            <RoadmapSteps steps={STEPS} />
          </View>
        </View>
      </Container>

      {/* ───────── Why Profecian ───────── */}
      <Container style={styles.section}>
        <View style={[styles.why, !isDesktop && { flexDirection: "column" }]}>
          <View
            style={[
              styles.whyImageWrap,
              !isDesktop && { width: "100%", height: 240 },
            ]}
          >
            <Image
              source={TECH_IMAGE}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={gradients.card}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.whyImageBadge}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={colors.success}
              />
              <AppText style={styles.floatText}>
                100% verified professionals
              </AppText>
            </View>
          </View>
          <View style={styles.whyContent}>
            <SectionHeader
              eyebrow="Why Profecian"
              title="Your home deserves the best hands"
            />
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
            <Button
              label="Explore services"
              iconRight="arrow-forward"
              onPress={() => router.push("/services")}
              style={{ marginTop: spacing.xxl }}
            />
          </View>
        </View>
      </Container>

      {/* ───────── Testimonials ───────── */}
      <View style={styles.section}>
        <Container>
          <SectionHeader
            eyebrow="Loved by customers"
            title="Real stories from real homes"
          />
        </Container>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.testimonialRow,
            { paddingHorizontal: gutter },
            isDesktop && styles.testimonialCenter,
          ]}
        >
          {testimonials.map((t) => (
            <View
              key={t.name}
              style={[
                styles.testimonial,
                { width: select({ mobile: 290, tablet: 320, desktop: 370 }) },
              ]}
            >
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
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cta, isMobile && styles.ctaMobile]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <AppText style={styles.ctaTitle}>
              Need help choosing a service?
            </AppText>
            <AppText style={styles.ctaText}>
              Chat with our experts on WhatsApp — we reply within 2 minutes.
            </AppText>
          </View>
          <Button
            label="Chat on WhatsApp"
            icon="logo-whatsapp"
            variant="light"
            onPress={() =>
              openWhatsApp("Hi Profecian, I need help choosing a service.")
            }
          />
        </LinearGradient>
      </Container>
    </Screen>
  );
}

const styles = createStyles(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  hero: {
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.night,
  },
  heroInner: { paddingTop: spacing.huge, paddingBottom: 72 },
  heroInnerMobile: { paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.huge,
  },
  heroCopy: { gap: spacing.lg, flexShrink: 1 },
  heroCopyMobile: { gap: spacing.md },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  eyebrowText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.white,
  },
  heroTitle: {
    fontFamily: fonts.extrabold,
    color: colors.white,
    letterSpacing: -1.2,
  },
  heroAccent: { color: colors.accentTint },
  heroSub: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 25,
    color: "rgba(255,255,255,0.85)",
    maxWidth: 540,
  },
  search: { maxWidth: 580, marginTop: spacing.xs },
  quick: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  quickLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  quickChipHover: { backgroundColor: "rgba(255,255,255,0.22)" },
  quickText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.white,
  },
  heroCollage: { width: 360, gap: 10 },
  heroCollageRow: { flexDirection: "row", gap: 10 },
  heroCollageTile: { flex: 1, borderRadius: radius.lg } as object,
  floatText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  section: { marginTop: 56 },
  sectionAfterHero: { marginTop: spacing.xxl },
  roadmapWrap: { maxWidth: 480, alignSelf: "center", width: "100%" },
  roadmapCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  why: {
    flexDirection: "row",
    gap: spacing.xxxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  whyImageWrap: {
    width: "44%",
    minHeight: 380,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  whyImageBadge: {
    position: "absolute",
    left: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  whyContent: { flex: 1, padding: spacing.md, justifyContent: "center" },
  whyItem: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  whyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialRow: { gap: spacing.lg, paddingBottom: spacing.md },
  testimonialCenter: { flexGrow: 1, justifyContent: "center" },
  testimonial: {
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  stars: { flexDirection: "row", gap: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    padding: spacing.xxxl,
    borderRadius: radius.xxl,
  },
  ctaMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    padding: spacing.xxl,
  },
  ctaTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.3,
  },
  ctaText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },
}));
