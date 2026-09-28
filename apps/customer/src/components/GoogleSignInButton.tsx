import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { AppText } from './AppText';
import { GoogleMark } from './GoogleMark';
import { PressableScale } from './PressableScale';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/** Outlined button following Google's sign-in branding: white fill, grey hairline, dark label. */
export function GoogleSignInButton({ onPress, loading, disabled }: GoogleSignInButtonProps) {
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      hoverLift
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityHint="Sign in using your Google account"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={styles.button}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.subtle} />
        ) : (
          <GoogleMark size={18} />
        )}
        <AppText style={styles.label}>Continue with Google</AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});
