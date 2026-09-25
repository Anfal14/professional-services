import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import type { IconName } from '@/data/services';
import { colors, fonts, radius } from '@/theme';
import type { BookingStatus } from '@/types';
import { AppText } from './AppText';

const STATUS: Record<BookingStatus, { label: string; fg: string; bg: string; icon: IconName }> = {
  pending: { label: 'Pending', fg: colors.warning, bg: colors.warningSoft, icon: 'hourglass-outline' },
  confirmed: { label: 'Confirmed', fg: colors.primary, bg: colors.primarySoft, icon: 'checkmark-circle' },
  in_progress: { label: 'In Progress', fg: colors.info, bg: colors.infoSoft, icon: 'construct' },
  completed: { label: 'Completed', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-done-circle' },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft, icon: 'close-circle' },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]} accessibilityLabel={`Status: ${s.label}`}>
      <Ionicons name={s.icon} size={13} color={s.fg} />
      <AppText style={[styles.text, { color: s.fg }]}>{s.label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: fonts.bold, fontSize: 12 },
});
