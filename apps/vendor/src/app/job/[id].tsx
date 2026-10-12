import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import {
  afterPhotosOf, BOOKING_STATUS, bookingProblemLabel, canQuote, canShareQuote, canRelease, cashMatches, formatDate, isExtraWork, isNotSure, issueNote, formatINR, formatPhone, isValidStartCode, JOB_ERRORS, mapsUrl, MAX_PROOF_PHOTOS, MIN_AFTER_PHOTOS,
  otherJobInProgress, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, START_CODE_LENGTH, TRACKING_STEPS, UNDO_WINDOW_MS, useAction, useBackend, useDb, isQuoteOpen, VENDOR_NEXT,
  type BookingStatus, type ProofKind,
} from '@profecian/shared';
import {
  AppText, asIcon, Badge, Banner, Button, Card, colors, ComposeSheet, Divider, EmptyState, InspectionPanel, KeyValue, PhotoPicker, promptText, radius,
  Sheet, SlideToConfirm, spacing, TextField, Timeline, tintTile } from '@profecian/ui';
import { useEffect, useState } from 'react';
import { useVendor } from '@/backend';
import { QuoteSheet } from '@/components/QuoteSheet';
import { IssueSheet, ReleaseSheet } from '@/components/ReleaseSheets';
import { VendorScreen } from '@/components/VendorScreen';

/** The slide for each step after accepting — a deliberate gesture, so a stray tap can't move a job on. */
const SLIDE: Partial<Record<BookingStatus, { label: string; icon: 'navigate' | 'location' | 'construct' | 'checkmark-done' }>> = {
  accepted: { label: 'Slide to start travel', icon: 'navigate' },
  on_the_way: { label: 'Slide when you’ve arrived', icon: 'location' },
  arrived: { label: 'Slide to start service', icon: 'construct' },
  in_progress: { label: 'Slide to complete service', icon: 'checkmark-done' },
};

/** Call and Navigate share one width so they line up in a column. */
const CONTACT_BUTTON = { width: 124 };

