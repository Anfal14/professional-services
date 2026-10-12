import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { CITY_STATUS_LABEL, findCity, useDb, type Database } from '@profecian/shared';
import { AppText, colors, createStyles, fonts, radius, Sheet, spacing, type WebPressableState } from '@profecian/ui';

const STORAGE_KEY = '@profecian/admin/city-filter/v1';

interface CityScope {
  /** The city every section is filtered to, or null for all cities. */
  city: string | null;
  setCity: (city: string | null) => void;
}

const CityScopeContext = createContext<CityScope | null>(null);

/** One city filter shared by every admin section, remembered on this device. */
export function CityScopeProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && saved) setCityState(saved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setCity = useCallback((next: string | null) => {
    setCityState(next);
    (next ? AsyncStorage.setItem(STORAGE_KEY, next) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ city, setCity }), [city, setCity]);
  return <CityScopeContext.Provider value={value}>{children}</CityScopeContext.Provider>;
}

export function useCityScope(): CityScope {
  const ctx = useContext(CityScopeContext);
  if (!ctx) throw new Error('useCityScope must be used within CityScopeProvider');
  const { settings } = useDb();
  // A remembered city that has since been deleted means "all cities".
  const city = ctx.city ? findCity(settings, ctx.city)?.name ?? null : null;
  return { city, setCity: ctx.setCity };
}

/**
 * The snapshot narrowed to one city: bookings at an address there, vendors based there, customers
 * who live or have booked there, and the reviews, complaints and payouts that belong to those.
 * Catalogue, settings, admins and notifications are untouched.
 */
export function scopeDb(db: Database, city: string | null): Database {
  if (!city) return db;
  const key = city.toLowerCase();
  const same = (name: string | undefined) => !!name && name.toLowerCase() === key;

  const bookings = db.bookings.filter((b) => same(b.address.city));
  const bookingIds = new Set(bookings.map((b) => b.id));
  const knownBookingIds = new Set(db.bookings.map((b) => b.id));
  const bookedHere = new Set(bookings.map((b) => b.customerId));
  const vendors = db.vendors.filter((v) => same(v.city));
  const vendorIds = new Set(vendors.map((v) => v.id));
  // A review or complaint follows its booking's city; if the booking isn't loaded, its vendor's.
  const belongs = (bookingId: string, vendorId?: string) => (knownBookingIds.has(bookingId) ? bookingIds.has(bookingId) : !!vendorId && vendorIds.has(vendorId));

  return {
    ...db,
    bookings,
    vendors,
    customers: db.customers.filter((c) => same(c.city) || bookedHere.has(c.id) || c.addresses.some((a) => same(a.city))),
    reviews: db.reviews.filter((r) => belongs(r.bookingId, r.vendorId)),
    complaints: db.complaints.filter((c) => belongs(c.bookingId, c.vendorId)),
    payouts: db.payouts.filter((p) => vendorIds.has(p.vendorId)),
  };
}

/** The snapshot filtered to the selected city (the whole snapshot when no city is selected). */
export function useScopedDb(): Database {
  const db = useDb();
  const { city } = useCityScope();
  return useMemo(() => scopeDb(db, city), [db, city]);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const summary = (db: Database) => `${plural(db.bookings.length, 'booking', 'bookings')} · ${plural(db.vendors.length, 'vendor', 'vendors')}`;

/** Header control that shows the active city filter and opens the picker. */
export function CityFilter() {
  const db = useDb();
  const { city, setCity } = useCityScope();
  const [open, setOpen] = useState(false);
  const choose = (next: string | null) => {
    setCity(next);
    setOpen(false);
  };

  return (
    <>
      <View style={[styles.control, city ? styles.controlOn : null]}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={city ? `City filter: ${city}. Tap to change.` : 'City filter: all cities. Tap to change.'}
          style={({ hovered }: WebPressableState) => [styles.main, hovered && { opacity: 0.8 }]}
        >
          <Ionicons name="location-outline" size={16} color={city ? colors.primary : colors.muted} />
          <AppText style={[styles.label, city ? { color: colors.primary } : null]} numberOfLines={1}>{city ?? 'All cities'}</AppText>
          {city ? null : <Ionicons name="chevron-down" size={14} color={colors.muted} />}
        </Pressable>
        {city ? (
          <Pressable onPress={() => setCity(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear city filter" style={styles.clear}>
            <Ionicons name="close" size={15} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Filter by city" width={460}>
        <AppText variant="small">Applies to the dashboard, bookings, assignment, vendors, users, payments, reviews and analytics until you change it.</AppText>
        <View style={{ gap: spacing.xs }}>
          <Option title="All cities" sub={summary(db)} selected={!city} onPress={() => choose(null)} />
          {db.settings.cities.map((c) => (
            <Option key={c.name} title={c.name} sub={`${CITY_STATUS_LABEL[c.status]} · ${summary(scopeDb(db, c.name))}`} selected={city === c.name} onPress={() => choose(c.name)} />
          ))}
        </View>
      </Sheet>
    </>
  );
}

function Option({ title, sub, selected, onPress }: { title: string; sub: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ hovered }: WebPressableState) => [styles.option, hovered && !selected && { backgroundColor: colors.surfaceAlt }, selected && styles.optionOn]}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="label" style={selected ? { color: colors.primary } : undefined}>{title}</AppText>
        <AppText variant="small">{sub}</AppText>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = createStyles(() => ({
  control: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  controlOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  main: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 10, height: '100%', maxWidth: 220 },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, flexShrink: 1 },
  clear: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.primaryBorder },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md },
  optionOn: { backgroundColor: colors.primarySoft },
}));
