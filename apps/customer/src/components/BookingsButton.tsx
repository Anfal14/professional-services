import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useUpcomingCount } from '@/context/BookingsContext';
import { colors, fonts, radius } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/** Top-bar shortcut to My Bookings, badged with the number of upcoming visits. */
export function BookingsButton() {
  const upcoming = useUpcomingCount();

  return (
    <PressableScale
      onPress={() => router.navigate('/bookings')}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={upcoming > 0 ? `My Bookings, ${upcoming} upcoming` : 'My Bookings'}
    >
      <Ionicons name="calendar-outline" size={19} color={colors.muted} />
      {upcoming > 0 && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{upcoming > 9 ? '9+' : upcoming}</AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, color: colors.white },
});
