import { Text, type TextProps, type TextStyle } from 'react-native';
import { type as typeScale } from '@/theme';

type Variant = keyof typeof typeScale;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[typeScale[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}
