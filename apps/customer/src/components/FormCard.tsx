import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import type { ReactNode } from 'react';
import type { IconName } from '@/data/services';
import { colors, radius, shadows, spacing, createStyles } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface FormCardProps {
  title: string;
  icon: IconName;
  children: ReactNode;
  /** Makes the header icon a button (e.g. the calendar icon opens the date picker). */
  onIconPress?: () => void;
  iconLabel?: string;
}

/** Titled panel that groups related form fields ("Your details", "Problem & schedule"). */
export function FormCard({ title, icon, children, onIconPress, iconLabel }: FormCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {onIconPress ? (
          <PressableScale onPress={onIconPress} style={styles.icon} accessibilityRole="button" accessibilityLabel={iconLabel ?? title} hitSlop={6}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </PressableScale>
        ) : (
          <View style={styles.icon}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
        )}
        <AppText variant="h3" style={{ flex: 1 }}>{title}</AppText>
        {onIconPress ? (
          <PressableScale onPress={onIconPress} accessibilityRole="button" accessibilityLabel={iconLabel ?? title} hitSlop={6}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </PressableScale>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = createStyles(() => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xl,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  body: { gap: spacing.xl },
}));
