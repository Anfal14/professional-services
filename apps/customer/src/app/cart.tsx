import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View, type ScrollView } from 'react-native';
import { computeBreakdown, isSlotAvailable, isValidPhone, useBackend, useDb } from '@profecian/shared';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FormCard } from '@/components/FormCard';
import { DateSelector } from '@/components/form/DateSelector';
import { TextField } from '@/components/form/TextField';
import { TimeSlotSelector } from '@/components/form/TimeSlotSelector';
import { LocationSheet } from '@/components/LocationSheet';
import { Screen } from '@/components/Screen';
import { useCustomer } from '@/backend';
import { useCart } from '@/context/CartContext';
import { formatFullAddress, useLocation } from '@/context/LocationContext';
import { groupCart, OTHER_ISSUE_ID, useCatalog } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, createStyles, fonts, radius, shadows, spacing } from '@/theme';
import type { WebPressableState } from '@/types';
import { formatPrice } from '@/utils/format';

type Field = 'date' | 'time' | 'address' | 'name' | 'phone';

/**
 * Cart + checkout. Each service in the cart becomes one visit (booking) with
 * all of its selected problems; every visit shares the chosen slot and address.
 */
export default function CartScreen() {
  const cart = useCart();
  const { services } = useCatalog();
  const db = useDb();
  const backend = useBackend();
  const customer = useCustomer();
  const { selectedAddress } = useLocation();
  const { isDesktop } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);

  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [touched, setTouched] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const groups = groupCart(services, cart.items);
  const bills = groups.map((g) => {
    const category = db.categories.find((c) => c.id === g.service.id);
    return computeBreakdown(g.subtotal, category?.commissionRate ?? db.settings.defaultCommissionRate, db.settings.taxRate);
  });
  const itemTotal = bills.reduce((s, b) => s + b.serviceAmount, 0);
  const tax = bills.reduce((s, b) => s + b.tax, 0);
  const total = bills.reduce((s, b) => s + b.total, 0);
  const estimate = groups.some((g) => g.estimate);

  if (!groups.length) {
    return (
      <Screen back title="Cart" pageTitle="Your cart">
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          message="Open a service and tap the problems you need fixed — they’ll show up here."
          actionLabel="Browse services"
          onAction={() => router.push('/services')}
        />
      </Screen>
    );
  }

  const errors: Partial<Record<Field, string>> = {};
  if (!date) errors.date = 'Pick a date for the visit';
  if (!time) errors.time = 'Pick a time slot';
  else if (date && !isSlotAvailable(date, time)) errors.time = 'That slot has passed — pick another';
  if (customer && !selectedAddress) errors.address = 'Add or choose the address for the visit';
  if (customer && name.trim().length < 2) errors.name = 'Enter the contact person’s name';
  if (customer && !isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  const missing = Object.keys(errors).length;
  const shown = (f: Field) => (touched ? errors[f] : undefined);

  const pickDate = (d: string) => {
    setDate(d);
    if (time && !isSlotAvailable(d, time)) setTime(undefined);
  };

  const placeOrder = async () => {
    setSubmitError(null);
    if (!customer) {
      router.push({ pathname: '/login', params: { next: '/cart' } });
      return;
    }
    if (missing || !date || !time || !selectedAddress) {
      setTouched(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSubmitting(true);
    const booked: string[] = [];
    try {
      for (const g of groups) {
        const b = await backend.customer.createBooking({
          customerId: customer.id,
          categoryId: g.service.id,
          problemTypeIds: g.problemTypeIds,
          date,
          slot: time,
          address: selectedAddress,
          contactName: name,
          contactPhone: phone,
          notes: g.lines.some((l) => l.issueId === OTHER_ISSUE_ID) ? 'Customer is not sure of the problem — inspection requested' : undefined,
        });
        booked.push(b.id);
        cart.clear(g.service.id);
      }
      router.replace({ pathname: '/success', params: { id: booked[0], more: booked.slice(1).join(',') || undefined } });
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'Something went wrong while booking. Please try again.';
      setSubmitError(booked.length ? `${booked.length} booking placed, but the rest failed: ${reason}` : reason);
    } finally {
      setSubmitting(false);
    }
  };

  const placeLabel = `${groups.length > 1 ? `Place ${groups.length} bookings` : 'Place booking'} · ${formatPrice(total)}`;

  const bill = (
    <View style={styles.bill}>
      <AppText variant="h3">Bill details</AppText>
      <Line label="Item total" value={formatPrice(itemTotal)} />
      <Line label={`GST (${Math.round(db.settings.taxRate * 100)}%)`} value={formatPrice(tax)} />
      <View style={styles.divider} />
      <View style={styles.line}>
        <AppText variant="label">{estimate ? 'Estimated total' : 'To pay'}</AppText>
        <AppText style={styles.total}>{formatPrice(total)}</AppText>
      </View>
      <AppText variant="small">
        {estimate ? 'Some items are priced after inspection — the professional confirms the final amount. ' : ''}
        Pay online or in cash after the service.
      </AppText>
      {isDesktop ? (
        <Button label={customer ? placeLabel : 'Log in to book'} icon={customer ? 'checkmark-circle' : 'log-in-outline'} size="lg" fullWidth loading={submitting} onPress={placeOrder} />
      ) : null}
    </View>
  );

  const actionBar = !isDesktop ? (
    <View style={styles.actionRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="small">{cart.count} {cart.count === 1 ? 'item' : 'items'}</AppText>
        <AppText style={styles.actionTotal}>{formatPrice(total)}</AppText>
      </View>
      <Button label={customer ? (groups.length > 1 ? `Place ${groups.length} bookings` : 'Place booking') : 'Log in to book'} icon={customer ? 'checkmark-circle' : 'log-in-outline'} loading={submitting} onPress={placeOrder} />
    </View>
  ) : undefined;

  return (
    <Screen ref={scrollRef} back title="Cart" pageTitle="Your cart" bottomNav={false} actionBar={actionBar} keyboardShouldPersistTaps="handled">
      <Container style={styles.page}>
        <View style={{ gap: 4, marginBottom: spacing.xl }}>
          <AppText variant="h1" accessibilityRole="header">Your cart</AppText>
          <AppText variant="body" color={colors.muted}>
            {cart.count} {cart.count === 1 ? 'problem' : 'problems'} · {groups.length} {groups.length === 1 ? 'visit' : 'visits'}
            {groups.length > 1 ? ' — each service is handled by its own specialist' : ''}
          </AppText>
        </View>

        <View style={[styles.layout, isDesktop && styles.layoutRow]}>
          <View style={styles.main}>
            {groups.map((g) => (
              <View key={g.service.id} style={styles.group}>
                <View style={styles.groupHead}>
                  <Image source={g.service.image} style={styles.thumb} contentFit="cover" transition={200} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="h3">{g.service.name}</AppText>
                    <AppText variant="small">{g.lines.length} selected · one visit</AppText>
                  </View>
                  <Button label="Add more" size="sm" variant="ghost" icon="add" onPress={() => router.push({ pathname: '/service/[id]', params: { id: g.service.id } })} />
                </View>
                {g.lines.map((l) => (
                  <View key={l.issueId} style={styles.item}>
                    <View style={styles.itemIcon}>
                      <Ionicons name={l.issue.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" numberOfLines={1}>{l.issue.title}</AppText>
                      <AppText variant="small">{l.issue.pricingModel === 'fixed' ? l.issue.duration : l.issue.pricingModel === 'starting_at' ? `Starts at · ${l.issue.duration}` : `Inspection · ${l.issue.duration}`}</AppText>
                    </View>
                    <AppText style={styles.itemPrice}>{formatPrice(l.issue.price)}</AppText>
                    <Pressable
                      onPress={() => cart.remove(g.service.id, l.issueId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${l.issue.title}`}
                      hitSlop={8}
                      style={({ hovered }: WebPressableState) => [styles.remove, hovered && { backgroundColor: colors.dangerSoft }]}
                    >
                      <Ionicons name="close" size={16} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}

            <FormCard title="Visit date" icon="calendar-outline">
              <DateSelector hideLabel value={date} onChange={pickDate} error={shown('date')} />
            </FormCard>
            <FormCard title="Visit time" icon="time-outline">
              <TimeSlotSelector hideLabel date={date} value={time} onChange={setTime} error={shown('time')} />
            </FormCard>

            <FormCard title="Service address" icon="location-outline">
              {!customer ? (
                <View style={{ gap: spacing.md }}>
                  <AppText variant="body" color={colors.muted}>Log in to choose a saved address or add a new one.</AppText>
                  <Button label="Log in to continue" icon="log-in-outline" onPress={() => router.push({ pathname: '/login', params: { next: '/cart' } })} />
                </View>
              ) : selectedAddress ? (
                <View style={styles.addressRow}>
                  <Ionicons name={selectedAddress.label === 'Work' ? 'briefcase' : selectedAddress.label === 'Home' ? 'home' : 'location'} size={20} color={colors.primary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="label">{selectedAddress.label}</AppText>
                    <AppText variant="small">{formatFullAddress(selectedAddress)}</AppText>
                  </View>
                  <Button label="Change" size="sm" variant="outline" onPress={() => setAddressOpen(true)} />
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Button label="Add or choose address" icon="add-circle-outline" variant="secondary" onPress={() => setAddressOpen(true)} />
                  {shown('address') ? <AppText style={styles.error}>{shown('address')}</AppText> : null}
                </View>
              )}
            </FormCard>

            {customer ? (
              <FormCard title="Contact for this visit" icon="person-circle-outline">
                <TextField label="Full Name" required icon="person-outline" value={name} onChangeText={setName} error={shown('name')} autoCapitalize="words" maxLength={60} />
                <TextField
                  label="Contact Number"
                  required
                  prefix="+91"
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^\d\s]/g, ''))}
                  error={shown('phone')}
                  hint="We’ll send booking updates on WhatsApp"
                  keyboardType="phone-pad"
                  maxLength={14}
                />
              </FormCard>
            ) : null}

            {!isDesktop ? bill : null}

            {submitError ? (
              <View style={styles.alert} accessibilityRole="alert">
                <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
                <AppText style={styles.alertText}>{submitError}</AppText>
              </View>
            ) : null}
            {touched && missing && customer ? (
              <View style={styles.pending} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color={colors.warning} />
                <AppText style={styles.pendingText}>Complete {missing} more {missing === 1 ? 'detail' : 'details'} to place your booking.</AppText>
              </View>
            ) : null}
          </View>

          {isDesktop ? <View style={styles.aside}>{bill}</View> : null}
        </View>
      </Container>
      <LocationSheet visible={addressOpen} onClose={() => setAddressOpen(false)} checkout />
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <AppText variant="small">{label}</AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = createStyles(() => ({
  page: { paddingTop: spacing.xxl, maxWidth: 1100 },
  layout: { gap: spacing.xxl },
  layoutRow: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, gap: spacing.lg },
  aside: { width: 360 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 48, height: 48, borderRadius: radius.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  itemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemPrice: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  remove: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger },
  bill: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...shadows.md,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  total: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.primary },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionTotal: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  alertText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger, flex: 1 },
  pending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  pendingText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.warning },
}));
