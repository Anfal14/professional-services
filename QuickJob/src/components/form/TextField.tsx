import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import type { IconName } from '@/data/services';
import { colors, fonts, radius } from '@/theme';
import { AppText } from '../AppText';
import { FieldShell } from './FieldShell';

interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: IconName;
  prefix?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  required?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, icon, prefix, error, hint, optional, required, multiline, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <FieldShell label={label} optional={optional} required={required} error={error} hint={hint}>
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.primary : colors.subtle}
            style={multiline ? styles.iconTop : undefined}
          />
        ) : null}
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
          accessibilityLabel={label}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
      </View>
    </FieldShell>
  );
});

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
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  focused: { borderColor: colors.primary, backgroundColor: '#FDFCFF' },
  errored: { borderColor: colors.danger, backgroundColor: '#FFFBFB' },
  iconTop: { marginTop: 2 },
  prefix: { paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.border },
  prefixText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 12,
    minWidth: 0,
    outlineStyle: 'none',
  } as object,
  inputMultiline: { minHeight: 72, paddingVertical: 0, textAlignVertical: 'top' },
});
