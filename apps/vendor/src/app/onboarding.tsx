import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DOC_STATUS, KYC_LABEL, useAction, useBackend, type KycDocType } from '@profecian/shared';
import {
  AppText, Badge, Banner, Button, colors, PhotoPicker, radius, Sheet, spacing, TextField, type IconName, type WebPressableState,
} from '@profecian/ui';
import { useVendor } from '@/backend';
import { VendorScreen } from '@/components/VendorScreen';

const DOCS: { type: KycDocType; icon: IconName; required: boolean; numberLabel?: string; pattern?: RegExp; placeholder?: string; camera?: boolean }[] = [
  { type: 'aadhaar', icon: 'id-card-outline', required: true, numberLabel: 'Aadhaar number', pattern: /^\d{12}$/, placeholder: '1234 5678 9012' },
  { type: 'pan', icon: 'card-outline', required: true, numberLabel: 'PAN', pattern: /^[A-Z]{5}\d{4}[A-Z]$/, placeholder: 'ABCDE1234F' },
  { type: 'driving_license', icon: 'car-outline', required: false, numberLabel: 'Licence number', placeholder: 'MH13 20190012345' },
  { type: 'selfie', icon: 'happy-outline', required: true, camera: true },
];

export default function Onboarding() {
  const vendor = useVendor();
  const backend = useBackend();
  const [open, setOpen] = useState<KycDocType | 'bank' | null>(null);
  const submit = useAction(backend.vendor.submitForReview);
  if (!vendor) return <Redirect href="/login" />;
  if (vendor.status === 'approved') return <Redirect href="/(tabs)" />;

  const doc = (t: KycDocType) => vendor.kyc.find((k) => k.type === t)!;
  const required = DOCS.filter((d) => d.required).map((d) => d.type).concat('bank_proof');
  const done = required.filter((t) => doc(t).status !== 'missing' && doc(t).status !== 'rejected').length + (vendor.bank ? 1 : 0);
  const total = required.length + 1;
  const ready = done === total;
  const submitted = !!vendor.kycSubmittedAt && vendor.status === 'pending';

  return (
    <VendorScreen
      title="Verify your identity"
      subtitle={`Step 2 of 2 · ${done}/${total} complete`}
      right={<Button label="Log out" size="sm" variant="ghost" onPress={() => { backend.logout(); router.replace('/login'); }} />}
      footer={
        submitted ? null : (
          <Button label="Submit for verification" size="lg" fullWidth icon="shield-checkmark-outline" disabled={!ready} loading={submit.pending} onPress={() => submit.run(vendor.id)} />
        )
      }
    >
      {vendor.status === 'rejected' ? (
        <Banner tone="danger" icon="close-circle" title="Application not approved" message={`${vendor.rejectionReason ?? 'Please review your documents.'} Fix the highlighted items and submit again.`} />
      ) : submitted ? (
        <Banner tone="info" icon="time-outline" title="Documents under review" message="Our team usually verifies partners within 24 hours. We'll notify you once you're approved." />
      ) : (
        <Banner tone="primary" icon="information-circle-outline" title={`Hi ${vendor.name.split(' ')[0]}, almost there!`} message="Upload the documents below. Numbers are masked and only visible to our verification team." />
      )}
      {submit.error ? <Banner tone="danger" icon="alert-circle" title={submit.error} /> : null}

      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${(done / total) * 100}%`, backgroundColor: colors.success }} />
      </View>

      {DOCS.map((d) => (
        <DocRow key={d.type} icon={d.icon} title={`${KYC_LABEL[d.type]}${d.required ? '' : ' (if required)'}`} status={doc(d.type).status} note={doc(d.type).note ?? doc(d.type).number} onPress={() => setOpen(d.type)} />
      ))}
      <DocRow
        icon="business-outline"
        title="Bank account & proof"
        status={vendor.bank ? doc('bank_proof').status : 'missing'}
        note={vendor.bank ? `${vendor.bank.bankName} ••${vendor.bank.accountLast4}` : 'For weekly payouts'}
        onPress={() => setOpen('bank')}
      />

      {submitted ? (
        <View style={{ gap: spacing.sm, paddingTop: spacing.md }}>
          <AppText variant="tiny" align="center">DEMO ONLY — in production an admin approves you from the admin panel.</AppText>
          <Button label="Simulate admin approval" variant="outline" icon="flask-outline" onPress={() => backend.admin.reviewVendor(vendor.id, 'approved')} style={{ alignSelf: 'center' }} />
        </View>
      ) : null}

      {open && open !== 'bank' ? <DocSheet type={open} onClose={() => setOpen(null)} /> : null}
      {open === 'bank' ? <BankSheet onClose={() => setOpen(null)} /> : null}
    </VendorScreen>
  );
}

function DocRow({ icon, title, status, note, onPress }: { icon: IconName; title: string; status: keyof typeof DOC_STATUS; note?: string; onPress: () => void }) {
  const s = DOC_STATUS[status];
  const doneIcon = status === 'verified' || status === 'pending';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}: ${s.label}`}
      style={({ hovered }: WebPressableState) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: hovered ? colors.surfaceAlt : colors.surface, borderWidth: 1.5, borderColor: status === 'rejected' ? colors.danger : colors.border }]}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: doneIcon ? colors.successSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={doneIcon ? 'checkmark' : icon} size={22} color={doneIcon ? colors.success : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="label">{title}</AppText>
        {note ? <AppText variant="small" numberOfLines={1}>{note}</AppText> : null}
      </View>
      <Badge label={s.label} tone={s.tone} />
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </Pressable>
  );
}

