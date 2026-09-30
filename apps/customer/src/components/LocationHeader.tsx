import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View } from 'react-native';
import { useLocation } from '@/context/LocationContext';
import { colors, createStyles, fonts } from '@/theme';
import { AppText } from './AppText';
import { LocationSheet } from './LocationSheet';
import { PressableScale } from './PressableScale';

const ICON = { Home: 'home', Work: 'briefcase', Other: 'location' } as const;

/**
 * Two-line location in the top bar (like Zomato): the address label (or
 * "Current location" / city) with a chevron, and the full address beneath.
 * Tapping opens the location picker.
 */
export function LocationHeader({ maxWidth }: { maxWidth?: number }) {
  const { title, subtitle, selectedAddress, selection } = useLocation();
  const [open, setOpen] = useState(false);
  const icon = selectedAddress ? ICON[selectedAddress.label] : selection.kind === 'current' ? 'navigate' : 'location';

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        scaleTo={0.98}
        style={[styles.wrap, maxWidth ? { maxWidth } : null]}
        accessibilityRole="button"
        accessibilityLabel={`Location: ${title}, ${subtitle}. Tap to change.`}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <AppText style={styles.title} numberOfLines={1}>
              {title}
            </AppText>
            <Ionicons name="chevron-down" size={14} color={colors.ink} />
          </View>
          <AppText style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
      </PressableScale>
      <LocationSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = createStyles(() => ({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 },
  text: { flexShrink: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  title: { fontFamily: fonts.extrabold, fontSize: 15, lineHeight: 19, color: colors.ink, flexShrink: 1 },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
}));
