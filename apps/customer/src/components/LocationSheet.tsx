import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useBackend, type Address } from '@profecian/shared';
import { AppText, Banner, ChipGroup, confirmAction, Sheet, type WebPressableState } from '@profecian/ui';
import { useCustomer } from '@/backend';
import { formatFullAddress, useLocation } from '@/context/LocationContext';
import { CITIES } from '@/data/locations';
import { detectCurrentLocation, LocationError, type CurrentLocation } from '@/services/locationApi';
import { colors, createStyles, fonts, radius, spacing } from '@/theme';
import { AddressSheet } from './AddressSheet';

const LABEL_ICON = { Home: 'home', Work: 'briefcase', Other: 'location' } as const;

/**
 * Zomato-style location picker: use the device location, pick one of several
 * saved addresses (add / edit / delete), or — when browsing — just a city.
 * `checkout` hides the city fallback because a booking needs a real address.
 */
export function LocationSheet({ visible, onClose, checkout = false }: { visible: boolean; onClose: () => void; checkout?: boolean }) {
  const customer = useCustomer();
  const backend = useBackend();
  const pathname = usePathname();
  const { selection, selectedAddress, addresses, selectAddress, selectCity, selectCurrent, city } = useLocation();
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ address?: Address; prefill?: CurrentLocation } | null>(null);

  const requireLogin = () => {
    onClose();
    router.push({ pathname: '/login', params: { next: pathname } });
  };

  const useCurrent = async () => {
    setError(null);
    setDetecting(true);
    try {
      const current = await detectCurrentLocation();
      if (checkout) {
        if (!customer) return requireLogin();
        setForm({ prefill: current });
      } else {
        selectCurrent(current);
        onClose();
      }
    } catch (e) {
      setError(e instanceof LocationError ? e.message : 'We couldn’t get your location. Try again or add your address.');
    } finally {
      setDetecting(false);
    }
  };

  const remove = async (a: Address) => {
    if (!customer) return;
    if (await confirmAction('Delete address', `Remove “${a.label}” — ${a.line}?`, 'Delete')) {
      await backend.customer.deleteAddress(customer.id, a.id);
    }
  };

  return (
    <>
      <Sheet visible={visible && !form} onClose={onClose} title={checkout ? 'Service address' : 'Select a location'}>
        <View style={{ gap: spacing.lg }}>
          <Pressable
            onPress={useCurrent}
            disabled={detecting}
            accessibilityRole="button"
            style={({ hovered }: WebPressableState) => [styles.action, hovered && styles.actionHover]}
          >
            <View style={styles.actionIcon}>
              {detecting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="locate" size={20} color={colors.primary} />}
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.actionTitle}>Use current location</AppText>
              <AppText variant="small">{detecting ? 'Finding you…' : 'Using GPS / browser location'}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>

          <Pressable
            onPress={() => (customer ? setForm({}) : requireLogin())}
            accessibilityRole="button"
            style={({ hovered }: WebPressableState) => [styles.action, hovered && styles.actionHover]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.actionTitle}>Add new address</AppText>
              <AppText variant="small">{customer ? 'Home, work or anywhere else' : 'Log in to save addresses'}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>

          {error ? <Banner tone="warning" icon="alert-circle" title={error} /> : null}

          {addresses.length ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="tiny">SAVED ADDRESSES</AppText>
              {addresses.map((a) => {
                const on = selectedAddress?.id === a.id;
                return (
                  <View key={a.id} style={[styles.address, on && styles.addressOn]}>
                    <Pressable
                      onPress={() => {
                        selectAddress(a);
                        onClose();
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={styles.addressMain}
                    >
                      <Ionicons name={`${LABEL_ICON[a.label]}-outline`} size={20} color={on ? colors.primary : colors.muted} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText style={[styles.addressLabel, on && { color: colors.primary }]}>{a.label}</AppText>
                        <AppText variant="small" numberOfLines={2}>{formatFullAddress(a)}</AppText>
                      </View>
                    </Pressable>
                    <View style={styles.rowActions}>
                      <Pressable onPress={() => setForm({ address: a })} accessibilityRole="button" accessibilityLabel={`Edit ${a.label} address`} hitSlop={6} style={styles.smallBtn}>
                        <Ionicons name="create-outline" size={17} color={colors.muted} />
                      </Pressable>
                      <Pressable onPress={() => remove(a)} accessibilityRole="button" accessibilityLabel={`Delete ${a.label} address`} hitSlop={6} style={styles.smallBtn}>
                        <Ionicons name="trash-outline" size={17} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {!checkout ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="tiny">OR JUST PICK A CITY</AppText>
              <ChipGroup
                value={selection.kind === 'city' ? city : undefined}
                onChange={(c) => {
                  selectCity(c);
                  onClose();
                }}
                options={CITIES.map((c) => ({ value: c, label: c }))}
              />
            </View>
          ) : null}
        </View>
      </Sheet>

      <AddressSheet
        visible={visible && !!form}
        address={form?.address}
        prefill={form?.prefill}
        onClose={() => setForm(null)}
        onSaved={onClose}
      />
    </>
  );
}

const styles = createStyles(() => ({
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  actionHover: { backgroundColor: colors.surfaceAlt },
  actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  address: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  addressOn: { borderColor: colors.primary, backgroundColor: colors.selectedBg },
  addressMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  addressLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  rowActions: { flexDirection: 'row', gap: 2 },
  smallBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
}));
