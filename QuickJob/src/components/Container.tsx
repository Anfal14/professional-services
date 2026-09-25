import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { layout } from '@/theme';

interface ContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

/** Centers content with a max width and responsive side gutters. */
export function Container({ children, style, maxWidth = layout.maxWidth }: ContainerProps) {
  const { gutter } = useResponsive();
  return (
    <View style={[{ width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: gutter }, style]}>{children}</View>
  );
}
