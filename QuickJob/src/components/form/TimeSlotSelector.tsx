import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { TIME_SLOTS, isSlotAvailable } from '@/utils/format';
import { AppText } from '../AppText';
import { PressableScale } from '../PressableScale';
import { FieldShell } from './FieldShell';

interface TimeSlotSelectorProps {
  date: string | undefined;
  value: string | undefined;
  onChange: (slot: string) => void;
  error?: string;
}

export function TimeSlotSelector({ date, value, onChange, error }: TimeSlotSelectorProps) {
  const noneLeft = !!date && TIME_SLOTS.every((s) => !isSlotAvailable(date, s));

  return (
    <FieldShell
      label="Preferred Time"
      required
      error={error}
      hint={!date ? 'Select a date to see available slots' : noneLeft ? 'No slots left today — please pick another date' : undefined}
    >
      <View style={styles.grid}>
        {TIME_SLOTS.map((slot) => {
          const available = !date || isSlotAvailable(date, slot);
          const active = slot === value;
          return (
            <PressableScale
              key={slot}
              disabled={!date || !available}
              onPress={() => onChange(slot)}
              style={[styles.slot, active && styles.active, (!date || !available) && styles.disabled]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: !date || !available }}
              accessibilityLabel={slot}
            >
              {active ? <Ionicons name="checkmark-circle" size={13} color={colors.white} style={styles.check} /> : null}
              <AppText style={[styles.text, active && styles.activeText, !available && styles.strike]}>{slot}</AppText>
            </PressableScale>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 98,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  check: { position: 'absolute', left: 7 },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.45, backgroundColor: colors.background },
  text: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  activeText: { color: colors.white },
  strike: { textDecorationLine: 'line-through', color: colors.subtle },
});
