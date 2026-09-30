import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { colors, fonts, gradients, createStyles } from '@/theme';
import { AppText } from './AppText';

export function Logo({ light = false, size = 34 }: { light?: boolean; size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Profecian">
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, { width: size, height: size, borderRadius: size * 0.32 }]}
      >
        <Ionicons name="flash" size={size * 0.55} color={colors.white} />
      </LinearGradient>
      <AppText style={[styles.word, { color: light ? colors.white : colors.ink, fontSize: size * 0.6 }]}>
        Profe<AppText style={[styles.word, { color: light ? colors.accentTint : colors.primary, fontSize: size * 0.6 }]}>cian</AppText>
      </AppText>
    </View>
  );
}

const styles = createStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.extrabold, letterSpacing: -0.5 },
}));
