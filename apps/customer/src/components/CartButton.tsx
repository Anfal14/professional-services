import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useCart } from '@/context/CartContext';
import { colors, createStyles, fonts, radius } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/** Top-bar cart shortcut, badged with the number of selected problems. */
export function CartButton() {
  const { count } = useCart();

  return (
    <PressableScale
      onPress={() => router.navigate('/cart')}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
    >
      <Ionicons name={count > 0 ? 'cart' : 'cart-outline'} size={21} color={count > 0 ? colors.primary : colors.muted} />
      {count > 0 && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{count > 9 ? '9+' : count}</AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = createStyles(() => ({
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
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, color: colors.white },
}));
