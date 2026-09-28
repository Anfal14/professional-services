import Head from 'expo-router/head';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { DEMO, ROLE_PERMISSIONS, useAction, useBackend, useSession } from '@profecian/shared';
import { AppText, Banner, Button, Card, colors, fonts, gradients, radius, spacing, TextField } from '@profecian/ui';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AdminLogin() {
  const backend = useBackend();
  const session = useSession();
  const [email, setEmail] = useState<string>(DEMO.adminEmail);
  const [password, setPassword] = useState('');
  const login = useAction(backend.admin.login);

  if (session?.role === 'admin') return <Redirect href="/" />;

  const submit = () => {
    if (!email.trim() || !password) {
      login.setError('Enter your email and password');
      return;
    }
    login.run(email, password);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Head><title>Sign in | Profecian Admin</title></Head>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.brand}>
            <LinearGradient colors={gradients.primary} style={styles.mark}>
              <Ionicons name="flash" size={20} color={colors.white} />
            </LinearGradient>
            <View>
              <AppText style={styles.word}>Profecian</AppText>
              <AppText variant="tiny">ADMIN CONSOLE</AppText>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <AppText variant="h2">Sign in</AppText>
            <AppText variant="small">Access is limited to Profecian staff. Actions are scoped to your role.</AppText>
          </View>
          <TextField label="Work email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={submit}
            error={login.error}
          />
          <Button label="Sign in" size="lg" fullWidth loading={login.pending} onPress={submit} />
          <Banner
            tone="info"
            icon="flask-outline"
            title="Demo accounts"
            message={`Password for all: ${DEMO.adminPassword}\n${DEMO.adminEmail} (super admin) · ops@ · finance@ · support@profecian.app`}
          />
          <View style={styles.roles}>
            {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
              <AppText key={role} variant="tiny">
                <AppText variant="tiny" color={colors.ink}>{role.replace('_', ' ').toUpperCase()}</AppText> · {perms.join(', ')}
              </AppText>
            ))}
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  card: { width: '100%', maxWidth: 440, gap: spacing.lg, padding: spacing.xxl, borderRadius: radius.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  roles: { gap: 4, paddingTop: spacing.xs },
});
