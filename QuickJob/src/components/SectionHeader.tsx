import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme';
import { AppText } from './AppText';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  center?: boolean;
}

export function SectionHeader({ eyebrow, title, subtitle, actionLabel, onAction, center }: SectionHeaderProps) {
  return (
    <View style={[styles.row, center && styles.center]}>
      <View style={[styles.text, center && { alignItems: 'center' }]}>
        {eyebrow ? <AppText style={styles.eyebrow}>{eyebrow.toUpperCase()}</AppText> : null}
        <AppText variant="h2" align={center ? 'center' : undefined} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" align={center ? 'center' : undefined} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction && !center ? (
        <Pressable onPress={onAction} style={styles.action} accessibilityRole="link" hitSlop={8}>
          <AppText style={styles.actionText}>{actionLabel}</AppText>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.xl, gap: 12 },
  center: { justifyContent: 'center' },
  text: { flexShrink: 1, gap: 4 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: colors.primary },
  subtitle: { maxWidth: 560 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
});
