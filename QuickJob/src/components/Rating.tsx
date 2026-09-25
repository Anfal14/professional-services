import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { AppText } from './AppText';

export function Rating({ value, reviews, light }: { value: number; reviews?: string; light?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel={`Rated ${value} out of 5${reviews ? ` from ${reviews} reviews` : ''}`}>
      <Ionicons name="star" size={13} color={colors.star} />
      <AppText style={[styles.value, light && { color: colors.white }]}>{value.toFixed(1)}</AppText>
      {reviews ? <AppText style={[styles.reviews, light && { color: 'rgba(255,255,255,0.8)' }]}>({reviews})</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  reviews: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