/** This device's clock, for the undo countdown. */
const clock = () => Date.now();

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendor = useVendor();
  const db = useDb();
  const backend = useBackend();
  const advance = useAction(backend.vendor.advanceJob);
  const undoStep = useAction(backend.vendor.undoStep);
  const decline = useAction(backend.vendor.declineJob);
  const cash = useAction(backend.vendor.collectCash);
  const photo = useAction(backend.vendor.addProofPhoto);
  const job = db.bookings.find((b) => b.id === id && b.vendorId === vendor?.id);
  const [sheet, setSheet] = useState<'quote' | 'no-work' | 'release' | 'issue' | null>(null);
  // Collecting cash: the professional types what they were handed.
  const [cashOpen, setCashOpen] = useState(false);
  const [received, setReceived] = useState('');
  // The customer's start code, typed in at the door.
  const [code, setCode] = useState('');
  // The step just taken, which can be undone until `until` (this device's clock).
  const [undo, setUndo] = useState<{ step: BookingStatus; until: number } | null>(null);
  const [now, setNow] = useState(clock);

  // Counts the undo offer down, then withdraws it.
  useEffect(() => {
    if (!undo) return;
    const timer = setInterval(() => {
      const t = clock();
      setNow(t);
      if (t >= undo.until) setUndo(null);
    }, 250);
    return () => clearInterval(timer);
  }, [undo]);

  if (!vendor || !job) {
    return (
      <VendorScreen title="Job" back>
        <EmptyState icon="briefcase-outline" title="Job not available" message="It may have been reassigned or cancelled." actionLabel="My jobs" onAction={() => router.replace('/jobs')} />
      </VendorScreen>
    );
  }

  const category = db.categories.find((c) => c.id === job.categoryId);
  const problem = db.problemTypes.find((p) => p.id === job.problemTypeId);
  const next = VENDOR_NEXT[job.status];
  const slide = SLIDE[job.status];
  const stepIndex = TRACKING_STEPS.indexOf(job.status);
  const canShowContact = job.status !== 'assigned';
  const error = advance.error ?? undoStep.error ?? decline.error ?? cash.error ?? photo.error;
  // A "Not sure" job can't be completed while its price is still open (no quote, or quote unanswered).
  const blockedByQuote = next === 'completed' && isQuoteOpen(job);
  const afterPhotos = afterPhotosOf(job);
  // Starting: the customer's code, and no other job of mine in progress.
  const busyWith = next === 'in_progress' ? otherJobInProgress(db.bookings, vendor.id, job.id) : undefined;
  const codeLocked = advance.error === JOB_ERRORS.startCodeLocked;
  const needsCode = next === 'in_progress' && !isValidStartCode(code);
  const needsPhoto = next === 'completed' && afterPhotos.length < MIN_AFTER_PHOTOS;
  const slideHint = busyWith ? `Finish job ${busyWith.code} first` : codeLocked ? 'Ask support to start this job' : needsCode ? 'Enter the customer’s start code' : needsPhoto ? 'Add an “after” photo first' : undefined;
  // Undo is offered only for the step this screen just took, while the job is still in that state.
  const undoLeft = undo && undo.step === job.status ? Math.max(0, Math.ceil((undo.until - now) / 1000)) : 0;

  const onAdvance = async () => {
    if (!next) return;
    const updated = await advance.run(vendor.id, job.id, next === 'in_progress' ? { startCode: code } : {});
    if (!updated) return;
    setCode('');
    const t = clock();
    setNow(t);
    setUndo({ step: updated.status, until: t + UNDO_WINDOW_MS });
  };

  const cashTyped = received.trim() !== '' && Number(received) >= 0;
  const cashRight = cashTyped && cashMatches(Number(received), job.price.total);
  const onCollect = async () => {
    if (await cash.run(vendor.id, job.id, Number(received))) {
      setCashOpen(false);
      setReceived('');
    }
  };

  const onUndo = async () => {
    if (await undoStep.run(vendor.id, job.id)) setUndo(null);
  };

  const addPhotos = (kind: ProofKind, current: string[]) => (uris: string[]) => {
    uris.filter((u) => !current.includes(u)).forEach((u) => void photo.run(vendor.id, job.id, u, kind));
  };

  const onDecline = async () => {
    // The reason is optional, and declining an offer doesn't affect the completion rate.
    const reason = await promptText('Decline job', 'Why can’t you take this job? (optional)', '');
    if (reason == null) return;
    if (await decline.run(vendor.id, job.id, reason.trim() || undefined)) router.replace('/jobs');
  };

  // "Undo" for the step just taken — a mistake can be fixed without calling support.
  const undoBar = undoLeft > 0 ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      <AppText variant="small" style={{ flex: 1 }}>Marked “{BOOKING_STATUS[job.status].label}”</AppText>
      <Button label={`Undo (${undoLeft}s)`} size="sm" variant="outline" icon="arrow-undo-outline" loading={undoStep.pending} onPress={onUndo} />
    </View>
  ) : null;

  const action = job.status === 'cancelled' ? null : job.status === 'assigned' ? (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Button label="Decline" variant="outline" size="lg" onPress={onDecline} loading={decline.pending} />
      <Button label="Accept job" size="lg" icon="checkmark-circle-outline" fullWidth style={{ flex: 1 }} loading={advance.pending} onPress={onAdvance} />
    </View>
  ) : blockedByQuote && canQuote(job) ? (
    <Button label="Share quote" size="lg" icon="document-text-outline" fullWidth onPress={() => setSheet('quote')} />
  ) : next && slide ? (
    <View style={{ gap: spacing.sm }}>
      {next === 'in_progress' && !busyWith && !codeLocked ? (
        <TextField
          label="Customer’s start code"
          placeholder={'•'.repeat(START_CODE_LENGTH)}
          keyboardType="number-pad"
          maxLength={START_CODE_LENGTH}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, START_CODE_LENGTH))}
          hint={backend.kind === 'mock' && job.startCode
            ? `Demo mode: the code is ${job.startCode}. In the real app only the customer sees it.`
            : `Ask ${job.customerName.split(' ')[0]} for the ${START_CODE_LENGTH}-digit code shown in their app.`}
        />
      ) : null}
      <SlideToConfirm
        label={slide.label}
        icon={slide.icon}
        tone={next === 'completed' ? 'success' : 'primary'}
        loading={advance.pending}
        disabled={blockedByQuote || !!slideHint}
        hint={blockedByQuote ? 'Waiting for the quote to be settled' : slideHint}
        onConfirm={onAdvance}
      />
    </View>
  ) : job.status === 'completed' && job.payment.status !== 'paid' ? (
    <Button label={`Collect ${formatINR(job.price.total)} in cash`} size="lg" icon="cash-outline" variant="success" fullWidth onPress={() => { cash.setError(null); setCashOpen(true); }} />
  ) : null;

  // Giving the job back. Before arriving: release it. On site: report the problem for our team to decide.
  const wayOut = canRelease(job.status) ? (
    <Button label="Can’t make it" size="sm" variant="ghost" icon="hand-left-outline" onPress={() => setSheet('release')} />
  ) : (job.status === 'arrived' || job.status === 'in_progress') && !job.issue ? (
    <Button label={job.status === 'arrived' ? 'Report a problem' : 'Can’t complete'} size="sm" variant="ghost" icon="alert-circle-outline" onPress={() => setSheet('issue')} />
  ) : null;

  const footer = undoBar || action || wayOut ? (
    <View style={{ gap: spacing.sm }}>
      {undoBar}
      {action}
      {wayOut}
    </View>
  ) : null;

  return (
    <VendorScreen title={bookingProblemLabel(db, job) || 'Job'} subtitle={`${category?.name} · ${job.code}`} back footer={footer}>
      {error ? <Banner tone="danger" icon="alert-circle" title={error} /> : null}
      {job.status === 'assigned' ? <Banner tone="warning" icon="flash-outline" title="New job — please accept" message="Customer contact details are shared once you accept." /> : null}
      {job.status === 'cancelled' ? <Banner tone="danger" icon="close-circle" title="This job was cancelled" message={job.cancelReason} /> : null}
      {job.issue ? (
        <Banner
          tone="warning"
          icon="headset-outline"
          title="Reported to Profecian — waiting for a decision"
          message={`${issueNote(job.issue)}. Our team will contact you and the customer. If things change, you can carry on with the job.`}
        />
      ) : null}
      {busyWith ? (
        <Banner
          tone="warning"
          icon="time-outline"
          title="You have another job in progress"
          message={`Complete job ${busyWith.code} before starting this one — only one job can be in progress at a time.`}
          action={<Button label="Open it" size="sm" variant="secondary" onPress={() => router.push(`/job/${busyWith.id}`)} />}
        />
      ) : null}
      {codeLocked ? (
        <Banner
          tone="danger"
          icon="lock-closed-outline"
          title="Start code locked"
          message="Too many wrong codes were entered. Call support and they will start the job for you."
          action={<Button label="Call support" size="sm" variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:${db.settings.supportPhone.replace(/[^+\d]/g, '')}`)} />}
        />
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: tintTile(category?.tint).bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={asIcon(problem?.icon ?? 'construct-outline')} size={24} color={tintTile(category?.tint).fg} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3">{formatDate(job.date)}, {job.slot}</AppText>
            <AppText variant="small">Est. {problem?.durationMins ?? 60} min</AppText>
          </View>
          <Badge label={job.status === 'assigned' ? 'New job' : BOOKING_STATUS[job.status].label} tone={job.status === 'assigned' ? 'warning' : BOOKING_STATUS[job.status].tone} />
        </View>
        {stepIndex > 0 ? (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {TRACKING_STEPS.slice(1).map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < stepIndex ? colors.success : colors.border }} />)}
          </View>
        ) : null}
        {job.notes ? <Banner tone="info" icon="chatbox-ellipses-outline" title="Customer note" message={job.notes} /> : null}
      </Card>

      {job.inspection ? (
        <InspectionPanel
          booking={job}
          categoryName={category?.name}
          audience="vendor"
          actions={job.status === 'cancelled' || job.status === 'completed' ? null : (
            <>
              {canQuote(job) && isNotSure(job) ? <Button label="No repair needed" icon="checkmark-done-outline" size="sm" variant="outline" onPress={() => setSheet('no-work')} /> : null}
            </>
          )}
        />
      ) : null}

      {/* The same for every service, and only once the service is started. */}
      {canShareQuote(job) ? (
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">Share a quote</AppText>
              <AppText variant="small">Send the customer an itemised quote for the work needed. They approve it in the app before you do it.</AppText>
            </View>
          </View>
          <Button label={job.inspection?.status === 'declined' ? 'Share revised quote' : 'Share quote'} icon="document-text-outline" size="sm" onPress={() => setSheet('quote')} />
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Customer</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">{job.customerName}</AppText>
            <AppText variant="small">{canShowContact ? formatPhone(job.customerPhone) : 'Phone shown after you accept'}</AppText>
          </View>
          {canShowContact ? <Button label="Call" size="sm" variant="secondary" icon="call-outline" style={CONTACT_BUTTON} onPress={() => Linking.openURL(`tel:+91${job.customerPhone}`)} /> : null}
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          {/* Same 36px column as the avatar above, so the two rows line up. */}
          <View style={{ width: 36, alignItems: 'center' }}>
            <Ionicons name="location-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyMedium">{job.address.line}</AppText>
            <AppText variant="small">{job.address.landmark ? `Near ${job.address.landmark} · ` : ''}{job.address.city} {job.address.pincode ?? ''}</AppText>
          </View>
          <Button label="Navigate" size="sm" variant="secondary" icon="navigate-outline" style={CONTACT_BUTTON} onPress={() => Linking.openURL(mapsUrl(job.address))} />
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <AppText variant="h3" style={{ marginBottom: 6 }}>Payment</AppText>
        <KeyValue label={isNotSure(job) && job.inspection?.status !== 'approved' ? 'Service amount (incl. inspection fee)' : isExtraWork(job) && job.inspection?.status === 'approved' ? 'Service amount (incl. extra work)' : 'Service amount'} value={formatINR(job.price.serviceAmount)} />
        <KeyValue label={`Platform commission (${Math.round(job.price.commissionRate * 100)}%)`} value={`−${formatINR(job.price.commission)}`} />
        <KeyValue label="You earn" value={formatINR(job.price.vendorPayout)} strong tone="success" />
        <AppText variant="small">Customer pays {formatINR(job.price.total)} incl. {formatINR(job.price.tax)} GST.</AppText>
        {isQuoteOpen(job) ? <AppText variant="small">Updates when the customer approves your {isExtraWork(job) ? 'extra-work' : 'repair'} quote.</AppText> : null}
        <Divider style={{ marginVertical: 6 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge label={PAYMENT_STATUS[job.payment.status].label} tone={PAYMENT_STATUS[job.payment.status].tone} />
          <AppText variant="small">{job.payment.method ? PAYMENT_METHOD_LABEL[job.payment.method] : 'Customer will choose online or cash'}</AppText>
        </View>
        {job.payment.method === 'cash' && job.payment.status !== 'paid' ? <AppText variant="small">Collect cash after completing the service, then tap “Collect”.</AppText> : null}
      </Card>

      {['arrived', 'in_progress', 'completed'].includes(job.status) ? (
        <Card style={{ gap: spacing.md }}>
          <AppText variant="h3">Proof of work</AppText>
          <AppText variant="small">Photos are your evidence in a dispute or a warranty claim.</AppText>
          <PhotoPicker label="Before" value={job.proofPhotos} max={MAX_PROOF_PHOTOS} onChange={addPhotos('before', job.proofPhotos)} />
          {job.status !== 'arrived' ? (
            <>
              <PhotoPicker label="After" optional={false} value={afterPhotos} max={MAX_PROOF_PHOTOS} onChange={addPhotos('after', afterPhotos)} />
              {needsPhoto ? <Banner tone="info" icon="camera-outline" title="Add at least one “after” photo" message="You need it to complete the service." /> : null}
            </>
          ) : (
            <AppText variant="small">“After” photos are added once the service has started. You’ll need at least one to complete it.</AppText>
          )}
        </Card>
      ) : null}

      {job.status === 'completed' && job.reviewId ? (() => {
        const r = db.reviews.find((x) => x.id === job.reviewId);
        return r ? (
          <Card style={{ gap: 6 }}>
            <AppText variant="h3">Customer review</AppText>
            <AppText variant="label" color={colors.warning}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</AppText>
            <AppText>{r.text || 'No written feedback.'}</AppText>
            {r.images.length ? <View style={{ flexDirection: 'row', gap: 8 }}>{r.images.map((u) => <Image key={u} source={u} style={{ width: 64, height: 64, borderRadius: 8 }} />)}</View> : null}
          </Card>
        ) : null;
      })() : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="h3">Timeline</AppText>
        <Timeline events={job.timeline} />
      </Card>

      {sheet === 'release' ? <ReleaseSheet visible job={job} vendorId={vendor.id} onClose={() => setSheet(null)} onReleased={() => router.replace('/jobs')} /> : null}
      {sheet === 'issue' ? <IssueSheet visible job={job} vendorId={vendor.id} onClose={() => setSheet(null)} /> : null}

      <Sheet
        visible={cashOpen}
        onClose={() => setCashOpen(false)}
        title="Collect cash"
        footer={<Button label={cashRight ? `Confirm ${formatINR(job.price.total)} received` : 'Confirm cash received'} size="lg" variant="success" icon="checkmark-circle-outline" fullWidth disabled={!cashRight} loading={cash.pending} onPress={onCollect} />}
      >
        {cash.error ? <Banner tone="danger" icon="alert-circle" title={cash.error} /> : null}
        <KeyValue label={`Amount due from ${job.customerName}`} value={formatINR(job.price.total)} strong />
        <TextField
          label="Amount received (₹)"
          required
          autoFocus
          keyboardType="decimal-pad"
          placeholder="Type the cash you were given"
          value={received}
          onChangeText={(t) => setReceived(t.replace(/[^\d.]/g, ''))}
          error={cashTyped && !cashRight ? `This must be ${formatINR(job.price.total)} — the full amount due. Collect the rest, or return the change, first.` : null}
          hint="Count the cash and type the amount. It is recorded only when it matches the amount due."
        />
      </Sheet>

      <QuoteSheet visible={sheet === 'quote'} onClose={() => setSheet(null)} job={job} vendorId={vendor.id} />
      {job.inspection ? (
        <>
          <ComposeSheet
            visible={sheet === 'no-work'}
            onClose={() => setSheet(null)}
            title="No repair needed"
            label="What did you find?"
            placeholder="e.g. Filter was clogged — cleaned it, AC cools normally now"
            hint="The customer pays only the inspection fee. You can then complete the job."
            submitLabel="Confirm — no repair needed"
            minLength={5}
            onSubmit={(text) => backend.vendor.markNoWorkNeeded(vendor.id, job.id, text)}
          />
        </>
      ) : null}
    </VendorScreen>
  );
}
