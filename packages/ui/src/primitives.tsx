import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import type { Tone } from '@profecian/shared';
import { colors, fonts, gradients, radius, shadows, spacing, toneColors, type as typeScale, createStyles } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
/** Catalogue icons are stored as plain strings in @profecian/shared. */
export const asIcon = (name: string) => name as IconName;

/** react-native-web adds `hovered` to Pressable state; RN's types don't include it. */
export type WebPressableState = import('react-native').PressableStateCallbackType & { hovered?: boolean };

const useNativeDriver = Platform.OS !== 'web';

/* ───────────── Text ───────────── */

export function AppText({ variant = 'body', color, align, style, ...rest }: TextProps & { variant?: keyof typeof typeScale; color?: string; align?: TextStyle['textAlign'] }) {
  return <Text {...rest} style={[typeScale[variant], color ? { color } : null, align ? { textAlign: align } : null, style]} />;
}

/* ───────────── Motion ───────────── */

export function PressableScale({ children, style, scaleTo = 0.97, hoverLift = false, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hoverLift?: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(0));
  const springTo = (value: Animated.Value, toValue: number) => Animated.spring(value, { toValue, useNativeDriver, speed: 40, bounciness: 6 }).start();
  // Layout props must live on the Pressable (the flex child), visuals on the animated view.
  const { outer, inner } = splitLayout(style);
  return (
    <Pressable
      {...rest}
      style={outer}
      onPressIn={(e) => { springTo(scale, scaleTo); rest.onPressIn?.(e); }}
      onPressOut={(e) => { springTo(scale, 1); rest.onPressOut?.(e); }}
      onHoverIn={(e) => { if (hoverLift) springTo(lift, -3); rest.onHoverIn?.(e); }}
      onHoverOut={(e) => { if (hoverLift) springTo(lift, 0); rest.onHoverOut?.(e); }}
    >
      <Animated.View style={[inner, { transform: [{ scale }, { translateY: lift }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const LAYOUT_KEYS = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex',
] as const;

function splitLayout(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) ((LAYOUT_KEYS as readonly string[]).includes(k) ? outer : inner)[k] = v;
  // The animated view fills whatever size the pressable was given.
  if (outer.width != null || outer.flex != null || outer.flexGrow != null || outer.alignSelf === 'stretch') inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export function FadeIn({ children, delay = 0, duration = 400, offset = 12, style }: { children: ReactNode; delay?: number; duration?: number; offset?: number; style?: StyleProp<ViewStyle> }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/* ───────────── Button ───────────── */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp' | 'dark' | 'light' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonSizes: Record<ButtonSize, { height: number; px: number; font: number; icon: number }> = {
  sm: { height: 36, px: 12, font: 13, icon: 16 },
  md: { height: 46, px: 18, font: 15, icon: 18 },
  lg: { height: 54, px: 22, font: 16, icon: 20 },
};

const buttonPalette = (): Record<ButtonVariant, { bg: string; fg: string; border?: string }> => ({
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.primarySoft, fg: colors.primary },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.primary },
  whatsapp: { bg: colors.whatsapp, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.inverse },
  light: { bg: colors.white, fg: colors.night },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  success: { bg: colors.success, fg: colors.white },
});

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, fullWidth, style, accessibilityHint }: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const s = buttonSizes[size];
  const p = buttonPalette()[variant];
  const inactive = disabled || loading;
  const content = (
    <View style={[styles.btnInner, { height: s.height, paddingHorizontal: s.px }]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={s.icon} color={p.fg} /> : null}
          <AppText style={{ fontFamily: fonts.bold, fontSize: s.font, color: p.fg }} numberOfLines={1}>{label}</AppText>
          {iconRight ? <Ionicons name={iconRight} size={s.icon} color={p.fg} /> : null}
        </>
      )}
    </View>
  );
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.btn,
        { backgroundColor: variant === 'primary' ? undefined : p.bg },
        p.border ? { borderWidth: 1.5, borderColor: p.border } : null,
        variant === 'primary' && !inactive ? shadows.primary : null,
        fullWidth ? styles.full : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>{content}</LinearGradient>
      ) : content}
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, label, tone = 'neutral', size = 40, badge }: { icon: IconName; onPress?: () => void; label: string; tone?: Tone; size?: number; badge?: number }) {
  const t = toneColors[tone];
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.iconBtn, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={size * 0.5} color={tone === 'neutral' ? colors.ink : t.fg} />
      {badge ? (
        <View style={styles.dotBadge}>
          <AppText style={styles.dotBadgeText}>{badge > 9 ? '9+' : badge}</AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

/* ───────────── Surfaces ───────────── */

export function Card({ children, style, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }) {
  const s = [styles.card, padded && styles.cardPad, style];
  return onPress ? <PressableScale onPress={onPress} hoverLift style={s}>{children}</PressableScale> : <View style={s}>{children}</View>;
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]} accessibilityLabel={label}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <AppText style={[styles.badgeText, { color: t.fg }]} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

export function Avatar({ name, size = 40, tone = 'primary' }: { name: string; size?: number; tone?: Tone }) {
  const parts = name.trim().split(/\s+/);
  const ini = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
  const t = toneColors[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color: t.fg }}>{ini}</AppText>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: { icon: IconName; title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <AppText variant="h3" align="center">{title}</AppText>
      <AppText variant="small" align="center" style={{ maxWidth: 360 }}>{message}</AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md, alignSelf: 'center' }} /> : null}
    </View>
  );
}

