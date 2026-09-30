import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Theme tokens shared by all three apps.
 *
 * `colors`, `gradients`, `shadows`, `type`, `toneColors` and `chartColors` are
 * live objects: `applyTheme()` rewrites them in place for the chosen accent and
 * light/dark scheme, and `ThemeProvider` remounts the tree so every render and
 * every `createStyles()` sheet picks up the new values. Read them at render
 * time (or inside a `createStyles` factory) — never copy a colour into a
 * module-level constant.
 */

export type ThemeAccent = 'purple' | 'blue';
export type ColorScheme = 'light' | 'dark';

const neutralLight = {
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
  overlay: 'rgba(15, 15, 26, 0.55)',
  /** Translucent top bar. */
  navBg: 'rgba(255,255,255,0.97)',
  /** Resting background of text inputs. */
  inputBg: '#FDFCFF',
  inputErrorBg: '#FFFBFB',
  /** Text/icons placed on an `ink` background (inverted chips, dark buttons). */
  inverse: '#FFFFFF',
  /** Always-dark surface for photo heroes and the footer, in both schemes. */
  night: '#0F0F1A',
};

const neutralDark: typeof neutralLight = {
  ink: '#F3F3F8',
  text: '#D6D6E2',
  muted: '#A3A3B8',
  subtle: '#71738A',
  border: '#272A3A',
  borderStrong: '#363A4F',
  background: '#0D0E14',
  surface: '#161822',
  surfaceAlt: '#1C1F2B',
  success: '#34C77B',
  successSoft: '#11291D',
  warning: '#F0A030',
  warningSoft: '#2E2310',
  danger: '#FF6369',
  dangerSoft: '#361619',
  info: '#6A9CFF',
  infoSoft: '#14223F',
  overlay: 'rgba(0, 0, 0, 0.65)',
  navBg: 'rgba(22,24,34,0.97)',
  inputBg: '#12141C',
  inputErrorBg: '#241315',
  inverse: '#0D0E14',
  night: '#07080C',
};

const fixed = {
  star: '#F5B400',
  whatsapp: '#25D366',
  whatsappDark: '#128C7E',
  // The WhatsApp preview mimics WhatsApp's own light chat, in both schemes.
  whatsappBubble: '#DCF8C6',
  whatsappBg: '#ECE5DD',
  white: '#FFFFFF',
  black: '#000000',
};

interface AccentTokens {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryBorder: string;
  /** Background of a selected card/row. */
  selectedBg: string;
  /** Light accent tint for text on dark photo heroes. */
  accentTint: string;
  /** Deep accent shade (as "r,g,b") for hero overlays. */
  accentShadeRgb: string;
  /** Accent (as "r,g,b") for coloured shadows. */
  accentRgb: string;
  gradient: readonly [string, string];
}

const ACCENTS: Record<ThemeAccent, Record<ColorScheme, AccentTokens>> = {
  purple: {
    light: {
      primary: '#6E42E5', primaryDark: '#5328D6', primarySoft: '#F1ECFF', primaryBorder: '#DCCFFF', selectedBg: '#FBF9FF',
      accentTint: '#C9B8FF', accentShadeRgb: '40,16,110', accentRgb: '110,66,229', gradient: ['#7B4DFF', '#5328D6'],
    },
    dark: {
      primary: '#8B68FF', primaryDark: '#7650F0', primarySoft: '#231C40', primaryBorder: '#3A2F6B', selectedBg: '#1D1830',
      accentTint: '#C9B8FF', accentShadeRgb: '40,16,110', accentRgb: '139,104,255', gradient: ['#8B68FF', '#6A45E8'],
    },
  },
  blue: {
    light: {
      primary: '#1E3A8A', primaryDark: '#172E6E', primarySoft: '#E8EEFA', primaryBorder: '#C4D2F0', selectedBg: '#F7F9FE',
      accentTint: '#AFC4F5', accentShadeRgb: '12,28,78', accentRgb: '30,58,138', gradient: ['#2A4BA8', '#172E6E'],
    },
    dark: {
      primary: '#4A74E0', primaryDark: '#3A62CC', primarySoft: '#15213D', primaryBorder: '#263C6E', selectedBg: '#141C30',
      accentTint: '#AFC4F5', accentShadeRgb: '12,28,78', accentRgb: '74,116,224', gradient: ['#4A74E0', '#2F55B8'],
    },
  },
};

export const ACCENT_OPTIONS: { value: ThemeAccent; label: string; swatch: string }[] = [
  { value: 'purple', label: 'Purple', swatch: ACCENTS.purple.light.primary },
  { value: 'blue', label: 'Dark blue', swatch: ACCENTS.blue.light.primary },
];

function buildColors(accent: ThemeAccent, scheme: ColorScheme) {
  const a = ACCENTS[accent][scheme];
  return {
    primary: a.primary,
    primaryDark: a.primaryDark,
    primarySoft: a.primarySoft,
    primaryBorder: a.primaryBorder,
    selectedBg: a.selectedBg,
    accentTint: a.accentTint,
    ...(scheme === 'dark' ? neutralDark : neutralLight),
    ...fixed,
  };
}

export type Palette = ReturnType<typeof buildColors>;

let currentAccent: ThemeAccent = 'purple';
let currentScheme: ColorScheme = 'light';
let version = 0;

export const colors: Palette = buildColors(currentAccent, currentScheme);

type Gradient = readonly [string, string];

