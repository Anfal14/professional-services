import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, shadows, createStyles } from '@/theme';
import { Button } from './Button';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  showButton?: boolean;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  /** Smaller variant for tight spaces like the navbar — no shadow, ~40px tall. */
  compact?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search for AC repair, cleaning…',
  showButton,
  style,
  autoFocus,
  compact,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, focused && styles.focused, style]}>
      <Ionicons name="search" size={compact ? 16 : 20} color={focused ? colors.primary : colors.muted} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        style={[styles.input, compact && styles.inputCompact]}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search services"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search" style={styles.clear}>
          <Ionicons name="close-circle" size={compact ? 16 : 20} color={colors.subtle} />
        </Pressable>
      )}
      {showButton && <Button label="Search" size="sm" onPress={onSubmit} style={styles.button} />}
    </View>
  );
}

const styles = createStyles(() => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 6,
    ...shadows.md,
  },
  wrapCompact: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 4,
    shadowOpacity: 0,
    elevation: 0,
  },
  focused: { borderColor: colors.primary },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 14,
    minWidth: 0,
    // Removes the default focus ring on web; focus is shown via the border instead.
    outlineStyle: 'none',
  } as object,
  inputCompact: { fontSize: 13, paddingVertical: 8 },
  clear: { paddingHorizontal: 8 },
  button: { marginLeft: 4 },
}));
