import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { can, useBackend, useSnapshot, type AdminPermission, type AdminUser } from '@profecian/shared';
import {
  AppText, Avatar, Badge, colors, EmptyState, fonts, IconButton, radius, shadows, spacing, type IconName, type WebPressableState,
} from '@profecian/ui';

/* ───────────── Session ───────────── */

export function useAdmin(): AdminUser | null {
  const { db, session } = useSnapshot();
  return session?.role === 'admin' ? db.admins.find((a) => a.id === session.userId) ?? null : null;
}

export const NAV: { href: string; label: string; icon: IconName; perm: AdminPermission }[] = [
  { href: '/', label: 'Dashboard', icon: 'grid-outline', perm: 'dashboard' },
  { href: '/bookings', label: 'Bookings', icon: 'calendar-outline', perm: 'bookings' },
  { href: '/assign', label: 'Vendor assignment', icon: 'git-branch-outline', perm: 'bookings' },
  { href: '/vendors', label: 'Vendors', icon: 'construct-outline', perm: 'vendors' },
  { href: '/users', label: 'Users', icon: 'people-outline', perm: 'users' },
  { href: '/services', label: 'Services', icon: 'layers-outline', perm: 'services' },
  { href: '/payments', label: 'Payments', icon: 'wallet-outline', perm: 'payments' },
  { href: '/reviews', label: 'Reviews & complaints', icon: 'chatbubbles-outline', perm: 'reviews' },
  { href: '/analytics', label: 'Analytics', icon: 'bar-chart-outline', perm: 'analytics' },
  { href: '/settings', label: 'Settings', icon: 'settings-outline', perm: 'settings' },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

/* ───────────── Shell ───────────── */

export function AdminShell({ children }: { children: ReactNode }) {
  const admin = useAdmin();
  const backend = useBackend();
  const { db } = useSnapshot();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 1024;
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = db.notifications.filter((n) => n.audience === 'admin' && !n.read).length;
  const items = NAV.filter((n) => can(admin, n.perm));

  const nav = (
    <View style={styles.navList}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const badge = item.href === '/assign' ? db.bookings.filter((b) => b.status === 'pending_assignment').length
          : item.href === '/vendors' ? db.vendors.filter((v) => v.status === 'pending').length : 0;
        return (
          <Pressable
            key={item.href}
            onPress={() => { setMenuOpen(false); router.navigate(item.href as never); }}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            style={({ hovered }: WebPressableState) => [styles.navItem, hovered && !active && styles.navHover, active && styles.navActive]}
          >
            <Ionicons name={item.icon} size={18} color={active ? colors.primary : colors.muted} />
            <AppText style={[styles.navText, active && { color: colors.primary }]} numberOfLines={1}>{item.label}</AppText>
            {badge ? <Badge label={String(badge)} tone={item.href === '/assign' ? 'warning' : 'info'} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  const account = admin ? (
    <View style={styles.account}>
      <Avatar name={admin.name} size={36} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" numberOfLines={1}>{admin.name}</AppText>
        <AppText variant="tiny" numberOfLines={1}>{admin.role.replace('_', ' ').toUpperCase()}</AppText>
      </View>
      <IconButton icon="log-out-outline" label="Sign out" size={34} onPress={() => backend.logout()} />
    </View>
  ) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {wide ? (
        <View style={styles.sidebar}>
          <Brand />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.lg }}>{nav}</ScrollView>
          {account}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={styles.topbar}>
          {!wide ? <IconButton icon={menuOpen ? 'close' : 'menu'} label="Menu" onPress={() => setMenuOpen((o) => !o)} /> : null}
          {!wide ? <Brand compact /> : <View style={{ flex: 1 }} />}
          <IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.navigate('/notifications' as never)} />
        </View>
        {!wide && menuOpen ? (
          <View style={styles.drawer}>
            {nav}
            {account}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.brand, compact && { flex: 1, padding: 0 }]}>
      <View style={styles.mark}>
        <Ionicons name="flash" size={16} color={colors.white} />
      </View>
      <AppText style={styles.word}>Profecian</AppText>
      <Badge label="Admin" tone="primary" />
    </View>
  );
}

/* ───────────── Page scaffolding ───────────── */

export function Page({ title, subtitle, actions, children, permission }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; permission?: AdminPermission }) {
  const admin = useAdmin();
  const allowed = !permission || can(admin, permission);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Head><title>{`${title} | Profecian Admin`}</title></Head>
      <View style={styles.pageHead}>
        <View style={{ flex: 1, gap: 2, minWidth: 220 }}>
          <AppText variant="h1">{title}</AppText>
          {subtitle ? <AppText variant="small">{subtitle}</AppText> : null}
        </View>
        {allowed ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {allowed ? children : <EmptyState icon="lock-closed-outline" title="No access" message={`Your role (${admin?.role.replace('_', ' ')}) can't open this section. Ask a super admin for access.`} />}
    </ScrollView>
  );
}

export function Panel({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.panel, style]}>
      {title ? (
        <View style={styles.panelHead}>
          <AppText variant="h3" style={{ flex: 1 }}>{title}</AppText>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Responsive row of equal-width columns that wraps under `min` px. */
export function Row({ children, gap = spacing.lg, min = 280 }: { children: ReactNode; gap?: number; min?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {(Array.isArray(children) ? children : [children]).filter(Boolean).map((c, i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: min, minWidth: Math.min(min, 260) }}>{c}</View>
      ))}
    </View>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
            <AppText style={[styles.tabText, on && { color: colors.white }]}>{t.label}</AppText>
            {t.count != null ? (
              <View style={[styles.tabCount, on && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <AppText style={[styles.tabCountText, on && { color: colors.white }]}>{t.count}</AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={16} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.subtle} style={styles.searchInput} accessibilityLabel={placeholder} />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={16} color={colors.subtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ───────────── Data table ───────────── */

export interface Column<T> {
  key: string;
  title: string;
  /** Relative width */
  flex?: number;
  /** Minimum px width (drives horizontal scroll on narrow screens) */
  min?: number;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
}

export function DataTable<T>({ columns, rows, rowKey, onRowPress, empty = 'Nothing to show', pageSize = 15 }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowPress?: (row: T) => void;
  empty?: string;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sort || !sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);
  const minWidth = columns.reduce((s, c) => s + (c.min ?? 120), 0);

  return (
    <View style={styles.table}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
        <View style={{ minWidth, flex: 1 }}>
          <View style={[styles.tr, styles.th]}>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <Pressable
                  key={c.key}
                  disabled={!c.sort}
                  onPress={() => setSort(active ? { key: c.key, dir: sort!.dir === 1 ? -1 : 1 } : { key: c.key, dir: -1 })}
                  style={[styles.cell, { flex: c.flex ?? 1, minWidth: c.min ?? 120 }, c.align === 'right' && styles.right]}
                  accessibilityRole={c.sort ? 'button' : undefined}
                >
                  <AppText style={styles.thText}>{c.title}</AppText>
                  {c.sort ? <Ionicons name={active ? (sort!.dir === 1 ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color={active ? colors.primary : colors.subtle} /> : null}
                </Pressable>
              );
            })}
          </View>
          {visible.length === 0 ? (
            <View style={{ padding: spacing.xxl }}><AppText variant="small" align="center">{empty}</AppText></View>
          ) : (
            visible.map((row) => (
              <Pressable
                key={rowKey(row)}
                disabled={!onRowPress}
                onPress={() => onRowPress?.(row)}
                style={({ hovered }: WebPressableState) => [styles.tr, hovered && onRowPress ? styles.trHover : null]}
                // No button role: cells may contain their own buttons, and <button> can't nest.
              >
                {columns.map((c) => (
                  <View key={c.key} style={[styles.cell, { flex: c.flex ?? 1, minWidth: c.min ?? 120 }, c.align === 'right' && styles.right]}>
                    {c.render(row)}
                  </View>
                ))}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
      {pages > 1 ? (
        <View style={styles.pager}>
          <AppText variant="small">
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of {sorted.length}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <IconButton icon="chevron-back" label="Previous page" size={32} onPress={() => setPage(Math.max(0, current - 1))} />
            <IconButton icon="chevron-forward" label="Next page" size={32} onPress={() => setPage(Math.min(pages - 1, current + 1))} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Two-line cell: primary text + muted secondary. */
export function Cell({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 1 }}>
      <AppText variant="label" numberOfLines={1}>{title}</AppText>
      {sub ? <AppText variant="small" numberOfLines={1}>{sub}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: { width: 248, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.lg },
  mark: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  navList: { paddingHorizontal: spacing.sm, gap: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md },
  navHover: { backgroundColor: colors.surfaceAlt },
  navActive: { backgroundColor: colors.primarySoft },
  navText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, height: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  drawer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: spacing.sm, ...shadows.md },
  page: { padding: spacing.xl, gap: spacing.xl, maxWidth: 1400, width: '100%', alignSelf: 'center', paddingBottom: 64 },
  pageHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md, ...shadows.sm },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tabs: { gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  tabCount: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabCountText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 220, flexGrow: 1, maxWidth: 360 },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink, outlineStyle: 'none', minWidth: 0 } as object,
  table: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 56 },
  trHover: { backgroundColor: colors.surfaceAlt },
  th: { minHeight: 42, backgroundColor: colors.surfaceAlt },
  thText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10 },
  right: { justifyContent: 'flex-end' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
});
