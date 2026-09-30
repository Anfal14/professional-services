import type { WebPressableState } from "@/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "@/hooks/useResponsive";
import { colors, fonts, layout, radius, shadows, spacing, createStyles } from "@/theme";
import { AppText } from "./AppText";
import { CartButton } from "./CartButton";
import { Container } from "./Container";
import { LocationHeader } from "./LocationHeader";
import { Logo } from "./Logo";
import { NavAvatar } from "./NavAvatar";
import { NAV_ITEMS, isActive } from "./navigation";
import { PressableScale } from "./PressableScale";

interface NavbarProps {
  /** Show a back button (mobile) instead of the logo */
  back?: boolean;
  /** Title shown next to the back button on mobile */
  title?: string;
}

/**
 * Top-nav links: Home + Services only, the two-line location, and a badged
 * cart on the right. About/Contact stay reachable from the footer and the
 * account menu. On mobile the location replaces the logo (like Zomato) and the
 * avatar moves to the tab bar (components/BottomNav.tsx).
 */
const TOP_LINKS = NAV_ITEMS.filter(
  (item) => item.href === "/" || item.href === "/services",
);

export function Navbar({ back, title }: NavbarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isMobile } = useResponsive();
  const showBack = back && isMobile;

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Container style={styles.bar}>
        <View style={[styles.left, isMobile && styles.leftMobile]}>
          {showBack ? (
            <>
              <PressableScale
                onPress={goBack}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color={colors.ink} />
              </PressableScale>
              {title ? (
                <AppText variant="h3" numberOfLines={1} style={styles.title}>
                  {title}
                </AppText>
              ) : null}
            </>
          ) : isMobile ? (
            <LocationHeader />
          ) : (
            <Pressable
              onPress={() => router.navigate("/")}
              accessibilityRole="link"
              accessibilityLabel="Profecian home"
            >
              <Logo size={isMobile ? 32 : 36} />
            </Pressable>
          )}
        </View>

        {!isMobile && (
          <View style={styles.middle}>
            {TOP_LINKS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => router.navigate(item.href)}
                    accessibilityRole="link"
                    accessibilityState={{ selected: active }}
                    style={({ hovered }: WebPressableState) => [
                      styles.link,
                      (hovered || active) && styles.linkHover,
                    ]}
                  >
                    <AppText
                      style={[styles.linkText, active && styles.linkTextActive]}
                    >
                      {item.label}
                    </AppText>
                  </Pressable>
                );
              })}
            <View style={styles.locationDesktop}>
              <LocationHeader maxWidth={300} />
            </View>
          </View>
        )}

        <View style={styles.right}>
          <CartButton />
          {!isMobile && <NavAvatar />}
        </View>
      </Container>
    </View>
  );
}

const styles = createStyles(() => ({
  wrap: {
    backgroundColor: colors.navBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 10,
    ...shadows.sm,
  },
  bar: {
    height: layout.navHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, minWidth: 0 },
  leftMobile: { flex: 1, marginRight: spacing.md },
  title: { flexShrink: 1 },
  middle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  locationDesktop: {
    marginLeft: spacing.md,
    paddingLeft: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    flexShrink: 1,
    minWidth: 0,
  },
  link: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  linkHover: { backgroundColor: colors.primarySoft },
  linkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  linkTextActive: { color: colors.primary },
  navSearch: { flex: 1, minWidth: 140, maxWidth: 300 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
}));
