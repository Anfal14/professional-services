import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#6E42E5',
  primaryDark: '#5328D6',
  primarySoft: '#F1ECFF',
  primaryBorder: '#DCCFFF',
  ink: '#0F0F1A',
  text: '#2A2A3C',
  muted: '#6B6B80',
  subtle: '#9A9AAE',
  border: '#ECECF3',
  borderStrong: '#DADAE6',
  background: '#F7F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFD',
  success: '#12A150',
  successSoft: '#E7F8EE',
  warning: '#D97706',
  warningSoft: '#FEF3E2',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  info: '#2563EB',
  infoSoft: '#E8F0FE',
  star: '#F5B400',
  whatsapp: '#25D366',
  whatsappDark: '#128C7E',
  whatsappBubble: '#DCF8C6',
  whatsappBg: '#ECE5DD',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 15, 26, 0.55)',
} as const;

export const gradients = {
  primary: ['#7B4DFF', '#5328D6'] as const,
  hero: ['rgba(15,15,26,0.15)', 'rgba(15,15,26,0.85)'] as const,
  heroSide: ['rgba(40,16,110,0.92)', 'rgba(15,15,26,0.35)'] as const,
  card: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as const,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 48, letterSpacing: -1, color: colors.ink },
  h1: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 38, letterSpacing: -0.6, color: colors.ink },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.3, color: colors.ink },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  tiny: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.muted, letterSpacing: 0.3 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
} satisfies Record<string, TextStyle>;

function shadow(elevation: number, opacity: number, radiusPx: number, y: number): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${y}px ${radiusPx}px rgba(20, 16, 50, ${opacity})` } as ViewStyle,
    default: {
      shadowColor: '#141032',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: radiusPx / 2,
      elevation,
    },
  });
}

export const shadows = {
  sm: shadow(2, 0.06, 8, 2),
  md: shadow(5, 0.08, 20, 6),
  lg: shadow(10, 0.12, 36, 14),
  primary: Platform.select<ViewStyle>({
    web: { boxShadow: '0px 10px 24px rgba(110, 66, 229, 0.35)' } as ViewStyle,
    default: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
};

export const layout = {
  maxWidth: 1200,
  navHeight: 64,
  bottomNavHeight: 64,
};
