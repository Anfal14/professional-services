import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPhone, useAction, useBackend, useDb } from '@profecian/shared';
import { Banner, ChipGroup, FieldShell } from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { TextField } from '@/components/form/TextField';
import { GoogleMark } from '@/components/GoogleMark';
import { Screen } from '@/components/Screen';
import { useCustomer } from '@/backend';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, radius, shadows, spacing } from '@/theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const customer = useCustomer();
  const backend = useBackend();
  const db = useDb();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [city, setCity] = useState<string>(customer?.city ?? '');
  const save = useAction(backend.customer.updateProfile);

  if (!user || !customer) return <Redirect href={{ pathname: '/login', params: { next: '/account' } }} />;

  const signOut = () => {
    logout();
    router.replace('/');
  };

  const submit = async () => {
    if (name.trim().length < 2) return save.setError('Please enter your full name');
    await save.run(customer.id, { name: name.trim(), email: email.trim() || undefined, city });
    setEditing(false);
  };

  return (
    <Screen back title="Account" pageTitle="Account" bottomNav={false}>
      <Container style={styles.page}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initials(user.name)}</AppText>
          </View>
          <AppText variant="h2">{user.name}</AppText>
          <AppText variant="body" color={colors.muted}>
            {user.phone ? formatPhone(user.phone) : user.email} · {user.city}
          </AppText>
          {user.provider === 'google' ? (
            <View style={styles.providerBadge}>
              <GoogleMark size={14} />
              <AppText variant="tiny">Signed in with Google</AppText>
            </View>
          ) : null}
          {!editing ? <Button label="Edit profile" size="sm" variant="ghost" icon="create-outline" onPress={() => setEditing(true)} /> : null}
        </View>

        {editing ? (
          <View style={[styles.card, { alignItems: 'stretch' }]}>
            {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : null}
            <TextField label="Full Name" required value={name} onChangeText={setName} autoCapitalize="words" />
            <TextField label="Email" optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <FieldShell label="City">
              <ChipGroup value={city} onChange={setCity} options={db.settings.cities.map((c) => ({ value: c, label: c }))} />
            </FieldShell>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Save" loading={save.pending} onPress={submit} />
              <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} />
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { alignItems: 'stretch', gap: spacing.md }]}>
          <AppText variant="h3">Saved addresses</AppText>
          {customer.addresses.length === 0 ? <AppText variant="small">Addresses you book with are saved here for next time.</AppText> : null}
          {customer.addresses.map((a) => (
            <View key={a.id} style={{ gap: 2 }}>
              <AppText variant="label">{a.label}</AppText>
              <AppText variant="small">{a.line}{a.landmark ? ` (near ${a.landmark})` : ''}, {a.city} {a.pincode ?? ''}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="My Bookings" icon="calendar-outline" variant="secondary" fullWidth onPress={() => router.push('/bookings')} />
          <Button label="Notifications" icon="notifications-outline" variant="secondary" fullWidth onPress={() => router.push('/notifications')} />
          <Button label="Logout" icon="log-out-outline" variant="outline" fullWidth onPress={signOut} />
        </View>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: spacing.xxxl, gap: spacing.xl, maxWidth: 520 },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.primary },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  actions: { gap: spacing.md },
});
