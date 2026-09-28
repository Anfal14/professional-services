import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import type { IconName } from '@/data/services';
import { colors, radius, shadows, spacing } from '@/theme';
import { AppText } from './AppText';

interface FormCardProps {
  title: string;
  icon: IconName;
  children: ReactNode;
}

/** Titled panel that groups related form fields ("Your details", "Problem & schedule"). */
export function FormCard({ title, icon, children }: FormCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <AppText variant="h3">{title}</AppText>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
