import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { formatPhone, useAction, useBackend, useDb } from '@profecian/shared';
import { AppText, asIcon, Banner, Button, ChipGroup, FieldShell, spacing, TextField } from '@profecian/ui';
import { VendorScreen } from '@/components/VendorScreen';

const AREAS: Record<string, string[]> = {
  Solapur: ['Sadar Bazar', 'Hotgi Road', 'Vijapur Naka', 'Akkalkot Road', 'Jule Solapur'],
  Pune: ['Kothrud', 'Hinjewadi', 'Viman Nagar', 'Hadapsar', 'Baner'],
  Mumbai: ['Andheri', 'Bandra', 'Powai', 'Thane', 'Dadar'],
};

export default function Register() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const db = useDb();
  const backend = useBackend();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Solapur');
  const [cats, setCats] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const register = useAction(backend.vendor.register);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async () => {
    if (name.trim().length < 2) return register.setError('Enter your full name as on Aadhaar');
    if (!cats.length) return register.setError('Select at least one service you offer');
    const v = await register.run({ phone, name, email, city, categoryIds: cats, serviceAreas: areas.length ? areas : [city] });
    if (v) router.replace('/onboarding');
  };

  return (
    <VendorScreen title="Become a partner" subtitle={`Step 1 of 2 · ${formatPhone(phone)}`} back footer={<Button label="Continue to documents" size="lg" fullWidth iconRight="arrow-forward" loading={register.pending} onPress={submit} />}>
      {register.error ? <Banner tone="danger" icon="alert-circle" title={register.error} /> : null}
      <TextField label="Full name" required placeholder="As on your Aadhaar card" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
      <TextField label="Email" optional placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <FieldShell label="City" required>
        <ChipGroup value={city} onChange={(c) => { setCity(c); setAreas([]); }} options={db.settings.cities.map((c) => ({ value: c, label: c }))} />
      </FieldShell>
      <FieldShell label="Services you offer" required hint="You'll only receive jobs for these categories.">
        <ChipGroup multi value={cats} onChange={(c) => setCats((l) => toggle(l, c))} options={db.categories.filter((c) => c.enabled).map((c) => ({ value: c.id, label: c.name, icon: asIcon(c.icon) }))} />
      </FieldShell>
      <FieldShell label="Service areas" optional hint="Localities you're willing to travel to.">
        <ChipGroup multi value={areas} onChange={(a) => setAreas((l) => toggle(l, a))} options={(AREAS[city] ?? [city]).map((a) => ({ value: a, label: a }))} />
      </FieldShell>
      <View style={{ gap: 4 }}>
        <AppText variant="label">Next: verify your identity</AppText>
        <AppText variant="small">Keep your Aadhaar, PAN, driving licence (if you drive to jobs) and bank details handy.</AppText>
      </View>
      <View style={{ height: spacing.sm }} />
    </VendorScreen>
  );
}
