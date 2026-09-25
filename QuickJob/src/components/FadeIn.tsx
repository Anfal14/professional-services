import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  /** Starting vertical offset in px */
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades and slides content up on mount. */
export function FadeIn({ children, delay = 0, duration = 450, offset = 16, style }: FadeInProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
