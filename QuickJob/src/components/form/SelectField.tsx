import type { WebPressableState } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import { AppText } from '../AppText';
import { FieldShell } from './FieldShell';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
  icon?: IconName;
}

interface SelectFieldProps {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  icon?: IconName;
}

const useNativeDriver = Platform.OS !== 'web';

/** Cross-platform dropdown: bottom sheet on phones, centered dialog on larger screens. */
export function SelectField({ label, value, options, onChange, placeholder = 'Select an option', error, required, icon }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (open) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver, speed: 18, bounciness: 4 }).start();
    }
  }, [open, anim]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [isMobile ? 400 : 24, 0] });

  return (
    <FieldShell label={label} required={required} error={error}>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.box, open && styles.focused, !!error && styles.errored]}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        accessibilityState={{ expanded: open }}
      >
        {icon ? <Ionicons name={icon} size={19} color={colors.subtle} /> : null}
        <AppText style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </AppText>
        {selected?.meta ? <AppText style={styles.metaInline}>{selected.meta}</AppText> : null}
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={[styles.backdrop, !isMobile && styles.backdropCenter]} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <Animated.View
            style={[
              styles.sheet,
              isMobile ? styles.sheetMobile : styles.sheetDialog,
              { paddingBottom: isMobile ? insets.bottom + spacing.md : spacing.md, transform: [{ translateY }] },
            ]}
          >
            <Pressable onPress={() => undefined} style={styles.sheetInner}>
              {isMobile && <View style={styles.handle} />}
              <View style={styles.sheetHeader}>
                <AppText variant="h3">{label}</AppText>
                <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close" style={styles.close}>
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>
              <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
                {options.map((o) => {
                  const active = o.value === value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => choose(o.value)}
                      style={({ hovered }: WebPressableState) => [styles.option, hovered && styles.optionHover, active && styles.optionActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      {o.icon ? (
                        <View style={[styles.optIcon, active && { backgroundColor: colors.primary }]}>
                          <Ionicons name={o.icon} size={18} color={active ? colors.white : colors.primary} />
                        </View>
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.optLabel}>{o.label}</AppText>
                        {o.description ? <AppText variant="small">{o.description}</AppText> : null}
                      </View>
                      {o.meta ? <AppText style={styles.optMeta}>{o.meta}</AppText> : null}
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={active ? colors.primary : colors.borderStrong}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  focused: { borderColor: colors.primary },
  errored: { borderColor: colors.danger, backgroundColor: '#FFFBFB' },
  value: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  placeholder: { color: colors.subtle },
  metaInline: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  backdropCenter: { justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  sheet: { backgroundColor: colors.surface, ...shadows.lg },
  sheetMobile: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, maxHeight: '80%' },
  sheetDialog: { borderRadius: radius.xl, width: '100%', maxWidth: 520, maxHeight: '80%' },
  sheetInner: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, flexShrink: 1 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionHover: { backgroundColor: colors.surfaceAlt },
  optionActive: { borderColor: colors.primary, backgroundColor: '#FBF9FF' },
  optIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  optLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  optMeta: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
