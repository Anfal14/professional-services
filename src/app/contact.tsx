import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { FadeIn } from '@/components/FadeIn';
import { TextField } from '@/components/form/TextField';
import { Grid } from '@/components/Grid';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { APP_CONFIG } from '@/config';
import type { IconName } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, radius, shadows, spacing } from '@/theme';
import { isValidPhone } from '@/utils/validation';
import { openWhatsApp } from '@/utils/whatsapp';

const FAQS = [
  { q: 'How are QuickJob professionals verified?', a: 'Every professional goes through ID and address verification, a background check and a skills assessment before they can accept jobs.' },
  { q: 'When do I pay?', a: 'You pay only after the job is complete — by UPI, card or cash. The professional confirms the final price before starting any work.' },
  { q: 'Can I reschedule or cancel?', a: 'Yes. Cancel for free from My Bookings up to 2 hours before your slot, or message us on WhatsApp to reschedule.' },
  { q: 'What if I’m not happy with the service?', a: 'Most services carry a 30-day warranty. Raise a request and we’ll send a professional to fix it at no extra cost.' },
];

export default function ContactScreen() {
  const { isMobile, isDesktop, select } = useResponsive();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; message?: string }>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const channels: { icon: IconName; title: string; value: string; color: string; bg: string; onPress: () => void }[] = [
    { icon: 'call', title: 'Call us', value: APP_CONFIG.supportPhone, color: colors.primary, bg: colors.primarySoft, onPress: () => Linking.openURL(`tel:${APP_CONFIG.supportPhone.replace(/\s/g, '')}`) },
    { icon: 'logo-whatsapp', title: 'WhatsApp', value: 'Reply in ~2 mins', color: colors.whatsappDark, bg: '#E8FAF0', onPress: () => openWhatsApp('Hi QuickJob!') },
    { icon: 'mail', title: 'Email', value: APP_CONFIG.supportEmail, color: colors.info, bg: colors.infoSoft, onPress: () => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`) },
    { icon: 'time', title: 'Support hours', value: APP_CONFIG.hours, color: colors.warning, bg: colors.warningSoft, onPress: () => undefined },
  ];

  const submit = () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please enter your name';
    if (!isValidPhone(phone)) next.phone = 'Enter a valid 10-digit mobile number';
    if (message.trim().length < 10) next.message = 'Please tell us a little more (min. 10 characters)';
    setErrors(next);
    if (Object.keys(next).length) return;
    openWhatsApp(`Hi QuickJob, this is ${name.trim()} (+91 ${phone.trim()}).\n\n${message.trim()}`);
  };

  return (
    <Screen pageTitle="Contact Us">
      <View style={styles.header}>
        <Container>
          <FadeIn style={{ gap: spacing.sm, alignItems: 'center' }}>
            <AppText style={styles.eyebrow}>CONTACT US</AppText>
            <AppText variant={isMobile ? 'h1' : 'display'} align="center" accessibilityRole="header">
              We’re here to help
            </AppText>
            <AppText variant="body" color={colors.muted} align="center" style={{ maxWidth: 520 }}>
              Questions about a booking, pricing or becoming a partner? Reach out — a real person will get back to you.
            </AppText>
          </FadeIn>
        </Container>
      </View>

      <Container style={{ marginTop: spacing.xxl }}>
        <Grid columns={select({ mobile: 2, desktop: 4 })} gap={isMobile ? 12 : 16}>
          {channels.map((c, i) => (
            <FadeIn key={c.title} delay={70 * i}>
              <PressableScale onPress={c.onPress} hoverLift style={styles.channel} accessibilityRole="button" accessibilityLabel={`${c.title}: ${c.value}`}>
                <View style={[styles.channelIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={22} color={c.color} />
                </View>
                <AppText variant="label">{c.title}</AppText>
                <AppText variant="small" numberOfLines={2}>
                  {c.value}
                </AppText>
              </PressableScale>
            </FadeIn>
          ))}
        </Grid>
      </Container>

      <Container style={styles.section}>
        <View style={[styles.split, !isDesktop && { flexDirection: 'column' }]}>
          <View style={[styles.formCard, isDesktop && { flex: 1.1 }]}>
            <AppText variant="h2">Send us a message</AppText>
            <AppText variant="small" style={{ marginTop: -8 }}>
              Your message opens in WhatsApp so you can track our reply in one place.
            </AppText>
            <TextField label="Your Name" required icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" />
            <TextField
              label="Contact Number"
              required
              prefix="+91"
              placeholder="98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^\d\s]/g, ''))}
              error={errors.phone}
              maxLength={14}
              autoComplete="tel"
            />
            <TextField label="Message" required multiline placeholder="How can we help?" value={message} onChangeText={setMessage} error={errors.message} maxLength={500} />
            <Button label="Send via WhatsApp" icon="logo-whatsapp" variant="whatsapp" size="lg" fullWidth onPress={submit} />
          </View>

          <View style={[{ gap: spacing.lg }, isDesktop && { flex: 1 }]}>
            <View style={styles.office}>
              <View style={styles.officeIcon}>
                <Ionicons name="business" size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText style={styles.officeTitle}>Head office</AppText>
                <AppText style={styles.officeText}>{APP_CONFIG.address}</AppText>
              </View>
            </View>

            <SectionHeader title="Frequently asked questions" />
            <View style={{ gap: 10, marginTop: -8 }}>
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <Pressable
                    key={f.q}
                    onPress={() => setOpenFaq(open ? null : i)}
                    style={[styles.faq, open && styles.faqOpen]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <View style={styles.faqHead}>
                      <AppText variant="label" style={{ flex: 1 }}>
                        {f.q}
                      </AppText>
                      <Ionicons name={open ? 'remove-circle' : 'add-circle-outline'} size={22} color={colors.primary} />
                    </View>
                    {open && (
                      <FadeIn duration={250} offset={6}>
                        <AppText variant="small" style={{ marginTop: 8 }}>
                          {f.a}
                        </AppText>
                      </FadeIn>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingVertical: spacing.huge, borderBottomWidth: 1, borderBottomColor: colors.border },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: colors.primary },
  channel: {
    gap: 6,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 150,
    ...shadows.sm,
  },
  channelIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  section: { marginTop: 48 },
  split: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'flex-start' },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    gap: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    ...shadows.md,
  },
  office: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.xl },
  officeIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  officeTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  officeText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.75)' },
  faq: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  faqOpen: { borderColor: colors.primaryBorder, backgroundColor: '#FDFCFF' },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
