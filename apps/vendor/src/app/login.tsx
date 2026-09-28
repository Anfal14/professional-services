import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Head from 'expo-router/head';
import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO, formatPhone, useBackend } from '@profecian/shared';
import { AppText, colors, fonts, gradients, OtpLogin, spacing } from '@profecian/ui';
import { useVendor } from '@/backend';

const PERKS = [
  { icon: 'cash-outline', text: 'Earn on every job — weekly payouts to your bank' },
  { icon: 'calendar-outline', text: 'Choose your working hours and service areas' },
  { icon: 'shield-checkmark-outline', text: 'Verified customers, upfront pricing, no haggling' },
] as const;

export default function VendorLogin() {
  const backend = useBackend();
  const vendor = useVendor();
  const insets = useSafeAreaInsets();
  if (vendor) return <Redirect href="/" />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Head><title>Partner login | Profecian</title></Head>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={gradients.primary} style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}>
          <View style={styles.brand}>
            <View style={styles.mark}><Ionicons name="flash" size={18} color={colors.primary} /></View>
            <AppText style={styles.word}>Profecian Partner</AppText>
          </View>
          <AppText style={styles.heroTitle}>Grow your business with Profecian</AppText>
          <View style={{ gap: 8 }}>
            {PERKS.map((p) => (
              <View key={p.text} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Ionicons name={p.icon} size={18} color="#E3D9FF" />
                <AppText style={styles.perk}>{p.text}</AppText>
              </View>
            ))}
          </View>
        </LinearGradient>
        <View style={styles.form}>
          <OtpLogin
            title="Login or sign up"
            subtitle="Enter your mobile number. We'll send a one-time password."
            initialPhone={DEMO.vendorPhone}
            requestOtp={backend.vendor.requestOtp}
            verifyOtp={async (requestId, code) => {
              const { phone, vendor: v } = await backend.vendor.verifyOtp(requestId, code);
              if (!v) router.replace({ pathname: '/register', params: { phone } });
              else router.replace('/');
            }}
            footer={
              <AppText variant="small" align="center">
                Demo: {formatPhone(DEMO.vendorPhone)} is an approved partner · {formatPhone(DEMO.pendingVendorPhone)} is awaiting approval · any other number starts registration.
              </AppText>
            }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.white },
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.white, letterSpacing: -0.6, maxWidth: 420 },
  perk: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.92)', flex: 1 },
  form: { padding: spacing.xl, marginTop: -spacing.lg, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
