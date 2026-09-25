import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { APP_CONFIG } from '@/config';
import { services } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, spacing } from '@/theme';
import { openWhatsApp } from '@/utils/whatsapp';
import { AppText } from './AppText';
import { Container } from './Container';
import { Logo } from './Logo';
import { NAV_ITEMS } from './navigation';

export function Footer() {
  const { isMobile } = useResponsive();

  return (
    <View style={styles.wrap}>
      <Container>
        <View style={[styles.grid, isMobile && styles.gridMobile]}>
          <View style={[styles.brand, isMobile && { maxWidth: undefined }]}>
            <Logo light />
            <AppText style={styles.muted}>
              Trusted home services at your doorstep. Verified professionals, transparent pricing and a service
              warranty on every job.
            </AppText>
            <View style={styles.socials}>
              {(['logo-whatsapp', 'logo-instagram', 'logo-facebook', 'logo-linkedin'] as const).map((icon) => (
                <Pressable
                  key={icon}
                  style={styles.social}
                  accessibilityLabel={icon.replace('logo-', '')}
                  onPress={() => icon === 'logo-whatsapp' && openWhatsApp('Hi QuickJob!')}
                >
                  <Ionicons name={icon} size={18} color={colors.white} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.col}>
            <AppText style={styles.heading}>Services</AppText>
            {services.slice(0, 6).map((s) => (
              <Pressable key={s.id} onPress={() => router.navigate(`/service/${s.id}`)}>
                <AppText style={styles.link}>{s.name}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.col}>
            <AppText style={styles.heading}>Company</AppText>
            {NAV_ITEMS.filter((n) => n.href !== '/').map((n) => (
              <Pressable key={n.href} onPress={() => router.navigate(n.href)}>
                <AppText style={styles.link}>{n.label}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.col}>
            <AppText style={styles.heading}>Get in touch</AppText>
            <Pressable onPress={() => Linking.openURL(`tel:${APP_CONFIG.supportPhone.replace(/\s/g, '')}`)}>
              <AppText style={styles.link}>{APP_CONFIG.supportPhone}</AppText>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}>
              <AppText style={styles.link}>{APP_CONFIG.supportEmail}</AppText>
            </Pressable>
            <AppText style={styles.muted}>{APP_CONFIG.hours}</AppText>
          </View>
        </View>

        <View style={styles.bottom}>
          <AppText style={styles.copy}>© {new Date().getFullYear()} QuickJob Technologies. All rights reserved.</AppText>
          <AppText style={styles.copy}>Made with ♥ in India</AppText>
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.ink, paddingTop: spacing.huge, paddingBottom: spacing.xxl, marginTop: spacing.huge },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxxl, justifyContent: 'space-between' },
  gridMobile: { gap: spacing.xxl },
  brand: { maxWidth: 320, gap: spacing.lg, flexBasis: 280, flexGrow: 1 },
  col: { gap: spacing.md, minWidth: 140 },
  heading: { fontFamily: fonts.bold, fontSize: 14, color: colors.white, marginBottom: 4 },
  link: { fontFamily: fonts.medium, fontSize: 14, color: '#B9B9CC' },
  muted: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: '#8E8EA6' },
  socials: { flexDirection: 'row', gap: 10 },
  social: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  copy: { fontFamily: fonts.regular, fontSize: 12, color: '#8E8EA6' },
});
