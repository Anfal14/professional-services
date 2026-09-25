import { Children, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

interface GridProps {
  children: ReactNode;
  columns: number;
  gap?: number;
}

/** Responsive equal-width grid built on flex-wrap. */
export function Grid({ children, columns, gap = 16 }: GridProps) {
  const width = `${100 / columns}%` as DimensionValue;
  return (
    <View style={[styles.row, { marginHorizontal: -gap / 2, rowGap: gap }]}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={{ width, paddingHorizontal: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
