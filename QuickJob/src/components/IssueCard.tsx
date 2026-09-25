import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import type { Issue } from '@/data/services';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface IssueCardProps {
  issue: Issue;
  selected?: boolean;
  onPress: () => void;
}

export function IssueCard({ issue, selected, onPress }: IssueCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      hoverLift
      style={[styles.card, selected && styles.selected]}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={`${issue.title}, ${formatPrice(issue.price)}, ${issue.duration}`}
    >
      <View style={[styles.icon, selected && styles.iconSelected]}>
        <Ionicons name={issue.icon} size={22} color={selected ? colors.white : colors.primary} />
      </View>
      <View style={styles.content}>
        <AppText style={styles.title} numberOfLines={1}>
          {issue.title}
        </AppText>
        <AppText variant="small" numberOfLines={2}>
          {issue.description}
        </AppText>
        <View style={styles.meta}>
          <AppText style={styles.price}>{formatPrice(issue.price)}</AppText>
          <View style={styles.dot} />
          <Ionicons name="time-outline" size={13} color={colors.muted} />
          <AppText style={styles.duration}>{issue.duration}</AppText>
        </View>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : <Ionicons name="add" size={16} color={colors.primary} />}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  selected: { borderColor: colors.primary, backgroundColor: '#FBF9FF' },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: { backgroundColor: colors.primary },
  content: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  price: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.subtle, marginHorizontal: 2 },
  duration: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
