import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BOOKING_STATUS, formatDateTime, isSlotAvailable, TIME_SLOTS, upcomingDays,
  type BookingEvent,
} from '@profecian/shared';
import { AppText, asIcon, FieldShell, PressableScale, type WebPressableState } from './primitives';
import { colors, fonts, radius, shadows, spacing } from './theme';

/* ───────────── Rating ───────────── */

export function Stars({ value, size = 14, count }: { value: number; size?: number; count?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Rated ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={value >= i + 1 ? 'star' : value > i ? 'star-half' : 'star-outline'} size={size} color={colors.star} />
      ))}
      {count != null ? <AppText variant="small" style={{ marginLeft: 4 }}>({count})</AppText> : null}
    </View>
  );
}

const RATING_WORDS = ['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'];

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={[styles.row, { gap: 8 }]} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: value }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <PressableScale key={i} onPress={() => onChange(i + 1)} accessibilityRole="button" accessibilityLabel={`${i + 1} star${i ? 's' : ''}`} scaleTo={0.85}>
            <Ionicons name={value >= i + 1 ? 'star' : 'star-outline'} size={38} color={value >= i + 1 ? colors.star : colors.borderStrong} />
          </PressableScale>
        ))}
      </View>
      <AppText variant="label" color={value ? colors.ink : colors.subtle}>{value ? RATING_WORDS[value] : 'Tap to rate'}</AppText>
    </View>
  );
}

/* ───────────── Photos ───────────── */

/** Pick images from the library (or camera). Stores local URIs — uploads are stubbed until a backend exists. */
export function PhotoPicker({ value, onChange, max = 4, label, optional = true, camera = false }: {
  value: string[];
  onChange: (uris: string[]) => void;
  max?: number;
  label?: string;
  optional?: boolean;
  camera?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const pick = async () => {
    setError(null);
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera permission is needed to take a photo');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: !camera && max - value.length > 1, selectionLimit: max - value.length };
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled) onChange([...value, ...res.assets.map((a) => a.uri)].slice(0, max));
    } catch {
      setError('Could not open the photo picker');
    }
  };
  return (
    <FieldShell label={label} optional={optional} error={error} hint={`Up to ${max} photo${max > 1 ? 's' : ''}`}>
      <View style={styles.photos}>
        {value.map((uri) => (
          <View key={uri} style={styles.photo}>
            <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" />
            <Pressable onPress={() => onChange(value.filter((u) => u !== uri))} style={styles.photoRemove} accessibilityLabel="Remove photo" hitSlop={6}>
              <Ionicons name="close" size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {value.length < max ? (
          <PressableScale onPress={pick} style={[styles.photo, styles.photoAdd]} accessibilityRole="button" accessibilityLabel={camera ? 'Take photo' : 'Add photo'}>
            <Ionicons name={camera ? 'camera-outline' : 'image-outline'} size={24} color={colors.primary} />
            <AppText variant="tiny" color={colors.primary}>{camera ? 'Camera' : 'Add'}</AppText>
          </PressableScale>
        ) : null}
      </View>
    </FieldShell>
  );
}

/* ───────────── Timeline ───────────── */

const EVENT_LABEL: Record<string, string> = {
  rescheduled: 'Rescheduled',
  reassigned: 'Professional reassigned',
  payment_received: 'Payment received',
  payment_failed: 'Payment failed',
  reviewed: 'Review submitted',
};

export function Timeline({ events }: { events: BookingEvent[] }) {
  return (
    <View>
      {events.map((e, i) => {
        const meta = BOOKING_STATUS[e.kind as keyof typeof BOOKING_STATUS];
        const last = i === events.length - 1;
        return (
          <View key={`${e.kind}-${e.at}-${i}`} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, last && styles.tlDotActive]}>
                <Ionicons name={asIcon(meta?.icon ?? (e.kind === 'payment_failed' ? 'alert-circle-outline' : 'ellipse-outline'))} size={12} color={last ? colors.white : colors.primary} />
              </View>
              {!last ? <View style={styles.tlLine} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.lg }}>
              <AppText variant="label">{meta?.label ?? EVENT_LABEL[e.kind] ?? e.kind}</AppText>
              <AppText variant="small">{formatDateTime(e.at)} · by {e.by}</AppText>
              {e.note ? <AppText variant="small" color={colors.text}>{e.note}</AppText> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ───────────── Sheet (bottom sheet on phones, dialog on wide screens) ───────────── */

export function Sheet({ visible, onClose, title, children, footer, width = 520 }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const { width: w } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = w < 768;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, mobile ? styles.backdropBottom : styles.backdropCenter]} onPress={onClose} accessibilityLabel="Close">
        <Pressable onPress={() => undefined} style={[styles.sheet, mobile ? styles.sheetMobile : [styles.sheetDialog, { maxWidth: width }], mobile && { paddingBottom: insets.bottom + spacing.md }]}>
          {mobile ? <View style={styles.handle} /> : null}
          <View style={styles.sheetHeader}>
            <AppText variant="h3" style={{ flex: 1 }}>{title}</AppText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={styles.close}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.sm }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ───────────── Date + time slot ───────────── */

export function DateSlotPicker({ date, slot, onDate, onSlot, days = 10, dateError, slotError }: {
  date?: string;
  slot?: string;
  onDate: (iso: string) => void;
  onSlot: (slot: string) => void;
  days?: number;
  dateError?: string | null;
  slotError?: string | null;
}) {
  const options = useMemo(() => upcomingDays(days), [days]);
  const noneLeft = !!date && TIME_SLOTS.every((s) => !isSlotAvailable(date, s));
  return (
    <View style={{ gap: spacing.xl }}>
      <FieldShell label="Preferred date" required error={dateError}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
          {options.map((d) => {
            const on = d.iso === date;
            return (
              <PressableScale key={d.iso} onPress={() => onDate(d.iso)} style={[styles.day, on && styles.dayOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${d.weekday} ${d.day} ${d.month}`}>
                <AppText style={[styles.dayW, on && styles.onText]}>{d.weekday}</AppText>
                <AppText style={[styles.dayN, on && styles.onText]}>{d.day}</AppText>
                <AppText style={[styles.dayW, on && styles.onText]}>{d.month}</AppText>
              </PressableScale>
            );
          })}
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
                style={({ hovered }: WebPressableState) => [styles.slot, hovered && available && !on && { backgroundColor: colors.surfaceAlt }, on && styles.dayOn, !available && styles.slotOff]}
              >
                <AppText style={[styles.slotText, on && styles.onText, !available && { color: colors.subtle }]}>{s}</AppText>
              </Pressable>
            );
          })}
        </View>
      </FieldShell>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.background },
  photoAdd: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  tlRow: { flexDirection: 'row', gap: spacing.md },
  tlRail: { alignItems: 'center', width: 24 },
  tlDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tlDotActive: { backgroundColor: colors.primary },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.primaryBorder, marginVertical: 2 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  backdropBottom: { justifyContent: 'flex-end' },
  backdropCenter: { justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  sheet: { backgroundColor: colors.surface, maxHeight: '90%', ...shadows.lg },
  sheetMobile: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  sheetDialog: { width: '100%', borderRadius: radius.xl, padding: spacing.xl },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: spacing.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sheetFooter: { paddingTop: spacing.md, gap: spacing.sm },
  day: { width: 66, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayW: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  dayN: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
  onText: { color: colors.white },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { minWidth: 96, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  slotOff: { opacity: 0.45, backgroundColor: colors.background },
  slotText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
});
