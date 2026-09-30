import { useState } from 'react';
import { View } from 'react-native';
import { useAction, useBackend, useDb, type Address } from '@profecian/shared';
import { Banner, Button, ChipGroup, FieldShell, Sheet, TextField } from '@profecian/ui';
import { useCustomer } from '@/backend';
import { useLocation } from '@/context/LocationContext';
import type { CurrentLocation } from '@/services/locationApi';
import { spacing } from '@/theme';

type Label = Address['label'];

const LABELS: { value: Label; label: string; icon: 'home-outline' | 'briefcase-outline' | 'location-outline' }[] = [
  { value: 'Home', label: 'Home', icon: 'home-outline' },
  { value: 'Work', label: 'Work', icon: 'briefcase-outline' },
  { value: 'Other', label: 'Other', icon: 'location-outline' },
];

/**
 * Add or edit a saved address. Opened with `prefill` after "Use current
 * location" so the detected city/coordinates carry over; saving selects it.
 */
export function AddressSheet({
  visible,
  onClose,
  address,
  prefill,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  address?: Address;
  prefill?: CurrentLocation;
  onSaved?: (address: Address) => void;
}) {
  // Remount the form each time it opens so it starts from the given address.
  return (
    <Sheet visible={visible} onClose={onClose} title={address ? 'Edit address' : 'Add address'}>
      {visible ? <AddressForm address={address} prefill={prefill} onDone={(a) => { onSaved?.(a); onClose(); }} /> : null}
    </Sheet>
  );
}

function AddressForm({ address, prefill, onDone }: { address?: Address; prefill?: CurrentLocation; onDone: (a: Address) => void }) {
  const customer = useCustomer();
  const backend = useBackend();
  const db = useDb();
  const { city: selectedCity, selectAddress } = useLocation();
  const [label, setLabel] = useState<Label>(address?.label ?? 'Home');
  const [line, setLine] = useState(address?.line ?? (prefill && !prefill.area.startsWith('Pinned') ? prefill.area : ''));
  const [landmark, setLandmark] = useState(address?.landmark ?? '');
  const [city, setCity] = useState(address?.city ?? prefill?.city ?? selectedCity);
  const [pincode, setPincode] = useState(address?.pincode ?? '');
  const [touched, setTouched] = useState(false);
  const save = useAction(backend.customer.saveAddress);

  const lineError = line.trim().length < 10 ? 'Enter house / flat no., building and street' : undefined;
  const pinError = pincode && !/^\d{6}$/.test(pincode) ? 'PIN code has 6 digits' : undefined;

  const submit = async () => {
    setTouched(true);
    if (!customer || lineError || pinError) return;
    const saved = await save.run(customer.id, {
      id: address?.id,
      label,
      line: line.trim(),
      landmark: landmark.trim() || undefined,
      city,
      pincode: pincode || undefined,
      ...(prefill ? { lat: prefill.lat, lng: prefill.lng } : address?.lat != null ? { lat: address.lat, lng: address.lng } : {}),
    });
    if (saved) {
      selectAddress(saved);
      onDone(saved);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {prefill ? (
        <Banner tone="info" icon="navigate" title={`Detected near ${prefill.city}`} message="Add your house / flat number so the professional can find you." />
      ) : null}
      {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : null}
      <FieldShell label="Save as">
        <ChipGroup value={label} onChange={setLabel} options={LABELS} />
      </FieldShell>
      <TextField
        label="House / flat, building, street, area"
        required
        icon="home-outline"
        placeholder="e.g. Flat 302, Sai Residency, MG Road, Navi Peth"
        value={line}
        onChangeText={setLine}
        multiline
        error={touched ? lineError : undefined}
        maxLength={200}
      />
      <TextField label="Landmark" optional icon="flag-outline" placeholder="e.g. Opposite City Mall" value={landmark} onChangeText={setLandmark} maxLength={80} />
      <FieldShell label="City" required>
        <ChipGroup value={city} onChange={setCity} options={db.settings.cities.map((c) => ({ value: c, label: c }))} />
      </FieldShell>
      <TextField
        label="PIN code"
        optional
        keyboardType="number-pad"
        placeholder="413001"
        value={pincode}
        onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
        error={touched ? pinError : undefined}
      />
      <Button label={address ? 'Save changes' : 'Save address'} icon="checkmark-circle" loading={save.pending} onPress={submit} fullWidth />
    </View>
  );
}
