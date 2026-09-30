import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { BOOKING_STATUS, type BookingStatus } from '@profecian/shared';
import { toneColors } from '@profecian/ui';
import type { IconName } from '@/data/services';
import { fonts, radius, createStyles } from '@/theme';
import { AppText } from './AppText';

/** Customer-facing wording for statuses whose shared label is ops-oriented. */
const CUSTOMER_LABEL: Partial<Record<BookingStatus, string>> = {
  pending_assignment: 'Finding a professional',
  accepted: 'Confirmed',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = BOOKING_STATUS[status];
  const t = toneColors[s.tone];
  const label = CUSTOMER_LABEL[status] ?? s.label;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]} accessibilityLabel={`Status: ${label}`}>
      <Ionicons name={s.icon as IconName} size={13} color={t.fg} />
      <AppText style={[styles.text, { color: t.fg }]}>{label}</AppText>
    </View>
  );
}

const styles = createStyles(() => ({
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
}));
