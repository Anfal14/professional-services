import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { dayOption, isSlotAvailable, parseISODate, TIME_SLOTS, toISODate, upcomingDays } from '@profecian/shared';
import { AppText, FieldShell, PressableScale, type WebPressableState } from './primitives';
import { colors, createStyles, fonts, radius, spacing } from './theme';
import { Sheet } from './widgets';

/** How far ahead a visit can be booked from the calendar. */
export const CALENDAR_MAX_DAYS = 60;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** True when a date still has at least one bookable slot. */
export function hasOpenSlots(iso: string): boolean {
  return TIME_SLOTS.some((s) => isSlotAvailable(iso, s));
}

/**
 * Month calendar for dates beyond the quick day chips. Works the same on
 * web, iOS and Android (the native date picker has no web support).
 */
export function CalendarSheet({
  visible,
  onClose,
  value,
  onSelect,
  maxDays = CALENDAR_MAX_DAYS,
}: {
  visible: boolean;
  onClose: () => void;
  value?: string;
  onSelect: (iso: string) => void;
  maxDays?: number;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Pick a date" width={400}>
      {visible ? <MonthGrid value={value} maxDays={maxDays} onSelect={(iso) => { onSelect(iso); onClose(); }} /> : null}
    </Sheet>
  );
}

function MonthGrid({ value, maxDays, onSelect }: { value?: string; maxDays: number; onSelect: (iso: string) => void }) {
  const today = startOfToday();
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxDays - 1);
  const initial = value ? parseISODate(value) : today;
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));

  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= last;
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  // Monday-first grid with leading blanks.
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <Pressable onPress={() => shift(-1)} disabled={!canPrev} accessibilityRole="button" accessibilityLabel="Previous month" style={[styles.nav, !canPrev && styles.off]}>
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <AppText variant="h3" accessibilityRole="header">
          {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </AppText>
        <Pressable onPress={() => shift(1)} disabled={!canNext} accessibilityRole="button" accessibilityLabel="Next month" style={[styles.nav, !canNext && styles.off]}>
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <AppText key={w} style={styles.weekday}>{w}</AppText>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const iso = toISODate(d);
            const enabled = d >= today && d <= last && hasOpenSlots(iso);
            const on = iso === value;
            const isToday = d.getTime() === today.getTime();
            return (
              <Pressable
                key={i}
                disabled={!enabled}
                onPress={() => onSelect(iso)}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !enabled }}
                accessibilityLabel={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                style={({ hovered }: WebPressableState) => [styles.cell, styles.day, hovered && enabled && !on && styles.hover, on && styles.on]}
              >
                <AppText style={[styles.dayText, !enabled && styles.dayOff, on && styles.onText]}>{d.getDate()}</AppText>
                {isToday && !on ? <View style={styles.todayDot} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <AppText variant="small" align="center">Bookable up to {last.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</AppText>
    </View>
  );
}

const styles = createStyles(() => ({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  off: { opacity: 0.35 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: radius.md },
  hover: { backgroundColor: colors.surfaceAlt },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  dayOff: { color: colors.subtle, opacity: 0.5 },
  onText: { color: colors.white },
  chip: { width: 66, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipW: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  chipN: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
  calendarChip: { justifyContent: 'center', gap: 4, borderStyle: 'dashed', borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  calendarText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13, textAlign: 'center', color: colors.primary },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { minWidth: 96, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  slotOff: { opacity: 0.45, backgroundColor: colors.background },
  slotText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  todayDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
}));

/* ───────────── Date + time slot ───────────── */

/**
 * Quick day chips + a calendar button for later dates, then the time slots.
 * Keeps the chosen slot when the date changes if it's still free that day.
 */
export function DateSlotPicker({ date, slot, onDate, onSlot, days = 10, dateError, slotError }: {
  date?: string;
  slot?: string;
  onDate: (iso: string) => void;
  onSlot: (slot: string | undefined) => void;
  days?: number;
  dateError?: string | null;
  slotError?: string | null;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const options = upcomingDays(days);
  // A date picked from the calendar beyond the chips is shown as the first chip.
  const chips = date && !options.some((d) => d.iso === date) ? [dayOption(date), ...options] : options;
  const noneLeft = !!date && !hasOpenSlots(date);
  const pickDate = (iso: string) => {
    onDate(iso);
    if (slot && !isSlotAvailable(iso, slot)) onSlot(undefined);
  };
  return (
    <View style={{ gap: spacing.xl }}>
      <FieldShell label="Preferred date" required error={dateError}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
          {chips.map((d) => {
            const on = d.iso === date;
            return (
              <PressableScale key={d.iso} onPress={() => pickDate(d.iso)} style={[styles.chip, on && styles.on]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${d.weekday} ${d.day} ${d.month}`}>
                <AppText style={[styles.chipW, on && styles.onText]}>{d.weekday}</AppText>
                <AppText style={[styles.chipN, on && styles.onText]}>{d.day}</AppText>
                <AppText style={[styles.chipW, on && styles.onText]}>{d.month}</AppText>
              </PressableScale>
            );
          })}
          <CalendarChip onPress={() => setCalendarOpen(true)} />
        </ScrollView>
      </FieldShell>
      <FieldShell label="Preferred time" required error={slotError} hint={!date ? 'Pick a date to see available slots' : noneLeft ? 'No slots left on this day — try another date' : undefined}>
        <View style={styles.slots}>
          {TIME_SLOTS.map((s) => {
            const available = !!date && isSlotAvailable(date, s);
            const on = s === slot;
            return (
              <Pressable
                key={s}
                disabled={!available}
                onPress={() => onSlot(s)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: !available }}
                style={({ hovered }: WebPressableState) => [styles.slot, hovered && available && !on && styles.hover, on && styles.on, !available && styles.slotOff]}
              >
                <AppText style={[styles.slotText, on && styles.onText, !available && { color: colors.subtle }]}>{s}</AppText>
              </Pressable>
            );
          })}
        </View>
      </FieldShell>
      <CalendarSheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} value={date} onSelect={pickDate} />
    </View>
  );
}

/** Trailing chip that opens the month calendar. */
export function CalendarChip({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.chip, styles.calendarChip]} accessibilityRole="button" accessibilityLabel="Pick a later date from the calendar">
      <Ionicons name="calendar" size={20} color={colors.primary} />
      <AppText style={styles.calendarText}>More{'\n'}dates</AppText>
    </PressableScale>
  );
}
