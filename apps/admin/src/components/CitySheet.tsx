import { useState } from 'react';
import { View } from 'react-native';
import { CITY_STATUS_LABEL, cityPrice, formatINR, PRICE_LEVEL_MAX, PRICE_LEVEL_MIN, useAction, useBackend, useDb, type City, type CityStatus } from '@profecian/shared';
import { AppText, Banner, Button, ChipGroup, confirmAction, FieldShell, Sheet, spacing, TextField, Toggle } from '@profecian/ui';

const STATUS_HINT: Record<CityStatus, string> = {
  live: 'Customers can book. Vendors can sign up.',
  coming_soon: 'Shown as coming soon. Vendors can sign up and get verified before launch; customers can’t book yet.',
  paused: 'No new bookings or vendor sign-ups. Existing bookings carry on.',
};

const emptyCity: City = { name: '', state: '', status: 'coming_soon', lat: 0, lng: 0, radiusKm: 25, areas: [], disabledCategoryIds: [], priceLevel: 100 };

/** Add or edit a city: launch status, centre and radius, pricing, localities and which services it offers. */
export function CitySheet({ visible, onClose, initial }: { visible: boolean; onClose: () => void; initial?: City }) {
  const backend = useBackend();
  const db = useDb();
  const [draft, setDraft] = useState<City>(initial ?? emptyCity);
  const [lat, setLat] = useState(initial ? String(initial.lat) : '');
  const [lng, setLng] = useState(initial ? String(initial.lng) : '');
  const [radius, setRadius] = useState(String(initial?.radiusKm ?? 25));
  const [level, setLevel] = useState(String(initial?.priceLevel ?? 100));
  // Empty = each category's own commission rate.
  const [commission, setCommission] = useState(initial?.commissionRate != null ? String(Math.round(initial.commissionRate * 1000) / 10) : '');
  const [area, setArea] = useState('');
  const save = useAction(backend.admin.saveCity);
  const remove = useAction(async (name: string) => {
    await backend.admin.deleteCity(name);
    return true;
  });
  const set = <K extends keyof City>(k: K, v: City[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const categories = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const addArea = () => {
    const a = area.trim();
    if (a && !draft.areas.some((x) => x.toLowerCase() === a.toLowerCase())) set('areas', [...draft.areas, a]);
    setArea('');
  };

  const submit = async () => {
    const pending = area.trim() && !draft.areas.includes(area.trim()) ? [...draft.areas, area.trim()] : draft.areas;
    const priceLevel = Number(level);
    if (!Number.isInteger(priceLevel) || priceLevel < PRICE_LEVEL_MIN || priceLevel > PRICE_LEVEL_MAX) {
      save.setError(`Price level must be a whole percentage between ${PRICE_LEVEL_MIN} and ${PRICE_LEVEL_MAX}`);
      return;
    }
    const commissionRate = commission.trim() === '' ? null : Number(commission) / 100;
    if (commissionRate !== null && !(commissionRate >= 0 && commissionRate <= 0.6)) {
      save.setError('City commission must be between 0 and 60%');
      return;
    }
    const ok = await save.run({ ...draft, areas: pending, lat: Number(lat), lng: Number(lng), radiusKm: Number(radius), priceLevel, commissionRate }, initial?.name);
    if (ok) onClose();
  };

  const destroy = async () => {
    if (!initial) return;
    if (!(await confirmAction(`Delete ${initial.name}`, 'Only possible while nobody uses the city. Otherwise pause it.', 'Delete'))) return;
    if (await remove.run(initial.name)) onClose();
  };

  const error = save.error ?? remove.error;
  // "100% keeps base prices", or a worked example from the catalogue.
  const sample = db.problemTypes.find((p) => p.enabled && p.price > 0);
  const lvl = Number(level);
  const priceExample = lvl === 100 || !sample || !Number.isInteger(lvl) || lvl < PRICE_LEVEL_MIN || lvl > PRICE_LEVEL_MAX
    ? '100 = base prices, 120 = 20% higher.'
    : `${sample.name}: ${formatINR(sample.price)} → ${formatINR(cityPrice(sample.price, lvl))} here.`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'New city'}
      width={640}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {initial ? <Button label="Delete" variant="danger" icon="trash-outline" loading={remove.pending} onPress={destroy} /> : null}
          <View style={{ flex: 1 }}>
            <Button label={initial ? 'Save changes' : 'Add city'} fullWidth loading={save.pending} onPress={submit} />
          </View>
        </View>
      }
    >
      {error ? <Banner tone="danger" icon="alert-circle" title={error} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <TextField
            label="City"
            required
            placeholder="e.g. Nashik"
            value={draft.name}
            onChangeText={(t) => set('name', t)}
            editable={!initial}
            hint={initial ? 'Can’t be renamed — bookings and addresses refer to it.' : undefined}
          />
        </View>
        <View style={{ flex: 1, minWidth: 200 }}>
          <TextField label="State" placeholder="e.g. Maharashtra" value={draft.state} onChangeText={(t) => set('state', t)} />
        </View>
      </View>

      <FieldShell label="Status" hint={STATUS_HINT[draft.status]}>
        <ChipGroup<CityStatus> value={draft.status} onChange={(v) => set('status', v)} options={(Object.keys(CITY_STATUS_LABEL) as CityStatus[]).map((s) => ({ value: s, label: CITY_STATUS_LABEL[s] }))} />
      </FieldShell>

      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField label="Centre latitude" required keyboardType="numbers-and-punctuation" placeholder="19.9975" value={lat} onChangeText={setLat} />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField label="Centre longitude" required keyboardType="numbers-and-punctuation" placeholder="73.7898" value={lng} onChangeText={setLng} />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <TextField label="Service radius (km)" required keyboardType="number-pad" value={radius} onChangeText={(t) => setRadius(t.replace(/\D/g, ''))} />
        </View>
      </View>
      <AppText variant="small">Tip: in Google Maps, right-click the city centre to copy its coordinates. “Use current location” only matches customers within the radius.</AppText>

      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <TextField
            label="Price level (%)"
            required
            keyboardType="number-pad"
            value={level}
            onChangeText={(t) => setLevel(t.replace(/\D/g, ''))}
            hint={priceExample}
          />
        </View>
        <View style={{ flex: 1, minWidth: 200 }}>
          <TextField
            label="City commission (%)"
            optional
            keyboardType="numeric"
            value={commission}
            onChangeText={setCommission}
            placeholder="Each category’s rate"
            hint="Replaces the category commission for bookings in this city. Leave empty to use the category rates."
          />
        </View>
      </View>
      <AppText variant="small">Prices here are the base price × the level, rounded to the nearest amount ending in 9. You can also set an exact price for one problem in this city under Services. Existing bookings keep their price.</AppText>

      <FieldShell label="Localities" hint="Vendors pick their service areas from these. Tap one to remove it.">
        {draft.areas.length ? (
          <ChipGroup multi value={draft.areas} onChange={(a) => set('areas', draft.areas.filter((x) => x !== a))} options={draft.areas.map((a) => ({ value: a, label: `${a}  ✕` }))} />
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField placeholder="Add a locality" value={area} onChangeText={setArea} onSubmitEditing={addArea} />
          </View>
          <Button label="Add" variant="secondary" disabled={!area.trim()} onPress={addArea} />
        </View>
      </FieldShell>

      <FieldShell label="Services offered here" hint="Turn a service off while you don’t have professionals for it in this city.">
        <View style={{ gap: spacing.sm }}>
          {categories.map((c) => {
            const offered = !draft.disabledCategoryIds.includes(c.id);
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Toggle
                  label={`${c.name} offered in ${draft.name || 'this city'}`}
                  value={offered}
                  onChange={(on) => set('disabledCategoryIds', on ? draft.disabledCategoryIds.filter((id) => id !== c.id) : [...draft.disabledCategoryIds, c.id])}
                />
                <AppText variant="label" style={{ flex: 1 }}>{c.name}</AppText>
                {!c.enabled ? <AppText variant="small">Disabled platform-wide</AppText> : null}
              </View>
            );
          })}
        </View>
      </FieldShell>
    </Sheet>
  );
}
