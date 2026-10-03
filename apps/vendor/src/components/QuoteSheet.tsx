import { useState } from 'react';
import { View } from 'react-native';
import { formatINR, useAction, useBackend, type Booking } from '@profecian/shared';
import { AppText, Banner, Button, IconButton, KeyValue, Sheet, spacing, TextField } from '@profecian/ui';

interface Row {
  description: string;
  amount: string;
}

/** Itemised repair quote after inspecting a "Not sure" job. The customer approves it before any repair. */
export function QuoteSheet({ visible, onClose, job, vendorId }: { visible: boolean; onClose: () => void; job: Booking; vendorId: string }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Share repair quote" width={560}>
      {visible ? <QuoteForm job={job} vendorId={vendorId} onDone={onClose} /> : null}
    </Sheet>
  );
}

function QuoteForm({ job, vendorId, onDone }: { job: Booking; vendorId: string; onDone: () => void }) {
  const backend = useBackend();
  const share = useAction(backend.vendor.shareQuote);
  const [rows, setRows] = useState<Row[]>([{ description: '', amount: '' }]);
  const [note, setNote] = useState('');
  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const fee = job.inspection?.fee ?? 0;

  const update = (index: number, patch: Partial<Row>) => setRows((all) => all.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const submit = async () => {
    const lines = rows.map((r) => ({ description: r.description, amount: Number(r.amount) }));
    if (await share.run(vendorId, job.id, lines, note)) onDone();
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="small">
        List what needs fixing and the price of each item (parts + labour, before GST). The customer approves it in the app before you start the repair.
      </AppText>
      {share.error ? <Banner tone="danger" icon="alert-circle" title={share.error} /> : null}
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField label={`Item ${i + 1}`} placeholder="e.g. Replace fan capacitor" value={r.description} onChangeText={(t) => update(i, { description: t })} maxLength={80} />
          </View>
          <View style={{ width: 110 }}>
            <TextField label="₹" placeholder="0" keyboardType="number-pad" value={r.amount} onChangeText={(t) => update(i, { amount: t.replace(/\D/g, '').slice(0, 6) })} />
          </View>
          {rows.length > 1 ? <IconButton icon="trash-outline" label={`Remove item ${i + 1}`} onPress={() => setRows((all) => all.filter((_, n) => n !== i))} /> : null}
        </View>
      ))}
      {rows.length < 10 ? <Button label="Add item" icon="add" variant="ghost" size="sm" onPress={() => setRows((all) => [...all, { description: '', amount: '' }])} /> : null}
      <TextField label="Note for the customer" optional placeholder="e.g. Parts included, takes about 40 minutes" value={note} onChangeText={setNote} multiline maxLength={200} />
      <View style={{ gap: 2 }}>
        <KeyValue label="Quote total (before GST)" value={formatINR(total)} strong />
        <AppText variant="small">If approved it replaces the {formatINR(fee)} inspection fee. If declined, the customer pays only the inspection fee.</AppText>
      </View>
      <Button label="Send quote to customer" icon="send" fullWidth loading={share.pending} onPress={submit} />
    </View>
  );
}
