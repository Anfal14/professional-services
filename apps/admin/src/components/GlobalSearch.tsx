import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { BOOKING_STATUS, can, CITY_STATUS_LABEL, formatPhone, VENDOR_STATUS, type AdminPermission, type AdminUser } from '@profecian/shared';
import { AppText, colors, createStyles, fonts, radius, Sheet, spacing, type IconName, type WebPressableState } from '@profecian/ui';
import { useLookups } from './lookups';

interface Hit {
  key: string;
  group: string;
  icon: IconName;
  title: string;
  sub: string;
  href: string;
}

const PER_GROUP = 5;
const MIN_CHARS = 2;

/**
 * Search across everything the signed-in admin may open: pages, bookings, vendors, users, services
 * and cities. Always searches all cities, whatever city filter is active.
 */
export function GlobalSearch({ admin, pages, onClose }: {
  admin: AdminUser | null;
  pages: { href: string; label: string; icon: IconName; perm: AdminPermission }[];
  onClose: () => void;
}) {
  const { db, serviceLabel, vendorName } = useLookups();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    const has = (...fields: (string | undefined)[]) => fields.some((f) => !!f && f.toLowerCase().includes(needle));
    // Phone numbers match on digits alone, so "98765 001" finds 9876500101.
    const phone = (p: string) => digits.length >= 4 && p.replace(/\D/g, '').includes(digits);
    const out: Hit[] = [];
    const add = (group: string, list: Omit<Hit, 'group'>[]) => out.push(...list.slice(0, PER_GROUP).map((h) => ({ ...h, group })));

    add('Pages', pages.filter((p) => !needle || has(p.label)).map((p) => ({ key: `page:${p.href}`, icon: p.icon, title: p.label, sub: 'Open section', href: p.href })));
    if (needle.length < MIN_CHARS) return out;

    if (can(admin, 'bookings')) {
      add('Bookings', db.bookings
        .filter((b) => has(b.code, b.customerName, b.address.city, vendorName(b.vendorId)) || phone(b.customerPhone))
        .map((b) => ({ key: `bkg:${b.id}`, icon: 'calendar-outline', title: `${b.code} · ${serviceLabel(b)}`, sub: `${b.customerName} · ${b.address.city} · ${BOOKING_STATUS[b.status].label}`, href: `/bookings/${b.id}` })));
    }
    if (can(admin, 'vendors')) {
      add('Vendors', db.vendors
        .filter((v) => has(v.name, v.city, v.email) || phone(v.phone))
        .map((v) => ({ key: `ven:${v.id}`, icon: 'construct-outline', title: v.name, sub: `${formatPhone(v.phone)} · ${v.city} · ${VENDOR_STATUS[v.status].label}`, href: `/vendors/${v.id}` })));
    }
    if (can(admin, 'users')) {
      add('Users', db.customers
        .filter((c) => has(c.name, c.email, c.city) || phone(c.phone))
        .map((c) => ({ key: `cus:${c.id}`, icon: 'person-outline', title: c.name, sub: `${formatPhone(c.phone)} · ${c.city}${c.blocked ? ' · Blocked' : ''}`, href: `/users/${c.id}` })));
    }
    if (can(admin, 'services')) {
      const byCategory = db.categories.filter((c) => has(c.name, c.tagline)).map((c) => ({ key: `cat:${c.id}`, icon: 'layers-outline' as IconName, title: c.name, sub: c.enabled ? 'Service category' : 'Service category · Disabled', href: `/services/${c.id}` }));
      const byProblem = db.problemTypes.filter((p) => has(p.name)).map((p) => ({ key: `prb:${p.id}`, icon: 'pricetag-outline' as IconName, title: p.name, sub: `Problem type in ${db.categories.find((c) => c.id === p.categoryId)?.name ?? 'a service'}`, href: `/services/${p.categoryId}` }));
      add('Services', [...byCategory, ...byProblem]);
    }
    if (can(admin, 'settings')) {
      add('Cities', db.settings.cities
        .filter((c) => has(c.name, c.state))
        .map((c) => ({ key: `city:${c.name}`, icon: 'business-outline', title: c.name, sub: `${c.state ? `${c.state} · ` : ''}${CITY_STATUS_LABEL[c.status]}`, href: '/cities' })));
    }
    return out;
  }, [q, db, admin, pages, serviceLabel, vendorName]);

  const open = (hit: Hit | undefined) => {
    if (!hit) return;
    onClose();
    router.navigate(hit.href as never);
  };
  const current = Math.min(active, Math.max(0, hits.length - 1));
  const typed = q.trim().length >= MIN_CHARS;

  return (
    <Sheet visible onClose={onClose} title="Search" width={640}>
      <View style={styles.field}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          autoFocus
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setActive(0);
          }}
          onKeyPress={(e) => {
            const { key } = e.nativeEvent;
            if (key === 'ArrowDown' || key === 'ArrowUp') {
              e.preventDefault();
              setActive(Math.max(0, Math.min(hits.length - 1, current + (key === 'ArrowDown' ? 1 : -1))));
            }
          }}
          onSubmitEditing={() => open(hits[current])}
          placeholder="Booking code, name, phone, service or city"
          placeholderTextColor={colors.subtle}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search the admin panel"
          style={styles.input}
        />
        {q ? (
          <Pressable onPress={() => { setQ(''); setActive(0); }} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 2 }} accessibilityRole="list">
        {hits.map((hit, i) => (
          <View key={hit.key}>
            {i === 0 || hits[i - 1].group !== hit.group ? <AppText variant="tiny" style={styles.group}>{hit.group.toUpperCase()}</AppText> : null}
            <Pressable
              onPress={() => open(hit)}
              accessibilityRole="link"
              accessibilityLabel={`${hit.title}, ${hit.sub}`}
              style={({ hovered }: WebPressableState) => [styles.hit, (hovered || i === current) && styles.hitOn]}
            >
              <View style={styles.hitIcon}>
                <Ionicons name={hit.icon} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <AppText variant="label" numberOfLines={1}>{hit.title}</AppText>
                <AppText variant="small" numberOfLines={1}>{hit.sub}</AppText>
              </View>
              {i === current ? <Ionicons name="return-down-back" size={16} color={colors.muted} /> : null}
            </Pressable>
          </View>
        ))}
      </View>

      {typed && !hits.length ? <AppText variant="small" align="center">Nothing matches “{q.trim()}”. Try a booking code, a name or a phone number.</AppText> : null}
      {!typed ? <AppText variant="small">Type at least {MIN_CHARS} characters to search bookings, vendors, users, services and cities. Use ↑ ↓ and Enter to open a result.</AppText> : null}
    </Sheet>
  );
}

const styles = createStyles(() => ({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primaryBorder, backgroundColor: colors.background },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, outlineStyle: 'none', minWidth: 0 } as object,
  group: { marginTop: spacing.md, marginBottom: 4, paddingHorizontal: 6, color: colors.muted },
  hit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.md },
  hitOn: { backgroundColor: colors.surfaceAlt },
  hitIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
}));
