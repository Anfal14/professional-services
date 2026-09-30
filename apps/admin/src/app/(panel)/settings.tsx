import { useState } from 'react';
import { View } from 'react-native';
import { computeBreakdown, formatINR, ROLE_PERMISSIONS, useAction, useBackend, useDb } from '@profecian/shared';
import { AppText, Banner, Button, confirmAction, KeyValue, spacing, TextField, AppearanceSettings } from '@profecian/ui';
import { Page, Panel, Row } from '@/components/admin';

export default function Settings() {
  const db = useDb();
  const backend = useBackend();
  const [tax, setTax] = useState(String(Math.round(db.settings.taxRate * 100)));
  const [commission, setCommission] = useState(String(Math.round(db.settings.defaultCommissionRate * 100)));
  const [saved, setSaved] = useState(false);
  const save = useAction(backend.admin.updateSettings);
  const reminders = useAction(backend.admin.sendTodayReminders);
  const [sent, setSent] = useState<number | null>(null);
  const example = computeBreakdown(1000, Number(commission) / 100 || 0, Number(tax) / 100 || 0);

  const submit = async () => {
    const t = Number(tax);
    const c = Number(commission);
    if (!(t >= 0 && t <= 28) || !(c >= 0 && c <= 60)) {
      save.setError('GST must be 0–28% and commission 0–60%');
      return;
    }
    await save.run({ taxRate: t / 100, defaultCommissionRate: c / 100 });
    setSaved(true);
  };

  return (
    <Page title="Settings" subtitle="Platform-wide money rules, roles and demo tools." permission="settings">
      <Row min={360}>
        <Panel title="Pricing rules">
          {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : saved ? <Banner tone="success" icon="checkmark-circle" title="Saved — applies to new bookings" /> : null}
          <TextField label="GST on services (%)" keyboardType="numeric" value={tax} onChangeText={(v) => { setTax(v); setSaved(false); }} />
          <TextField label="Default commission (%)" keyboardType="numeric" value={commission} onChangeText={(v) => { setCommission(v); setSaved(false); }} hint="Used when a category has no rate of its own. Categories override this." />
          <View style={{ gap: 2 }}>
            <AppText variant="small">For a ₹1,000 job:</AppText>
            <KeyValue label="Customer pays" value={formatINR(example.total)} />
            <KeyValue label="Platform keeps" value={formatINR(example.commission)} tone="primary" />
            <KeyValue label="Vendor earns" value={formatINR(example.vendorPayout)} tone="success" />
          </View>
          <Button label="Save pricing rules" onPress={submit} loading={save.pending} />
        </Panel>
        <View style={{ gap: spacing.lg }}>
          <Panel title="Theme">
            <AppearanceSettings card={false} />
          </Panel>
          <Panel title="Roles & access">
            {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
              <KeyValue key={role} label={role.replace('_', ' ')} value={perms.join(', ')} />
            ))}
            {db.admins.map((a) => <AppText key={a.id} variant="small">{a.name} · {a.email} · {a.role.replace('_', ' ')}</AppText>)}
          </Panel>
          <Panel title="Automations">
            <AppText variant="small">Vendors get a push reminder for today’s assigned jobs (normally sent by a scheduled job each morning).</AppText>
            {sent != null ? <Banner tone="success" icon="notifications-outline" title={`Sent ${sent} reminder${sent === 1 ? '' : 's'}`} /> : null}
            <Button label="Send today's job reminders" size="sm" variant="secondary" icon="alarm-outline" loading={reminders.pending} onPress={async () => setSent((await reminders.run()) ?? 0)} />
          </Panel>
          <Panel title="Demo data">
            <AppText variant="small">This panel runs on a local mock backend. Reset restores the seeded users, vendors and bookings.</AppText>
            <Button label="Reset demo data" size="sm" variant="danger" icon="refresh" onPress={async () => { if (await confirmAction('Reset demo data', 'All changes made in this browser will be lost.', 'Reset')) await backend.resetDemoData(); }} />
          </Panel>
        </View>
      </Row>
    </Page>
  );
}
