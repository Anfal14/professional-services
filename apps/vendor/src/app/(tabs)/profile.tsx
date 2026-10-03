import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DOC_STATUS, formatPhone, KYC_LABEL, useBackend, useDb } from '@profecian/shared';
import {
  AppText, Avatar, Badge, Button, Card, ChipGroup, colors, confirmAction, Divider, FieldShell, KeyValue, SectionTitle, spacing, TextField, Toggle, AppearanceSettings } from '@profecian/ui';
import { useVendor } from '@/backend';
import { VendorScreen } from '@/components/VendorScreen';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export default function Profile() {
  const vendor = useVendor()!;
  const db = useDb();
  const backend = useBackend();
  const [area, setArea] = useState('');
  const wh = vendor.workingHours;
  const update = (patch: Parameters<typeof backend.vendor.updateProfile>[1]) => backend.vendor.updateProfile(vendor.id, patch);

  return (
    <VendorScreen title="Profile" right={<Button label="Log out" size="sm" variant="ghost" icon="log-out-outline" onPress={() => { backend.logout(); router.replace('/login'); }} />}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={vendor.name} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="h3">{vendor.name}</AppText>
          <AppText variant="small">{formatPhone(vendor.phone)} · {vendor.city}</AppText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <Badge label="Verified partner" tone="success" icon="shield-checkmark" />
            <Badge label={vendor.rating ? `★ ${vendor.rating}` : 'New'} tone="warning" />
          </View>
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Available for new jobs</AppText>
            <AppText variant="small">Turn off when you’re on leave — you won’t be assigned jobs.</AppText>
          </View>
          <Toggle label="Availability" value={vendor.available} onChange={(v) => update({ available: v })} />
        </View>
        <Divider />
        <FieldShell label="Working days">
          <ChipGroup multi value={wh.days.map(String)} onChange={(d) => {
            const n = Number(d);
            update({ workingHours: { ...wh, days: wh.days.includes(n) ? wh.days.filter((x) => x !== n) : [...wh.days, n].sort() } });
          }} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} />
        </FieldShell>
        <FieldShell label="Start time">
          <ChipGroup value={wh.start} onChange={(start) => update({ workingHours: { ...wh, start } })} options={HOURS.filter((h) => h < '12:00').map((h) => ({ value: h, label: h }))} />
        </FieldShell>
        <FieldShell label="End time">
          <ChipGroup value={wh.end} onChange={(end) => update({ workingHours: { ...wh, end } })} options={HOURS.filter((h) => h > '12:00').map((h) => ({ value: h, label: h }))} />
        </FieldShell>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Service areas</AppText>
        <ChipGroup multi value={vendor.serviceAreas} onChange={(a) => update({ serviceAreas: vendor.serviceAreas.filter((x) => x !== a) })} options={vendor.serviceAreas.map((a) => ({ value: a, label: `${a}  ✕` }))} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><TextField placeholder="Add a locality" value={area} onChangeText={setArea} onSubmitEditing={() => { if (area.trim()) { update({ serviceAreas: [...vendor.serviceAreas, area.trim()] }); setArea(''); } }} /></View>
          <Button label="Add" variant="secondary" disabled={!area.trim()} onPress={() => { update({ serviceAreas: [...vendor.serviceAreas, area.trim()] }); setArea(''); }} />
        </View>
        <AppText variant="small">Services: {vendor.categoryIds.map((c) => db.categories.find((x) => x.id === c)?.name).join(', ')}</AppText>
      </Card>

      <View>
        <SectionTitle title="Documents" />
        <Card style={{ gap: spacing.md }}>
          {vendor.kyc.map((k) => (
            <View key={k.type} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{KYC_LABEL[k.type]}</AppText>
                {k.number ? <AppText variant="small">{k.number}</AppText> : null}
              </View>
              <Badge label={DOC_STATUS[k.status].label} tone={DOC_STATUS[k.status].tone} />
            </View>
          ))}
          <Divider />
          <KeyValue label="Bank account" value={vendor.bank ? `${vendor.bank.bankName} ••${vendor.bank.accountLast4}` : 'Not added'} />
          <AppText variant="small">To change documents or bank details, contact partner support.</AppText>
        </Card>
      </View>

      <AppearanceSettings />

      <Card style={{ gap: 2 }}>
        <Button label="My reviews" variant="ghost" icon="star-outline" onPress={() => router.push('/reviews')} />
        <Button label="Notifications" variant="ghost" icon="notifications-outline" onPress={() => router.push('/notifications')} />
        {backend.kind === 'mock' ? <Button label="Reset demo data" variant="ghost" icon="refresh" onPress={async () => { if (await confirmAction('Reset demo data', 'Restore the seeded jobs and wallet?', 'Reset')) await backend.resetDemoData(); }} /> : null}
      </Card>
      <AppText variant="tiny" align="center" color={colors.subtle}>Profecian Partner · demo build (mock backend)</AppText>
    </VendorScreen>
  );
}
