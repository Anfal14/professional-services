import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { IconName } from '@/data/services';
import { colors, fonts, gradients, radius, shadows } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp' | 'dark' | 'light';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const sizeStyles: Record<Size, { height: number; px: number; font: number; icon: number }> = {
  sm: { height: 38, px: 14, font: 13, icon: 16 },
  md: { height: 48, px: 20, font: 15, icon: 18 },
  lg: { height: 56, px: 24, font: 16, icon: 20 },
};

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.primarySoft, fg: colors.primary },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.primary },
  whatsapp: { bg: colors.whatsapp, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.white },
  light: { bg: colors.white, fg: colors.ink },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityHint,
}: ButtonProps) {
  const s = sizeStyles[size];
  const p = palette[variant];
  const inactive = disabled || loading;

  const content = (
    <View style={[styles.inner, { height: s.height, paddingHorizontal: s.px }]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={s.icon} color={p.fg} />}
          <AppText style={{ fontFamily: fonts.bold, fontSize: s.font, color: p.fg }} numberOfLines={1}>
            {label}
          </AppText>
          {iconRight && <Ionicons name={iconRight} size={s.icon} color={p.fg} />}
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
        styles.base,
        { backgroundColor: variant === 'primary' ? undefined : p.bg },
        p.border ? { borderWidth: 1.5, borderColor: p.border } : null,
        variant === 'primary' && !inactive ? shadows.primary : null,
        fullWidth ? styles.full : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: 'hidden', alignSelf: 'flex-start' },
  gradient: { borderRadius: radius.md },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.55 },
});
