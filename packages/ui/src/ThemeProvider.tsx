import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, useColorScheme, View } from 'react-native';
import { AppText, Card, ChipGroup, type WebPressableState } from './primitives';
import { ACCENT_OPTIONS, applyTheme, colors, createStyles, currentTheme, fonts, radius, spacing, type ColorScheme, type ThemeAccent } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePreference {
  accent: ThemeAccent;
  mode: ThemeMode;
}

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

interface ThemeContextValue {
  preference: ThemePreference;
  /** The scheme actually in use (resolves "system"). */
  scheme: ColorScheme;
  setAccent: (accent: ThemeAccent) => void;
  setMode: (mode: ThemeMode) => void;
}

const DEFAULT_PREFERENCE: ThemePreference = { accent: 'purple', mode: 'system' };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parse(raw: string | null): ThemePreference {
  try {
    const p = raw ? (JSON.parse(raw) as Partial<ThemePreference>) : {};
    return {
      accent: p.accent === 'blue' ? 'blue' : 'purple',
      mode: p.mode === 'light' || p.mode === 'dark' ? p.mode : 'system',
    };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/**
 * Loads the saved accent + light/dark preference, applies it to the live theme
 * tokens and remounts `children` whenever the theme changes so every screen
 * re-renders with the new colours. Wrap it around the navigator.
 */
export function ThemeProvider({
  storage,
  storageKey,
  children,
  fallback = null,
}: {
  storage: KeyValueStorage;
  storageKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let active = true;
    storage
      .getItem(storageKey)
      .catch(() => null)
      .then((raw) => active && setPreference(parse(raw)));
    return () => {
      active = false;
    };
  }, [storage, storageKey]);

  const pref = preference ?? DEFAULT_PREFERENCE;
  const scheme: ColorScheme = pref.mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref.mode;
  // Idempotent: rewrites the shared token objects only when accent/scheme change.
  applyTheme(pref.accent, scheme);
  const { version } = currentTheme();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = colors.background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.primary);
  }, [scheme, version]);

  const save = useCallback(
    (next: ThemePreference) => {
      setPreference(next);
      storage.setItem(storageKey, JSON.stringify(next)).catch(() => undefined);
    },
    [storage, storageKey],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference: pref,
      scheme,
      setAccent: (accent) => save({ ...pref, accent }),
      setMode: (mode) => save({ ...pref, mode }),
    }),
    [pref, scheme, save],
  );

  if (!preference) return <>{fallback}</>;

  return (
    <ThemeContext.Provider value={value}>
      <View key={version} style={{ flex: 1, backgroundColor: colors.background }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: 'sunny-outline' | 'moon-outline' | 'phone-portrait-outline' }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/** Settings block: theme colour (purple / dark blue) and light / dark / system mode. */
export function AppearanceSettings({ card = true }: { card?: boolean }) {
  const { preference, setAccent, setMode } = useTheme();
  const body = (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label">Theme colour</AppText>
        <View style={styles.swatches} accessibilityRole="radiogroup">
          {ACCENT_OPTIONS.map((o) => {
            const on = o.value === preference.accent;
            return (
              <Pressable
                key={o.value}
                onPress={() => setAccent(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${o.label} theme`}
                style={({ hovered }: WebPressableState) => [styles.swatch, hovered && !on && styles.swatchHover, on && styles.swatchOn]}
              >
                <View style={[styles.dot, { backgroundColor: o.swatch }]}>
                  {on ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
                <AppText style={[styles.swatchText, on && { color: colors.primary }]}>{o.label}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label">Appearance</AppText>
        <ChipGroup value={preference.mode} onChange={setMode} options={MODE_OPTIONS} />
        <AppText variant="small">System follows your device’s light or dark setting.</AppText>
      </View>
    </View>
  );
  if (!card) return body;
  return (
    <Card style={{ gap: spacing.lg }}>
      <AppText variant="h3">Theme</AppText>
      {body}
    </Card>
  );
}

const styles = createStyles(() => ({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  swatchHover: { backgroundColor: colors.surfaceAlt },
  swatchOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  swatchText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
}));