function DocSheet({ type, onClose }: { type: KycDocType; onClose: () => void }) {
  const vendor = useVendor()!;
  const backend = useBackend();
  const meta = DOCS.find((d) => d.type === type)!;
  const [number, setNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const upload = useAction(backend.vendor.uploadDocument);

  const save = async () => {
    const clean = number.replace(/\s/g, '').toUpperCase();
    if (meta.pattern && !meta.pattern.test(clean)) return upload.setError(`Enter a valid ${meta.numberLabel}`);
    if (meta.numberLabel && !meta.pattern && clean.length < 6) return upload.setError(`Enter your ${meta.numberLabel}`);
    if (!photos.length) return upload.setError(meta.camera ? 'Take a selfie to continue' : 'Upload a clear photo of the document');
    await upload.run(vendor.id, type, { number: clean || undefined, imageUri: photos[0] });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={KYC_LABEL[type]} footer={<Button label="Save document" fullWidth loading={upload.pending} onPress={save} />}>
      {upload.error ? <Banner tone="danger" icon="alert-circle" title={upload.error} /> : null}
      {meta.numberLabel ? (
        <TextField label={meta.numberLabel} required placeholder={meta.placeholder} value={number} onChangeText={setNumber} autoCapitalize="characters" keyboardType={type === 'aadhaar' ? 'number-pad' : 'default'} maxLength={type === 'aadhaar' ? 14 : 20} />
      ) : (
        <AppText variant="small">Take a clear, well-lit selfie. We match it with your Aadhaar photo.</AppText>
      )}
      <PhotoPicker label={meta.camera ? 'Selfie' : 'Photo of document'} optional={false} value={photos} onChange={setPhotos} max={1} camera={meta.camera} />
    </Sheet>
  );
}

function BankSheet({ onClose }: { onClose: () => void }) {
  const vendor = useVendor()!;
  const backend = useBackend();
  const [holder, setHolder] = useState(vendor.bank?.holderName ?? vendor.name);
  const [account, setAccount] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ifsc, setIfsc] = useState(vendor.bank?.ifsc ?? '');
  const [bankName, setBankName] = useState(vendor.bank?.bankName ?? '');
  const [photos, setPhotos] = useState<string[]>([]);
  const save = useAction(async () => {
    if (account.replace(/\s/g, '') !== confirm.replace(/\s/g, '')) throw new Error('Account numbers do not match');
    if (!bankName.trim()) throw new Error('Enter your bank name');
    if (!photos.length && vendor.kyc.find((k) => k.type === 'bank_proof')?.status === 'missing') throw new Error('Upload a cancelled cheque or passbook photo');
    await backend.vendor.saveBank(vendor.id, { holderName: holder, accountNumber: account, ifsc, bankName });
    if (photos.length) await backend.vendor.uploadDocument(vendor.id, 'bank_proof', { imageUri: photos[0] });
    onClose();
  });

  return (
    <Sheet visible onClose={onClose} title="Bank account" footer={<Button label="Save bank details" fullWidth loading={save.pending} onPress={() => save.run()} />}>
      {save.error ? <Banner tone="danger" icon="alert-circle" title={save.error} /> : null}
      <TextField label="Account holder name" required value={holder} onChangeText={setHolder} />
      <TextField label="Account number" required keyboardType="number-pad" secureTextEntry value={account} onChangeText={setAccount} />
      <TextField label="Confirm account number" required keyboardType="number-pad" value={confirm} onChangeText={setConfirm} />
      <TextField label="IFSC code" required autoCapitalize="characters" placeholder="SBIN0001234" value={ifsc} onChangeText={setIfsc} maxLength={11} />
      <TextField label="Bank name" required placeholder="State Bank of India" value={bankName} onChangeText={setBankName} />
      <PhotoPicker label="Cancelled cheque or passbook" optional={!!vendor.bank} value={photos} onChange={setPhotos} max={1} />
    </Sheet>
  );
}
