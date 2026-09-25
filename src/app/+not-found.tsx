import { router } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function NotFoundScreen() {
  return (
    <Screen pageTitle="Page not found">
      <EmptyState
        icon="compass-outline"
        title="Page not found"
        message="The page you’re looking for doesn’t exist. Let’s get you back on track."
        actionLabel="Go to Home"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