export function Banner({ tone = 'info', icon, title, message, action }: { tone?: Tone; icon?: IconName; title: string; message?: string; action?: ReactNode }) {
  const t = toneColors[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]} accessibilityRole="alert">
      {icon ? <Ionicons name={icon} size={20} color={t.fg} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={[styles.bannerTitle, { color: t.fg }]}>{title}</AppText>
        {message ? <AppText variant="small" color={colors.text}>{message}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

export function StatCard({ label, value, icon, tone = 'primary', hint, style }: { label: string; value: string; icon: IconName; tone?: Tone; hint?: string; style?: StyleProp<ViewStyle> }) {
  const t = toneColors[tone];
  return (
    <View style={[styles.card, styles.cardPad, styles.stat, style]}>
      <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <AppText variant="small" numberOfLines={1}>{label}</AppText>
      <AppText style={styles.statValue} numberOfLines={1}>{value}</AppText>
      {hint ? <AppText variant="tiny" numberOfLines={1}>{hint}</AppText> : null}
    </View>
  );
}

/** Label/value line used in summaries and invoices. */
export function KeyValue({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: Tone }) {
  return (
    <View style={styles.kv}>
      <AppText variant={strong ? 'label' : 'small'} style={{ flexShrink: 1 }}>{label}</AppText>
      <AppText variant={strong ? 'h3' : 'bodyMedium'} color={tone ? toneColors[tone].fg : undefined} style={{ textAlign: 'right', flexShrink: 1 }}>{value}</AppText>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="h3">{title}</AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText style={styles.link}>{action}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ───────────── Form controls ───────────── */

export function FieldShell({ label, optional, required, error, hint, children }: { label?: string; optional?: boolean; required?: boolean; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <AppText variant="label">
          {label}
          {required ? <AppText style={{ color: colors.danger, fontFamily: fonts.bold }}> *</AppText> : null}
          {optional ? <AppText style={{ color: colors.subtle, fontFamily: fonts.medium, fontSize: 13 }}> (Optional)</AppText> : null}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
    </View>
  );
}

export const TextField = forwardRef<TextInput, TextInputProps & { label?: string; icon?: IconName; prefix?: string; error?: string | null; hint?: string; optional?: boolean; required?: boolean }>(
  function TextField({ label, icon, prefix, error, hint, optional, required, multiline, style, onFocus, onBlur, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    return (
      <FieldShell label={label} optional={optional} required={required} error={error} hint={hint}>
        <View style={[styles.field, multiline && styles.fieldMulti, focused && styles.fieldFocused, !!error && styles.fieldError]}>
          {icon ? <Ionicons name={icon} size={19} color={focused ? colors.primary : colors.subtle} style={multiline ? { marginTop: 2 } : undefined} /> : null}
          {prefix ? (
            <View style={styles.prefix}>
              <AppText style={styles.prefixText}>{prefix}</AppText>
            </View>
          ) : null}
          <TextInput
            ref={ref}
            {...rest}
            multiline={multiline}
            placeholderTextColor={colors.subtle}
            accessibilityLabel={label ?? rest.placeholder}
            style={[styles.input, multiline && styles.inputMulti, style]}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          />
        </View>
      </FieldShell>
    );
  },
);

/** Single-select chips (wraps). */
export function ChipGroup<T extends string>({ options, value, onChange, multi }: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T | T[] | undefined;
  onChange: (v: T) => void;
  multi?: boolean;
}) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={styles.chips} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: on } : { selected: on }}
            style={({ hovered }: WebPressableState) => [styles.chip, hovered && !on && styles.chipHover, on && styles.chipOn]}
          >
            {o.icon ? <Ionicons name={o.icon} size={15} color={on ? colors.white : colors.muted} /> : null}
            <AppText style={[styles.chipText, on && { color: colors.white }]}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.toggle, value && styles.toggleOn, disabled && styles.disabled]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

const styles = createStyles(() => ({
  btn: { borderRadius: radius.md, overflow: 'hidden', alignSelf: 'flex-start' },
  gradient: { borderRadius: radius.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  dotBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
  },
  dotBadgeText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, color: colors.white },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  cardPad: { padding: spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11.5 },
  empty: { alignItems: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 14 },
  stat: { gap: 4, minWidth: 140, flexGrow: 1 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: 3 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  errorText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.danger, flexShrink: 1 },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
  },
  fieldMulti: { alignItems: 'flex-start', paddingVertical: 12 },
  fieldFocused: { borderColor: colors.primary, backgroundColor: colors.inputBg },
  fieldError: { borderColor: colors.danger, backgroundColor: colors.inputErrorBg },
  prefix: { paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.border },
  prefixText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, paddingVertical: 11, minWidth: 0, outlineStyle: 'none' } as object,
  inputMulti: { minHeight: 72, paddingVertical: 0, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipHover: { backgroundColor: colors.surfaceAlt },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.borderStrong, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.success },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, ...shadows.sm },
  knobOn: { alignSelf: 'flex-end' },
}));
