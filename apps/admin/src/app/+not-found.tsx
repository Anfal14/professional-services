import { router } from 'expo-router';
import { View } from 'react-native';
import { colors, EmptyState } from '@profecian/ui';

export default function NotFound() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <EmptyState icon="compass-outline" title="Page not found" message="This admin page doesn't exist." actionLabel="Go to dashboard" onAction={() => router.replace('/')} />
    </View>
  );
}
