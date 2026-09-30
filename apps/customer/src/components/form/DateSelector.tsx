import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import type { WebPressableState } from '@/types';
import { colors, fonts, radius, shadows, spacing, createStyles } from '@/theme';
import { formatDate, parseISODate, toISODate, upcomingDays, BOOKING_WINDOW_DAYS } from '@/utils/format';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { PressableScale } from '../PressableScale';
import { FieldShell } from './FieldShell';

interface DateSelectorProps {
  value: string | undefined;
  onChange: (iso: string) => void;
  error?: string;
  days?: number;
  /** Hides the field label when a surrounding card already titles it. */
  hideLabel?: boolean;
}

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Native date picker on iOS/Android; falls back to a day-chip row on web, which the native module does not support. */
export function DateSelector({ value, onChange, error, days = BOOKING_WINDOW_DAYS, hideLabel }: DateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => startOfToday());
  const isWeb = Platform.OS === 'web';

  const today = useMemo(() => startOfToday(), []);
  const maximum = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days - 1),
    [today, days],
  );

  const openPicker = () => {
    const initial = value ? parseISODate(value) : today;
    setDraft(initial);
    if (Platform.OS === 'android') {
      setOpen(true);
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        display: 'default',
        minimumDate: today,
        maximumDate: maximum,
        onValueChange: (_event, picked) => {
          setOpen(false);
          onChange(toISODate(picked));
        },
        onDismiss: () => setOpen(false),
      });
      return;
    }
    setOpen(true);
  };

  const close = () => setOpen(false);
  const commit = () => {
    onChange(toISODate(draft));
    close();
  };

  return (
    <FieldShell label={hideLabel ? undefined : 'Preferred Date'} error={error}>
      {isWeb ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {upcomingDays(days).map((d) => {
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
      ) : (
        <Pressable
          onPress={openPicker}
          style={({ hovered }: WebPressableState) => [styles.box, hovered && styles.boxHover, !!error && styles.boxError]}
          accessibilityRole="button"
          accessibilityLabel="Preferred Date"
          accessibilityValue={{ text: value ? formatDate(value) : 'Select a date' }}
          accessibilityHint={`Choose a date between today and ${formatDate(toISODate(maximum))}`}
        >
          <Ionicons name="calendar-outline" size={19} color={colors.subtle} />
          <AppText style={[styles.boxValue, !value && styles.boxPlaceholder]} numberOfLines={1}>
            {value ? formatDate(value) : 'Select a date'}
          </AppText>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
      )}

      <Modal
        visible={open && Platform.OS === 'ios'}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <AppText variant="h3">Preferred Date</AppText>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close" style={styles.sheetClose}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              minimumDate={today}
              maximumDate={maximum}
              onValueChange={(_event, picked) => picked && setDraft(picked)}
              accentColor={colors.primary}
              themeVariant="light"
            />
            <Button label="Done" fullWidth onPress={commit} />
          </Pressable>
        </Pressable>
      </Modal>
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
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  boxHover: { borderColor: colors.primary },
  boxError: { borderColor: colors.danger, backgroundColor: colors.inputErrorBg },
  boxValue: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  boxPlaceholder: { color: colors.subtle },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  sheet: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadows.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
}));
