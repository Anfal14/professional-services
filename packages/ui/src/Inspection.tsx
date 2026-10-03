import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { formatDateTime, formatINR, INSPECTION_STATUS, inspectionNextStep, type Booking, type Role } from '@profecian/shared';
import { AppText, Badge, Banner, Button, Card, Divider, TextField } from './primitives';
import { Sheet } from './widgets';
import { colors, createStyles, fonts, radius, spacing } from './theme';

const AUTHOR: Record<Role, string> = { customer: 'Customer', vendor: 'Professional', admin: 'Support' };

/**
 * Everything about an "Other / Not sure" request, the same for customer,
 * professional and support: what was asked for, what happens next, the
 * questions and answers, and the quote. Role-specific buttons go in `actions`.
 */
export function InspectionPanel({ booking, categoryName, audience, actions }: {
  booking: Booking;
  categoryName?: string;
  audience: Role;
  actions?: ReactNode;
}) {
  const i = booking.inspection;
  if (!i) return null;
  const status = INSPECTION_STATUS[i.status];
  const next = inspectionNextStep(booking, audience);
  const you = audience === 'customer' ? 'You' : 'Customer';

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="help-circle" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">“Other / Not sure”</AppText>
          <AppText variant="small">{you} chose {categoryName ?? 'this service'} but not a specific problem</AppText>
        </View>
        <Badge label={i.awaitingCustomer ? 'Waiting for customer' : status.label} tone={i.awaitingCustomer ? 'warning' : status.tone} />
      </View>

      {next ? (
        <View style={styles.next}>
          <Ionicons name="arrow-forward-circle" size={18} color={colors.primary} />
          <AppText variant="bodyMedium" style={{ flex: 1 }}>{next}</AppText>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <AppText variant="tiny">{audience === 'customer' ? 'YOUR DESCRIPTION' : 'CUSTOMER’S DESCRIPTION'}</AppText>
        <AppText variant="body">{i.description}</AppText>
        {i.photos.length ? (
          <View style={styles.photos}>
            {i.photos.map((u) => (
              <Image key={u} source={u} style={styles.photo} contentFit="cover" accessibilityLabel="Photo of the problem" />
            ))}
          </View>
        ) : null}
      </View>

      {i.messages.length ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="tiny">QUESTIONS & ANSWERS</AppText>
          {i.messages.map((m) => {
            const mine = m.from === audience;
            return (
              <View key={m.id} style={[styles.msg, mine ? styles.msgMine : m.from === 'customer' ? styles.msgCustomer : null]}>
                <AppText variant="tiny">
                  {mine ? 'You' : `${AUTHOR[m.from]} · ${m.authorName}`} · {formatDateTime(m.at)}
                </AppText>
                <AppText variant="body">{m.text}</AppText>
              </View>
            );
          })}
        </View>
      ) : null}

      {i.quote ? (
        <View style={styles.quote}>
          <AppText variant="label">{i.status === 'approved' ? 'Approved quote' : i.status === 'declined' ? 'Declined quote' : 'Repair quote'}</AppText>
          {i.quote.lines.map((l, n) => (
            <View key={n} style={styles.line}>
              <AppText variant="body" style={{ flex: 1 }}>{l.description}</AppText>
              <AppText variant="label">{formatINR(l.amount)}</AppText>
            </View>
          ))}
          <Divider />
          <View style={styles.line}>
            <AppText variant="label">Total (before GST)</AppText>
            <AppText style={styles.total}>{formatINR(i.quote.amount)}</AppText>
          </View>
          {i.quote.note ? <AppText variant="small">“{i.quote.note}”</AppText> : null}
          <AppText variant="small">
            Replaces the {formatINR(i.fee)} inspection fee if approved.
            {i.quote.respondedAt ? ` ${i.status === 'approved' ? 'Approved' : 'Declined'} ${formatDateTime(i.quote.respondedAt)}${i.quote.respondedBy === 'admin' ? ' via support' : ''}.` : ''}
          </AppText>
        </View>
      ) : (
        <AppText variant="small">Inspection fee {formatINR(i.fee)} + GST — replaced by the repair quote if one is approved.</AppText>
      )}

      {i.noWorkNote ? (
        <View style={styles.next}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <AppText variant="body" style={{ flex: 1 }}>{i.noWorkNote}</AppText>
        </View>
      ) : null}

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = createStyles(() => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  next: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  photo: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.background },
  msg: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: 2 },
  msgMine: { backgroundColor: colors.selectedBg, borderColor: colors.primaryBorder },
  msgCustomer: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  quote: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryBorder },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));

/** Small sheet to write one message — a question, an answer, or a note — with validation and error display. */
export function ComposeSheet({ visible, onClose, title, label, placeholder, submitLabel, hint, minLength = 2, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  hint?: string;
  minLength?: number;
  /** Resolve to a truthy value on success; errors are shown in the sheet. */
  onSubmit: (text: string) => Promise<unknown>;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {visible ? <ComposeForm label={label} placeholder={placeholder} submitLabel={submitLabel} hint={hint} minLength={minLength} onSubmit={onSubmit} onDone={onClose} /> : null}
    </Sheet>
  );
}

function ComposeForm({ label, placeholder, submitLabel, hint, minLength, onSubmit, onDone }: {
  label: string; placeholder?: string; submitLabel: string; hint?: string; minLength: number;
  onSubmit: (text: string) => Promise<unknown>; onDone: () => void;
}) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (text.trim().length < minLength) return setError(`Please write at least ${minLength} characters`);
    setPending(true);
    setError(null);
    try {
      if (await onSubmit(text.trim())) onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  };
  return (
    <View style={{ gap: spacing.lg }}>
      {error ? <Banner tone="danger" icon="alert-circle" title={error} /> : null}
      <TextField label={label} placeholder={placeholder} value={text} onChangeText={setText} multiline hint={hint} maxLength={500} autoFocus />
      <Button label={submitLabel} icon="send" fullWidth loading={pending} onPress={submit} />
    </View>
  );
}
