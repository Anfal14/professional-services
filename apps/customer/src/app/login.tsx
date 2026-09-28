import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DEMO, formatPhone, useBackend } from '@profecian/shared';
import { Banner, OtpLogin } from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Container } from '@/components/Container';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Screen } from '@/components/Screen';
import { useCustomer } from '@/backend';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

/** Stand-in for Google OAuth until a backend exists — supplies name/email only. */
const GOOGLE_DEMO = { name: 'Aarav Sharma', email: 'aarav.sharma@example.com' };

/**
 * Mobile OTP login / sign-up. New numbers continue to profile creation.
 * `next` returns the user to where they were (e.g. the booking form).
 */
export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const backend = useBackend();
  const customer = useCustomer();
  const { setProvider } = useAuth();
  const [google, setGoogle] = useState<typeof GOOGLE_DEMO | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (customer) return <Redirect href={(next as never) || '/'} />;

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setGoogleLoading(false);
    setGoogle(GOOGLE_DEMO);
  };

  return (
    <Screen back title="Log in" pageTitle="Log in" bottomNav={false} footer={false}>
      <Container style={styles.page}>
        {google ? (
          <Banner tone="success" icon="logo-google" title={`Signed in with Google as ${google.email}`} message="Verify your mobile number so professionals can reach you and we can send WhatsApp updates." />
        ) : null}
        <OtpLogin
          title={google ? 'Add your mobile number' : 'Log in or sign up'}
          subtitle="We'll send a one-time password to verify your number."
          initialPhone={google ? '' : DEMO.customerPhone}
          requestOtp={backend.customer.requestOtp}
          verifyOtp={async (requestId, code) => {
            const { phone, customer: existing } = await backend.customer.verifyOtp(requestId, code);
            setProvider(google ? 'google' : 'manual');
            if (existing) {
              router.replace((next as never) || '/');
              return;
            }
            router.replace({ pathname: '/profile-setup', params: { phone, next: next ?? '', name: google?.name ?? '', email: google?.email ?? '' } });
          }}
          footer={
            <View style={{ gap: spacing.lg }}>
              {!google ? (
                <>
                  <View style={styles.orRow}>
                    <View style={styles.orLine} />
                    <AppText variant="tiny">OR</AppText>
                    <View style={styles.orLine} />
                  </View>
                  <GoogleSignInButton onPress={continueWithGoogle} loading={googleLoading} />
                </>
              ) : null}
              <AppText variant="small" align="center">
                Demo: {formatPhone(DEMO.customerPhone)} has bookings already · any other number creates a new account.
              </AppText>
            </View>
          }
        />
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: spacing.xxxl, maxWidth: 520, gap: spacing.xl },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
});
