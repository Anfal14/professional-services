import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { PRICING_MODEL_LABEL, useAction, useBackend, useDb, type PricingModel, type ProblemType, type ServiceCategory } from '@profecian/shared';
import {
  AppText, asIcon, Banner, Button, ChipGroup, colors, FieldShell, PhotoPicker, radius, Sheet, spacing, TextField, Toggle,
} from '@profecian/ui';

/** Curated icon choices so admins don't need to know Ionicons names. */
export const ICON_CHOICES = [
  'snow-outline', 'flash-outline', 'water-outline', 'sparkles-outline', 'color-palette-outline', 'hammer-outline', 'bug-outline', 'hardware-chip-outline',
  'construct-outline', 'home-outline', 'bulb-outline', 'toggle-outline', 'sync-outline', 'flame-outline', 'leaf-outline', 'car-outline',
  'tv-outline', 'bed-outline', 'restaurant-outline', 'cut-outline', 'shirt-outline', 'paw-outline', 'umbrella-outline', 'git-network-outline',
];

const TINTS = ['#E8F4FF', '#FFF7E0', '#E6F7F8', '#EAF8EE', '#FFEDEF', '#F7EFE6', '#EEF3E3', '#EEF0FF'];

function IconGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FieldShell label="Icon">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ICON_CHOICES.map((icon) => {
          const on = icon === value;
          return (
            <Pressable key={icon} onPress={() => onChange(icon)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={icon}
              style={{ width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.surface }}>
              <Ionicons name={asIcon(icon)} size={20} color={on ? colors.primary : colors.text} />
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

type CategoryDraft = Omit<ServiceCategory, 'id' | 'sortOrder'> & { id?: string };

const emptyCategory: CategoryDraft = {
  name: '', tagline: '', description: '', icon: 'construct-outline', image: '', tint: TINTS[0], enabled: true, popular: false, commissionRate: 0.2, includes: [],
};

export function CategorySheet({ visible, onClose, initial }: { visible: boolean; onClose: () => void; initial?: ServiceCategory }) {
  const backend = useBackend();
  const db = useDb();
  const [draft, setDraft] = useState<CategoryDraft>(initial ?? emptyCategory);
  const [includes, setIncludes] = useState((initial?.includes ?? []).join(', '));
  const [commission, setCommission] = useState(String(Math.round((initial?.commissionRate ?? 0.2) * 100)));
  // Empty = use the platform default inspection fee.
  const [inspectionFee, setInspectionFee] = useState(initial?.inspectionFee != null ? String(initial.inspectionFee) : '');
  const save = useAction(backend.admin.saveCategory);
  const set = <K extends keyof CategoryDraft>(k: K, v: CategoryDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    const rate = Number(commission);
    if (!(rate >= 0 && rate <= 60)) {
      save.setError('Commission must be between 0 and 60%');
      return;
    }
    const fee = inspectionFee.trim() === '' ? undefined : Number(inspectionFee);
    if (fee !== undefined && !(Number.isInteger(fee) && fee >= 0 && fee <= 10_000)) {
      save.setError('Inspection fee must be a whole amount between ₹0 and ₹10,000');
      return;
    }
    const ok = await save.run({ ...draft, commissionRate: rate / 100, inspectionFee: fee, includes: includes.split(',').map((s) => s.trim()).filter(Boolean) });
    if (ok) onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? `Edit ${initial.name}` : 'New service category'} width={640}
      footer={<Button label={initial ? 'Save changes' : 'Create category'} fullWidth loading={save.pending} onPress={submit} />}>
      {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : null}
      <TextField label="Name" required placeholder="e.g. Electrician" value={draft.name} onChangeText={(t) => set('name', t)} />
      <TextField label="Tagline" placeholder="Wiring, switches, fans & lights" value={draft.tagline} onChangeText={(t) => set('tagline', t)} />
      <TextField label="Description" multiline value={draft.description} onChangeText={(t) => set('description', t)} />
      <IconGrid value={draft.icon} onChange={(v) => set('icon', v)} />
      <FieldShell label="Card tint">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TINTS.map((t) => (
            <Pressable key={t} onPress={() => set('tint', t)} accessibilityLabel={`Tint ${t}`} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t, borderWidth: 2, borderColor: draft.tint === t ? colors.primary : colors.border }} />
          ))}
        </View>
      </FieldShell>
      <TextField label="Image URL" placeholder="https://…" autoCapitalize="none" value={draft.image.startsWith('http') ? draft.image : ''} onChangeText={(t) => set('image', t)} hint="Or upload an image below (stored locally until a backend exists)." />
      <PhotoPicker label="Upload image" value={draft.image && !draft.image.startsWith('http') ? [draft.image] : []} onChange={(u) => set('image', u[0] ?? '')} max={1} />
      <TextField label="Platform commission (%)" keyboardType="numeric" value={commission} onChangeText={setCommission} hint="Deducted from the service amount before the vendor payout." />
      <TextField label="“Other / Not sure” inspection fee (₹)" optional keyboardType="number-pad" value={inspectionFee} onChangeText={(t) => setInspectionFee(t.replace(/\D/g, ''))} placeholder={`Platform default (₹${db.settings.defaultInspectionFee})`} hint="Charged before GST when the customer isn’t sure of the problem; replaced by the repair quote if they approve one." />
      <TextField label="What's included" placeholder="Comma separated, e.g. 30-day warranty, Genuine parts" value={includes} onChangeText={setIncludes} />
      <View style={{ flexDirection: 'row', gap: spacing.xl, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Toggle label="Enabled" value={draft.enabled} onChange={(v) => set('enabled', v)} />
          <AppText variant="label">Enabled for customers</AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Toggle label="Popular" value={draft.popular} onChange={(v) => set('popular', v)} />
          <AppText variant="label">Show as popular</AppText>
        </View>
      </View>
    </Sheet>
  );
}

type ProblemDraft = Omit<ProblemType, 'id'> & { id?: string };

export function ProblemSheet({ visible, onClose, categoryId, initial }: { visible: boolean; onClose: () => void; categoryId: string; initial?: ProblemType }) {
  const backend = useBackend();
  const [draft, setDraft] = useState<ProblemDraft>(initial ?? { categoryId, name: '', description: '', icon: 'construct-outline', price: 0, pricingModel: 'fixed', durationMins: 60, enabled: true });
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [duration, setDuration] = useState(String(initial?.durationMins ?? 60));
  const save = useAction(backend.admin.saveProblemType);
  const set = <K extends keyof ProblemDraft>(k: K, v: ProblemDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    const ok = await save.run({ ...draft, price: Number(price), durationMins: Math.max(5, Number(duration) || 60) });
    if (ok) onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? `Edit ${initial.name}` : 'New problem type'} width={600}
      footer={<Button label={initial ? 'Save changes' : 'Add problem type'} fullWidth loading={save.pending} onPress={submit} />}>
      {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : null}
      <TextField label="Name" required placeholder="e.g. Fan repair" value={draft.name} onChangeText={(t) => set('name', t)} />
      <TextField label="Description" placeholder="Shown under the name to customers" value={draft.description} onChangeText={(t) => set('description', t)} />
      <IconGrid value={draft.icon} onChange={(v) => set('icon', v)} />
      <FieldShell label="Pricing model">
        <ChipGroup<PricingModel> value={draft.pricingModel} onChange={(v) => set('pricingModel', v)} options={(Object.keys(PRICING_MODEL_LABEL) as PricingModel[]).map((m) => ({ value: m, label: PRICING_MODEL_LABEL[m] }))} />
      </FieldShell>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><TextField label="Price (₹)" required keyboardType="numeric" value={price} onChangeText={setPrice} hint={draft.pricingModel === 'starting_at' ? 'Shown as "from ₹…"' : draft.pricingModel === 'inspection' ? 'Visit charge; final quote on site' : undefined} /></View>
        <View style={{ flex: 1 }}><TextField label="Duration (mins)" keyboardType="numeric" value={duration} onChangeText={setDuration} /></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Toggle label="Enabled" value={draft.enabled} onChange={(v) => set('enabled', v)} />
        <AppText variant="label">Enabled for customers</AppText>
      </View>
    </Sheet>
  );
}