function buildGradients(accent: ThemeAccent, scheme: ColorScheme) {
  const a = ACCENTS[accent][scheme];
  return {
    primary: a.gradient as Gradient,
    hero: ['rgba(15,15,26,0.15)', 'rgba(15,15,26,0.85)'] as Gradient,
    heroSide: [`rgba(${a.accentShadeRgb},0.92)`, 'rgba(15,15,26,0.35)'] as Gradient,
    card: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as Gradient,
  };
}

export const gradients = buildGradients(currentAccent, currentScheme);

/** `rgba()` of the accent's deep shade — for overlays on photo heroes. */
export function accentShade(alpha: number): string {
  return `rgba(${ACCENTS[currentAccent][currentScheme].accentShadeRgb},${alpha})`;
}

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

function buildType(c: Palette) {
  return {
    display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 48, letterSpacing: -1, color: c.ink },
    h1: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 38, letterSpacing: -0.6, color: c.ink },
    h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.3, color: c.ink },
    h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: c.ink },
    body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: c.text },
    bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: c.text },
    small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: c.muted },
    tiny: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: c.muted, letterSpacing: 0.3 },
    label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: c.ink },
  } satisfies Record<string, TextStyle>;
}

export const type = buildType(colors);

function buildShadows(accent: ThemeAccent, scheme: ColorScheme) {
  const dark = scheme === 'dark';
  const shadow = (elevation: number, opacity: number, radiusPx: number, y: number): ViewStyle =>
    Platform.select<ViewStyle>({
      web: { boxShadow: `0px ${y}px ${radiusPx}px ${dark ? `rgba(0, 0, 0, ${opacity * 4})` : `rgba(20, 16, 50, ${opacity})`}` } as ViewStyle,
      default: {
        shadowColor: dark ? '#000000' : '#141032',
        shadowOffset: { width: 0, height: y },
        shadowOpacity: dark ? opacity * 4 : opacity,
        shadowRadius: radiusPx / 2,
        elevation,
      },
    });
  const rgb = ACCENTS[accent][scheme].accentRgb;
  return {
    sm: shadow(2, 0.06, 8, 2),
    md: shadow(5, 0.08, 20, 6),
    lg: shadow(10, 0.12, 36, 14),
    primary: Platform.select<ViewStyle>({
      web: { boxShadow: `0px 10px 24px rgba(${rgb}, ${dark ? 0.25 : 0.35})` } as ViewStyle,
      default: {
        shadowColor: `rgb(${rgb})`,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: dark ? 0.2 : 0.3,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  };
}

export const shadows = buildShadows(currentAccent, currentScheme);

export const layout = {
  maxWidth: 1200,
  navHeight: 64,
  bottomNavHeight: 64,
};

function buildTones(c: Palette) {
  return {
    neutral: { fg: c.muted, bg: c.background },
    info: { fg: c.info, bg: c.infoSoft },
    primary: { fg: c.primary, bg: c.primarySoft },
    warning: { fg: c.warning, bg: c.warningSoft },
    success: { fg: c.success, bg: c.successSoft },
    danger: { fg: c.danger, bg: c.dangerSoft },
  };
}

/** Maps the semantic tones from @profecian/shared (status.ts) to colours. */
export const toneColors = buildTones(colors);

/**
 * Categorical chart palette, fixed order, independent of the accent. Each
 * scheme's set is validated with dataviz validate_palette.js against its chart
 * surface (light #FFFFFF, dark #171923). Fold extra series into "Other".
 */
const CHART_PALETTES: Record<ColorScheme, string[]> = {
  light: ['#6E42E5', '#12A150', '#2563EB', '#D97706'],
  dark: ['#8B68FF', '#1FA866', '#4F86F7', '#CC7A0E'],
};

export const chartColors: string[] = [...CHART_PALETTES.light];

/** Rewrites every live token for the given accent + scheme. */
export function applyTheme(accent: ThemeAccent, scheme: ColorScheme): void {
  if (accent === currentAccent && scheme === currentScheme) return;
  currentAccent = accent;
  currentScheme = scheme;
  Object.assign(colors, buildColors(accent, scheme));
  Object.assign(gradients, buildGradients(accent, scheme));
  Object.assign(type, buildType(colors));
  Object.assign(shadows, buildShadows(accent, scheme));
  Object.assign(toneColors, buildTones(colors));
  chartColors.splice(0, chartColors.length, ...CHART_PALETTES[scheme]);
  version += 1;
}

export function currentTheme(): { accent: ThemeAccent; scheme: ColorScheme; version: number } {
  return { accent: currentAccent, scheme: currentScheme, version };
}

/**
 * Drop-in for `StyleSheet.create` whose values follow the active theme. The
 * factory runs lazily and again after each `applyTheme`, so it may read
 * `colors`, `shadows`, `type` etc. freely.
 */
export function createStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: () => T & StyleSheet.NamedStyles<any>,
): T {
  let sheet: T | undefined;
  let builtFor = -1;
  const resolve = (): T => {
    if (!sheet || builtFor !== version) {
      sheet = StyleSheet.create(factory());
      builtFor = version;
    }
    return sheet;
  };
  return new Proxy({} as T, {
    get: (_target, key) => (resolve() as Record<string | symbol, unknown>)[key],
    has: (_target, key) => key in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, key) => {
      const d = Object.getOwnPropertyDescriptor(resolve(), key);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

/**
 * Colours for a category icon tile. Category tints are pastel (light-only), so
 * dark mode swaps them for the accent's soft tone.
 */
export function tintTile(tint?: string): { bg: string; fg: string } {
  return currentScheme === 'dark' || !tint ? { bg: colors.primarySoft, fg: colors.primary } : { bg: tint, fg: neutralLight.ink };
}
