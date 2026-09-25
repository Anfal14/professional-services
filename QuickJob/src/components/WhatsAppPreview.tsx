import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius, shadows } from '@/theme';
import { AppText } from './AppText';

interface WhatsAppPreviewProps {
  message: string;
  time: string;
}

/** WhatsApp-style chat preview of the booking acknowledgement. */
export function WhatsAppPreview({ message, time }: WhatsAppPreviewProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="WhatsApp acknowledgement preview">
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="flash" size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <AppText style={styles.name}>QuickJob</AppText>
            <Ionicons name="checkmark-circle" size={14} color="#7CE0A3" />
          </View>
          <AppText style={styles.status}>Business account</AppText>
        </View>
        <Ionicons name="call" size={18} color={colors.white} />
      </View>
      <View style={styles.chat}>
        <View style={styles.datePill}>
          <AppText style={styles.dateText}>TODAY</AppText>
        </View>
        <View style={styles.bubble}>
          <AppText style={styles.message}>{message}</AppText>
          <View style={styles.meta}>
            <AppText style={styles.time}>{time}</AppText>
            <Ionicons name="checkmark-done" size={15} color="#53BDEB" />
          </View>
          <View style={styles.tail} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadows.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.whatsappDark, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  status: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  chat: { backgroundColor: colors.whatsappBg, padding: 14, gap: 10 },
  datePill: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  dateText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderTopLeftRadius: 2,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 6,
    ...shadows.sm,
  },
  tail: {
    position: 'absolute',
    top: 0,
    left: -7,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderLeftWidth: 8,
    borderTopColor: colors.surface,
    borderLeftColor: 'transparent',
  },
  message: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: '#111B21' },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 3, marginTop: 2 },
  time: { fontFamily: fonts.regular, fontSize: 11, color: '#667781' },
});
