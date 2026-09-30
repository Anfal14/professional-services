import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { IconName } from '@/data/services';
import { colors, fonts, spacing, createStyles } from '@/theme';
import { AppText } from './AppText';

export interface RoadmapStep {
  icon: IconName;
  title: string;
  text: string;
}

const ROW_HEIGHT = 132;
const TRACK_WIDTH = 76;
const CENTER_X = 38;
const AMPLITUDE = 14;
const NODE_RADIUS = 20;

/** Alternates each node left/right of center so the connecting path curves. */
function nodeX(index: number): number {
  return CENTER_X + (index % 2 === 0 ? -AMPLITUDE : AMPLITUDE);
}

/** A vertical "how it works" timeline connected by a dashed, curving path — a friendlier take on a plain numbered list. */
export function RoadmapSteps({ steps }: { steps: RoadmapStep[] }) {
  const height = steps.length * ROW_HEIGHT;
  const points = steps.map((_, i) => ({ x: nodeX(i), y: i * ROW_HEIGHT + ROW_HEIGHT / 2 }));

  const path = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midY = (prev.y + p.y) / 2;
    return `${d} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
  }, '');

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width={TRACK_WIDTH} height={height} style={styles.svg}>
        <Path d={path} stroke={colors.primaryBorder} strokeWidth={3} strokeDasharray="1, 10" strokeLinecap="round" fill="none" />
      </Svg>
      {steps.map((step, i) => (
        <View key={step.title} style={[styles.row, { top: i * ROW_HEIGHT, height: ROW_HEIGHT }]}>
          <View style={[styles.node, { left: points[i].x - NODE_RADIUS, top: ROW_HEIGHT / 2 - NODE_RADIUS }]}>
            <AppText style={styles.nodeText}>{i + 1}</AppText>
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Ionicons name={step.icon} size={16} color={colors.primary} />
              <AppText variant="h3" style={styles.title}>
                {step.title}
              </AppText>
            </View>
            <AppText variant="small">{step.text}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = createStyles(() => ({
  wrap: { position: 'relative', width: '100%' },
  svg: { position: 'absolute', left: 0, top: 0 },
  row: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
  node: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    borderRadius: NODE_RADIUS,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
  content: { marginLeft: TRACK_WIDTH + spacing.sm, gap: 4, paddingRight: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16 },
}));
