import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import type { IconName } from "@/data/services";
import { useResponsive } from "@/hooks/useResponsive";
import { colors, fonts, radius } from "@/theme";
import { AppText } from "./AppText";

const BADGES: { icon: IconName; label: string; short: string }[] = [
  { icon: "shield-checkmark", label: "Verified Pros", short: "Verified" },
  {
    icon: "pricetag",
    label: "Transparent Pricing",
    short: "Fair Pricing",
  },
  { icon: "time", label: "On-time Arrival", short: "On-time" },
];

interface TrustBadgesProps {
  /** Glass style for dark backgrounds */
  dark?: boolean;
}

export function TrustBadges({ dark }: TrustBadgesProps) {
  const { isMobile } = useResponsive();
  return (
    <View style={styles.row}>
      {BADGES.map((b) => (
        <View
          key={b.label}
          accessibilityLabel={b.label}
          style={[styles.badge, dark ? styles.badgeDark : styles.badgeLight]}
        >
          <Ionicons
            name={b.icon}
            size={15}
            color={dark ? "#C9B8FF" : colors.primary}
          />
          <AppText
            style={[styles.text, { color: dark ? colors.white : colors.ink }]}
          >
            {isMobile ? b.short : b.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeDark: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  badgeLight: { backgroundColor: colors.surface, borderColor: colors.border },
  text: { fontFamily: fonts.semibold, fontSize: 12.5 },
});
