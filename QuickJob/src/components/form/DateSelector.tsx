import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { upcomingDays } from '@/utils/format';
import { AppText } from '../AppText';
import { PressableScale } from '../PressableScale';
import { FieldShell } from './FieldShell';

interface DateSelectorProps {
  value: string | undefined;
  onChange: (iso: string) => void;
  error?: string;
  days?: number;
}

export function DateSelector({ value, onChange, error, days = 10 }: DateSelectorProps) {
  const options = useMemo(() => upcomingDays(days), [days]);

  return (
    <FieldShell label="Preferred Date" required error={error}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((d) => {
          const active = d.iso === value;
          return (
            <PressableScale
              key={d.iso}
              onPress={() => onChange(d.iso)}
              style={[styles.chip, active && styles.active]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${d.weekday} ${d.day} ${d.month}`}
            >
              <AppText style={[styles.weekday, active && styles.activeText]}>{d.weekday}</AppText>
              <AppText style={[styles.day, active && styles.activeText]}>{d.day}</AppText>
              <AppText style={[styles.month, active && styles.activeText]}>{d.month}</AppText>
              {d.isToday && !active ? <View style={styles.todayDot} /> : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 2, paddingRight: 4 },
  chip: {
    width: 68,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekday: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  day: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, marginVertical: 1 },
  month: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  activeText: { color: colors.white },
  todayDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
});
