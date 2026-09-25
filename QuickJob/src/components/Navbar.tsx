import type { WebPressableState } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, layout, radius, shadows } from '@/theme';
import { openWhatsApp } from '@/utils/whatsapp';
import { AppText } from './AppText';
import { Button } from './Button';
import { Container } from './Container';
import { Logo } from './Logo';
import { NAV_ITEMS, isActive } from './navigation';
import { PressableScale } from './PressableScale';

interface NavbarProps {
  /** Show a back button (mobile) instead of the logo */
  back?: boolean;
  /** Title shown next to the back button on mobile */
  title?: string;
}

export function Navbar({ back, title }: NavbarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isMobile, isDesktop } = useResponsive();
  const showBack = back && isMobile;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Container style={styles.bar}>
        <View style={styles.left}>
          {showBack ? (
            <>
              <PressableScale
                onPress={goBack}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color={colors.ink} />
              </PressableScale>
              {title ? (
                <AppText variant="h3" numberOfLines={1} style={styles.title}>
                  {title}
                </AppText>
              ) : null}
            </>
          ) : (
            <Pressable onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="QuickJob home">
              <Logo size={isMobile ? 32 : 36} />
            </Pressable>
          )}
        </View>

        {!isMobile && (
          <View style={styles.links}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Pressable
                  key={item.href}
                  onPress={() => router.navigate(item.href)}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                  style={({ hovered }: WebPressableState) => [styles.link, (hovered || active) && styles.linkHover]}
                >
                  <AppText style={[styles.linkText, active && styles.linkTextActive]}>{item.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.right}>
          {isDesktop && (
            <Button label="Book a Service" size="sm" icon="flash" onPress={() => router.navigate('/services')} />
          )}
          {!isDesktop && (
            <PressableScale
              onPress={() => openWhatsApp('Hi QuickJob, I need help with a service booking.')}
              style={[styles.iconBtn, styles.waBtn]}
              accessibilityRole="button"
              accessibilityLabel="Chat with us on WhatsApp"
            >
              <Ionicons name="logo-whatsapp" size={20} color={colors.whatsappDark} />
            </PressableScale>
          )}
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 10,
    ...shadows.sm,
  },
  bar: { height: layout.navHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { flexShrink: 1 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  linkHover: { backgroundColor: colors.primarySoft },
  linkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  linkTextActive: { color: colors.primary },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  waBtn: { backgroundColor: '#E8FAF0' },
});
