import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookings, effectiveStatus } from '@/context/BookingsContext';
import { colors, fonts, layout, shadows } from '@/theme';
import { AppText } from './AppText';
import { NAV_ITEMS, isActive } from './navigation';

/** Mobile tab bar. */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { bookings } = useBookings();
  const upcoming = bookings.filter((b) => ['confirmed', 'pending'].includes(effectiveStatus(b))).length;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const label = item.href === '/bookings' ? 'Bookings' : item.label;
        return (
          <Pressable
            key={item.href}
            onPress={() => router.navigate(item.href)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.pill, active && styles.pillActive]}>
              <Ionicons name={active ? item.activeIcon : item.icon} size={21} color={active ? colors.primary : colors.muted} />
              {item.href === '/bookings' && upcoming > 0 && (
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>{upcoming > 9 ? '9+' : upcoming}</AppText>
                </View>
              )}
            </View>
            <AppText style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
    minHeight: layout.bottomNavHeight,
    ...shadows.md,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.primarySoft },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  labelActive: { color: colors.primary },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, color: colors.white, lineHeight: 11 },
});
