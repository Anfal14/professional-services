import type { WebPressableState } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '@/context/LocationContext';
import { CITIES } from '@/data/locations';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/**
 * Navbar location pill — shows the selected city and opens a picker on tap.
 * No geolocation yet; the list is fixed and the choice persists on-device
 * via LocationContext/locationApi.ts.
 */
export function LocationPill() {
  const { city, setCity } = useLocation();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const choose = (c: (typeof CITIES)[number]) => {
    setCity(c);
    setOpen(false);
  };

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={`Location: ${city}. Tap to change.`}
      >
        <Ionicons name="location" size={14} color={colors.primary} />
        <AppText style={styles.text} numberOfLines={1}>
          {city}
        </AppText>
        <Ionicons name="chevron-down" size={12} color={colors.primary} />
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable
          style={[styles.backdrop, isMobile ? styles.backdropBottom : styles.backdropCenter]}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
        >
          <Pressable
            onPress={() => undefined}
            style={[
              styles.sheet,
              isMobile ? styles.sheetMobile : styles.sheetDialog,
              isMobile && { paddingBottom: insets.bottom + spacing.lg },
            ]}
          >
            {isMobile && <View style={styles.handle} />}
            <AppText variant="h3" style={{ marginBottom: spacing.md }}>
              Choose your location
            </AppText>
            {CITIES.map((c) => {
              const active = c === city;
              return (
                <Pressable
                  key={c}
                  onPress={() => choose(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={({ hovered }: WebPressableState) => [styles.option, hovered && styles.optionHover, active && styles.optionActive]}
                >
                  <Ionicons name="location-outline" size={18} color={active ? colors.primary : colors.muted} />
                  <AppText style={[styles.optionText, active && styles.optionTextActive]}>{c}</AppText>
                  {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  text: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.primary, maxWidth: 100 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  backdropBottom: { justifyContent: 'flex-end' },
  backdropCenter: { justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  sheet: { backgroundColor: colors.surface, ...shadows.lg },
  sheetMobile: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheetDialog: { width: '100%', maxWidth: 360, borderRadius: radius.xl, padding: spacing.xl },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.md },
  optionHover: { backgroundColor: colors.surfaceAlt },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  optionTextActive: { color: colors.primary, fontFamily: fonts.bold },
});
