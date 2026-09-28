import { Redirect, Slot } from 'expo-router';
import { AdminShell, useAdmin } from '@/components/admin';

export default function PanelLayout() {
  const admin = useAdmin();
  if (!admin) return <Redirect href="/login" />;
  return (
    <AdminShell>
      <Slot />
    </AdminShell>
  );
}
