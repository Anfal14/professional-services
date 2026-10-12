import { Redirect, Slot } from 'expo-router';
import { AdminShell, useAdmin } from '@/components/admin';
import { CityScopeProvider } from '@/components/cityScope';

export default function PanelLayout() {
  const admin = useAdmin();
  if (!admin) return <Redirect href="/login" />;
  return (
    <CityScopeProvider>
      <AdminShell>
        <Slot />
      </AdminShell>
    </CityScopeProvider>
  );
}
