import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { CalendarChip, CalendarSheet } from '@profecian/ui';
import { colors, fonts, radius, createStyles } from '@/theme';
import { dayOption, upcomingDays, BOOKING_WINDOW_DAYS } from '@/utils/format';
import { AppText } from '../AppText';
import { PressableScale } from '../PressableScale';
import { FieldShell } from './FieldShell';

interface DateSelectorProps {
  value: string | undefined;
  onChange: (iso: string) => void;
  error?: string;
  days?: number;
  /** Hides the field label when a surrounding card already titles it. */
  hideLabel?: boolean;
  /** Control the calendar from outside (e.g. a card's calendar icon). */
  calendarOpen?: boolean;
  onCalendarOpenChange?: (open: boolean) => void;
}

/**
 * Day chips for the next few days plus a "More dates" chip that opens a month
 * calendar for anything later. Same UI on web, iOS and Android.
 */
export function DateSelector({ value, onChange, error, days = BOOKING_WINDOW_DAYS, hideLabel, calendarOpen, onCalendarOpenChange }: DateSelectorProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = calendarOpen ?? ownOpen;
  const setOpen = onCalendarOpenChange ?? setOwnOpen;

  const options = upcomingDays(days);
  // A later date picked from the calendar leads the row so the selection stays visible.
  const chips = value && !options.some((d) => d.iso === value) ? [dayOption(value), ...options] : options;

  return (
    <FieldShell label={hideLabel ? undefined : 'Preferred Date'} error={error}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chips.map((d) => {
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
        <CalendarChip onPress={() => setOpen(true)} />
      </ScrollView>
      <CalendarSheet visible={open} onClose={() => setOpen(false)} value={value} onSelect={onChange} />
    </FieldShell>
  );
}

const styles = createStyles(() => ({
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
}));
