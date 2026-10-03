import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Platform, View } from 'react-native';
import { bookingProblemNames, formatDate, formatDateTime, formatINR, formatPhone, PAYMENT_METHOD_LABEL, useDb } from '@profecian/shared';
import { Button as UiButton, Card, Divider } from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { useCustomer } from '@/backend';
import { APP_CONFIG } from '@/config';
import { colors, fonts, spacing, createStyles } from '@/theme';

/** Tax invoice for a paid booking. Print / save as PDF from the browser on web. */
export default function Invoice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useCustomer();
  const db = useDb();
  const b = db.bookings.find((x) => x.id === id && x.customerId === customer?.id);
  if (!customer) return <Redirect href={{ pathname: '/login', params: { next: `/invoice/${id}` } }} />;
  if (!b || b.payment.status !== 'paid') {
    return (
      <Screen back title="Invoice" pageTitle="Invoice">
        <EmptyState icon="receipt-outline" title="Invoice not available" message="Invoices are generated once a booking is paid." actionLabel="My Bookings" onAction={() => router.replace('/bookings')} />
      </Screen>
    );
  }
  const category = db.categories.find((c) => c.id === b.categoryId);
  const vendor = db.vendors.find((v) => v.id === b.vendorId);
  const halfTax = Math.round((b.price.tax / 2) * 100) / 100;
  const rate = Math.round((b.price.tax / Math.max(1, b.price.serviceAmount)) * 100);

  return (
    <Screen back title="Invoice" pageTitle={`Invoice ${b.code}`} bottomNav={false} footer={false}>
      <Container style={styles.page}>
        <Card style={styles.invoice}>
          <View style={styles.row}>
            <Logo />
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="h3">TAX INVOICE</AppText>
              <AppText variant="small">INV-{b.code}</AppText>
              <AppText variant="small">{formatDateTime(b.payment.paidAt ?? b.createdAt)}</AppText>
            </View>
          </View>
          <Divider />
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="tiny">BILLED TO</AppText>
              <AppText variant="label">{b.customerName}</AppText>
              <AppText variant="small">{formatPhone(b.customerPhone)}</AppText>
              <AppText variant="small">{b.address.line}, {b.address.city}</AppText>
            </View>
            <View style={{ flex: 1, gap: 2, alignItems: 'flex-end' }}>
              <AppText variant="tiny">FROM</AppText>
              <AppText variant="label">{APP_CONFIG.name} Technologies</AppText>
              <AppText variant="small" style={{ textAlign: 'right' }}>{APP_CONFIG.address}</AppText>
              <AppText variant="small">GSTIN: 29ABCDE1234F1Z5 (placeholder)</AppText>
            </View>
          </View>
          <Divider />
          <View style={styles.tableHead}>
            <AppText style={[styles.th, { flex: 1 }]}>DESCRIPTION</AppText>
            <AppText style={styles.th}>AMOUNT</AppText>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{category?.name} — {bookingProblemNames(db, b).join(', ')}</AppText>
              <AppText variant="small">Booking #{b.code} · {formatDate(b.date)}, {b.slot}{vendor ? ` · by ${vendor.name}` : ''}</AppText>
              {b.inspection ? (
                <AppText variant="small">
                  {b.inspection.status === 'approved' && b.inspection.quote
                    ? `Approved repair: ${b.inspection.quote.lines.map((l) => `${l.description} ${formatINR(l.amount)}`).join(', ')}`
                    : `Inspection visit ${formatINR(b.inspection.fee)}${b.inspection.status === 'no_work_needed' ? ' — no repair needed' : b.inspection.status === 'declined' ? ' — repair quote declined' : ''}`}
                </AppText>
              ) : null}
            </View>
            <AppText variant="bodyMedium">{formatINR(b.price.serviceAmount, { decimals: true })}</AppText>
          </View>
          <Divider />
          <View style={{ gap: 4, alignSelf: 'flex-end', minWidth: 240 }}>
            <Line label="Taxable value" value={formatINR(b.price.serviceAmount, { decimals: true })} />
            <Line label={`CGST (${rate / 2}%)`} value={formatINR(halfTax, { decimals: true })} />
            <Line label={`SGST (${rate / 2}%)`} value={formatINR(b.price.tax - halfTax, { decimals: true })} />
            <Divider style={{ marginVertical: 4 }} />
            <Line label="Total paid" value={formatINR(b.price.total, { decimals: true })} strong />
          </View>
          <Divider />
          <AppText variant="small">
            Paid via {b.payment.method ? PAYMENT_METHOD_LABEL[b.payment.method] : '—'}{b.payment.txnId ? ` · Txn ${b.payment.txnId}` : ''}. Computer-generated invoice; no signature required.
          </AppText>
        </Card>
        {Platform.OS === 'web' ? (
          <UiButton label="Print / Save as PDF" icon="print-outline" variant="outline" onPress={() => typeof window !== 'undefined' && window.print()} style={{ alignSelf: 'center' }} />
        ) : null}
      </Container>
    </Screen>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant={strong ? 'label' : 'small'}>{label}</AppText>
      <AppText style={[styles.amount, strong && { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink }]}>{value}</AppText>
    </View>
  );
}

const styles = createStyles(() => ({
  page: { paddingVertical: spacing.xxl, maxWidth: 760, gap: spacing.lg },
  invoice: { gap: spacing.lg, padding: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  tableHead: { flexDirection: 'row', gap: spacing.lg },
  th: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, letterSpacing: 0.5 },
  amount: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
}));
