import type { IconName } from '@/data/services';
import type { WebPressableState } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPhone, useDb } from '@profecian/shared';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, fonts, layout, radius, shadows, spacing } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

interface MenuItemProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: number;
}

function MenuItem({ icon, label, onPress, danger, badge }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      style={({ hovered }: WebPressableState) => [styles.menuItem, hovered && styles.menuItemHover]}
    >
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.ink} />
      <AppText style={[styles.menuItemText, danger && { color: colors.danger }]}>{label}</AppText>
      {badge ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{badge > 9 ? '9+' : badge}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Account entry point. Signed out → goes to mobile OTP login (app/login.tsx);
 * signed in → menu (Account, My Bookings, Notifications, Logout).
 *
 * `variant="tab"` renders it as a bottom-bar tab (mobile); the default
 * `variant="circle"` is the compact top-bar version used on web.
 */
export function NavAvatar({ variant = 'circle' }: { variant?: 'circle' | 'tab' }) {
  const { user, logout } = useAuth();
  const db = useDb();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const unread = user ? db.notifications.filter((n) => n.audience === 'customer' && n.recipientId === user.id && !n.read).length : 0;

  const onPress = () => (user ? setOpen(true) : router.push('/login'));
  const close = () => setOpen(false);
  const goTo = (href: '/account' | '/bookings' | '/notifications') => {
    close();
    router.push(href);
  };
  const doLogout = () => {
    close();
    logout();
  };

  const label = user ? `Account menu for ${user.name}` : 'Log in';

  return (
    <>
      {variant === 'tab' ? (
        <Pressable onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityLabel={label}>
          <View style={styles.tabPill}>
            {user ? <AppText style={styles.tabInitials}>{initials(user.name)}</AppText> : <Ionicons name="person-outline" size={21} color={colors.muted} />}
            {unread ? <View style={styles.dot} /> : null}
          </View>
          <AppText style={styles.tabLabel} numberOfLines={1}>
            {user ? 'Account' : 'Log in'}
          </AppText>
        </Pressable>
      ) : (
        <PressableScale onPress={onPress} style={[styles.avatar, user && styles.avatarActive]} accessibilityRole="button" accessibilityLabel={label}>
          {user ? <AppText style={styles.initials}>{initials(user.name)}</AppText> : <Ionicons name="person-outline" size={19} color={colors.muted} />}
          {unread ? <View style={styles.dot} /> : null}
        </PressableScale>
      )}

      <Modal visible={open && !!user} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={[styles.backdrop, isMobile ? styles.backdropBottom : styles.backdropTopRight]} onPress={close} accessibilityLabel="Close">
          <Pressable
            onPress={() => undefined}
            style={[styles.sheet, isMobile ? styles.sheetMobile : styles.sheetDesktop, isMobile && { paddingBottom: insets.bottom + spacing.lg }]}
          >
            {isMobile && <View style={styles.handle} />}
            {user ? (
              <View style={styles.menu}>
                <View style={styles.menuHeader}>
                  <View style={styles.menuAvatar}>
                    <AppText style={styles.menuInitials}>{initials(user.name)}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" numberOfLines={1}>{user.name}</AppText>
                    <AppText variant="small" numberOfLines={1}>{user.phone ? formatPhone(user.phone) : user.email}</AppText>
                  </View>
                </View>
                <View style={styles.menuDivider} />
                <MenuItem icon="person-circle-outline" label="Account" onPress={() => goTo('/account')} />
                <MenuItem icon="calendar-outline" label="My Bookings" onPress={() => goTo('/bookings')} />
                <MenuItem icon="notifications-outline" label="Notifications" badge={unread} onPress={() => goTo('/notifications')} />
                <View style={styles.menuDivider} />
                <MenuItem icon="log-out-outline" label="Logout" onPress={doLogout} danger />
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  avatarActive: { backgroundColor: colors.primarySoft },
  initials: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  dot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.white },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabPill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabInitials: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  backdropBottom: { justifyContent: 'flex-end' },
  backdropTopRight: { justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: layout.navHeight + spacing.sm, paddingRight: spacing.xxl },
  sheet: { backgroundColor: colors.surface, ...shadows.lg },
  sheetMobile: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheetDesktop: { width: 300, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  menu: { gap: 2 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  menuAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  menuInitials: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6, borderRadius: radius.md },
  menuItemHover: { backgroundColor: colors.surfaceAlt },
  menuItemText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
});
