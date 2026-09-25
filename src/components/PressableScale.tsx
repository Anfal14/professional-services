import { useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed */
  scaleTo?: number;
  /** Subtle lift on web hover */
  hoverLift?: boolean;
}

const useNativeDriver = Platform.OS !== 'web';

/** Pressable with a springy press-in scale and optional hover lift on web. */
export function PressableScale({ children, style, scaleTo = 0.97, hoverLift = false, ...rest }: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(0));

  const springTo = (value: Animated.Value, toValue: number) =>
    Animated.spring(value, { toValue, useNativeDriver, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        springTo(scale, scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        springTo(scale, 1);
        rest.onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        if (hoverLift) springTo(lift, -4);
        rest.onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        if (hoverLift) springTo(lift, 0);
        rest.onHoverOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }, { translateY: lift }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
