import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { AppText } from '../AppText';

interface FieldShellProps {
  label: string;
  optional?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Label + error/hint wrapper shared by all form controls. */
export function FieldShell({ label, optional, required, error, hint, children }: FieldShellProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label">
        {label}
        {required ? <AppText style={styles.required}> *</AppText> : null}
        {optional ? <AppText style={styles.optional}> (Optional)</AppText> : null}
      </AppText>
      {children}
      {error ? (
        <View style={styles.row} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <AppText style={styles.error}>{error}</AppText>
        </View>
      ) : hint ? (
        <AppText style={styles.hint}>{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  required: { color: colors.danger, fontFamily: fonts.bold },
  optional: { color: colors.subtle, fontFamily: fonts.medium, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  error: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.danger, flexShrink: 1 },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
});
