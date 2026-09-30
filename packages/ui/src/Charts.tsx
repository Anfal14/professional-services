/**
 * Minimal SVG charts for dashboards (react-native-svg, works on web + native).
 * Follows the dataviz mark specs: ≤24px bars with a 4px rounded data-end,
 * 2px lines with a ~10% area wash, ≥8px end-dot with a 2px surface ring,
 * hairline solid gridlines, clean y-ticks, and a hover/tap tooltip.
 * Text always uses text tokens, never the series colour.
 */
import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { AppText } from './primitives';
import { chartColors, colors, fonts, radius, shadows, createStyles } from './theme';

export interface Datum {
  label: string;
  value: number;
  /** Optional long label for the tooltip */
  detail?: string;
}

const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function useWidth(initial = 0) {
  const [width, setWidth] = useState(initial);
  return { width, onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width) };
}

function Tooltip({ x, y, title, value, width }: { x: number; y: number; title: string; value: string; width: number }) {
  const w = 150;
  const left = Math.min(Math.max(x - w / 2, 0), Math.max(0, width - w));
  return (
    <View pointerEvents="none" style={[styles.tip, { left, top: Math.max(0, y - 58), width: w }]}>
      <AppText variant="tiny" numberOfLines={1}>{title}</AppText>
      <AppText style={styles.tipValue} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

const TICKS = [0, 0.5, 1];

/** Hairline gridlines — render inside <Svg>. */
function GridLines({ width, height }: { width: number; height: number }) {
  const plotH = height - PAD.top - PAD.bottom;
  return (
    <>
      {TICKS.map((t) => {
        const y = PAD.top + plotH * (1 - t);
        return <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />;
      })}
    </>
  );
}

/** Y-axis tick labels — render outside <Svg>, as RN text. */
function YTicks({ height, max, format }: { height: number; max: number; format: (n: number) => string }) {
  const plotH = height - PAD.top - PAD.bottom;
  return (
    <>
      {TICKS.map((t) => (
        <AppText key={`l${t}`} style={[styles.tick, { top: PAD.top + plotH * (1 - t) - 8, width: PAD.left - 8 }]} numberOfLines={1}>
          {format(max * t)}
        </AppText>
      ))}
    </>
  );
}

/** Vertical columns, one series. */
export function ColumnChart({ data, height = 220, format = (n) => `${Math.round(n)}`, color = chartColors[0], xLabelEvery = 1, accessibilityLabel }: {
  data: Datum[];
  height?: number;
  format?: (n: number) => string;
  color?: string;
  /** Show every Nth x label to avoid collisions */
  xLabelEvery?: number;
  accessibilityLabel: string;
}) {
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2));

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            <GridLines width={width} height={height} />
            {data.map((d, i) => {
              const h = max ? (d.value / max) * plotH : 0;
              const x = PAD.left + i * band + (band - barW) / 2;
              const y = PAD.top + plotH - h;
              const r = Math.min(4, barW / 2, h);
              // 4px rounded data-end (top), square at the baseline.
              const path = h <= 0 ? '' : `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`;
              return path ? <Path key={i} d={path} fill={color} opacity={active == null || active === i ? 1 : 0.45} /> : null;
            })}
          </Svg>
          <YTicks height={height} max={max} format={format} />
          {data.map((d, i) =>
            i % xLabelEvery === 0 ? (
              <AppText key={`x${i}`} style={[styles.xLabel, { left: PAD.left + i * band - 20 + band / 2, top: height - PAD.bottom + 6 }]} numberOfLines={1}>
                {d.label}
              </AppText>
            ) : null,
          )}
          {/* Hit targets: the whole band, taller than the bar. */}
          {data.map((d, i) => (
            <Pressable
              key={`h${i}`}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPress={() => setActive(active === i ? null : i)}
              accessibilityLabel={`${d.detail ?? d.label}: ${format(d.value)}`}
              style={{ position: 'absolute', left: PAD.left + i * band, top: PAD.top, width: band, height: plotH }}
            />
          ))}
          {active != null && data[active] ? (
            <Tooltip width={width} x={PAD.left + active * band + band / 2} y={PAD.top + plotH - (data[active].value / max) * plotH} title={data[active].detail ?? data[active].label} value={format(data[active].value)} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Single-series line with area wash and a crosshair tooltip. */
export function LineChart({ data, height = 220, format = (n) => `${Math.round(n)}`, color = chartColors[0], xLabelEvery = 5, accessibilityLabel }: {
  data: Datum[];
  height?: number;
  format?: (n: number) => string;
  color?: string;
  xLabelEvery?: number;
  accessibilityLabel: string;
}) {
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({ x: PAD.left + i * step, y: PAD.top + plotH - (max ? (d.value / max) * plotH : 0) }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${PAD.top + plotH} L${pts[0].x},${PAD.top + plotH} Z` : '';
  const last = pts[pts.length - 1];
  const focus = active != null ? pts[active] : null;

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      {width > 0 && pts.length ? (
        <>
          <Svg width={width} height={height}>
            <GridLines width={width} height={height} />
            <Path d={area} fill={color} opacity={0.1} />
            <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {focus ? <Line x1={focus.x} x2={focus.x} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.borderStrong} strokeWidth={1} /> : null}
            {(focus ?? last) ? <Circle cx={(focus ?? last).x} cy={(focus ?? last).y} r={5} fill={color} stroke={colors.surface} strokeWidth={2} /> : null}
          </Svg>
          <YTicks height={height} max={max} format={format} />
          {data.map((d, i) =>
            i % xLabelEvery === 0 || i === data.length - 1 ? (
              <AppText key={`x${i}`} style={[styles.xLabel, { left: pts[i].x - 20, top: height - PAD.bottom + 6 }]} numberOfLines={1}>
                {d.label}
              </AppText>
            ) : null,
          )}
          {data.map((d, i) => (
            <Pressable
              key={`h${i}`}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPress={() => setActive(active === i ? null : i)}
              accessibilityLabel={`${d.detail ?? d.label}: ${format(d.value)}`}
              style={{ position: 'absolute', left: pts[i].x - Math.max(step, 12) / 2, top: PAD.top, width: Math.max(step, 12), height: plotH }}
            />
          ))}
          {focus && active != null ? <Tooltip width={width} x={focus.x} y={focus.y} title={data[active].detail ?? data[active].label} value={format(data[active].value)} /> : null}
        </>
      ) : null}
    </View>
  );
}

/** Horizontal ranked bars with the value at the bar end (magnitude, one hue). */
export function BarList({ data, format = (n) => `${n}`, color = chartColors[0], max: maxProp }: { data: Datum[]; format?: (n: number) => string; color?: string; max?: number }) {
  const max = maxProp ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 12 }}>
      {data.map((d) => (
        <View key={d.label} style={{ gap: 4 }} accessibilityLabel={`${d.label}: ${format(d.value)}`}>
          <View style={styles.barHead}>
            <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{d.label}</AppText>
            <AppText variant="bodyMedium">{format(d.value)}</AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(1.5, (d.value / max) * 100)}%`, backgroundColor: color }]} />
          </View>
          {d.detail ? <AppText variant="tiny">{d.detail}</AppText> : null}
        </View>
      ))}
    </View>
  );
}

const styles = createStyles(() => ({
  tick: { position: 'absolute', left: 0, textAlign: 'right', fontFamily: fonts.medium, fontSize: 11, color: colors.subtle },
  xLabel: { position: 'absolute', width: 40, textAlign: 'center', fontFamily: fonts.medium, fontSize: 10.5, color: colors.subtle },
  tip: { position: 'absolute', backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, ...shadows.md },
  tipValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
}));
