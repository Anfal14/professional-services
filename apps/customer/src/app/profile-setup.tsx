import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPhone, useAction, useBackend, useDb } from '@profecian/shared';
import { Banner, ChipGroup, FieldShell } from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { TextField } from '@/components/form/TextField';
import { Screen } from '@/components/Screen';
import { useCustomer } from '@/backend';
import { useLocation } from '@/context/LocationContext';
import { colors, spacing } from '@/theme';

/** Step 2 of sign-up: create the customer profile for a newly verified number. */
export default function ProfileSetup() {
  const params = useLocalSearchParams<{ phone: string; next?: string; name?: string; email?: string }>();
  const backend = useBackend();
  const db = useDb();
  const customer = useCustomer();
  const { city: selectedCity } = useLocation();
  const [name, setName] = useState(params.name ?? '');
  const [email, setEmail] = useState(params.email ?? '');
  const [city, setCity] = useState<string>(selectedCity);
  const create = useAction(backend.customer.createProfile);

  if (customer) return <Redirect href={(params.next as never) || '/'} />;
  if (!params.phone) return <Redirect href="/login" />;

  const submit = async () => {
    if (name.trim().length < 2) return create.setError('Please enter your full name');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return create.setError('Enter a valid email or leave it empty');
    const c = await create.run({ phone: params.phone, name, email, city });
    if (c) router.replace((params.next as never) || '/');
  };

  return (
    <Screen back title="Create profile" pageTitle="Create your profile" bottomNav={false} footer={false}>
      <Container style={styles.page}>
        <View style={{ gap: 6 }}>
          <AppText variant="h1">Welcome to Profecian 👋</AppText>
          <AppText variant="body" color={colors.muted}>
            {formatPhone(params.phone)} is verified. Tell us a little about you to finish signing up.
          </AppText>
        </View>
        {create.error ? <Banner tone="danger" icon="alert-circle" title={create.error} /> : null}
        <TextField label="Full Name" required icon="person-outline" placeholder="e.g. Priya Sharma" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
        <TextField label="Email" optional icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <FieldShell label="City" required hint="We'll show professionals and prices for your city.">
          <ChipGroup value={city} onChange={setCity} options={db.settings.cities.map((c) => ({ value: c, label: c }))} />
        </FieldShell>
        <Button label="Create account" icon="checkmark-circle" size="lg" fullWidth loading={create.pending} onPress={submit} />
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: spacing.xxxl, maxWidth: 520, gap: spacing.xl },
});
