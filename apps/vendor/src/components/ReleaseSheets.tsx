import { useState } from 'react';
import {
  CANT_COMPLETE_REASON_LABEL, CANT_COMPLETE_REASONS, checkIssue, checkRelease, isLateRelease, issueKindsFor, JOB_ISSUE_LABEL, RELEASE_REASON_LABEL, RELEASE_REASONS,
  useAction, useBackend, type Booking, type CantCompleteReason, type JobIssueKind, type ReleaseReason,
} from '@profecian/shared';
import { Banner, Button, ChipGroup, FieldShell, Sheet, TextField } from '@profecian/ui';

/**
 * "Can't make it" for a job the professional accepted and hasn't reached yet. The job goes back to
 * the Profecian team to reassign — it is never cancelled from here. Says up front whether this is
 * an early release or a late one that lowers the completion rate.
 */
export function ReleaseSheet({ visible, onClose, job, vendorId, onReleased }: { visible: boolean; onClose: () => void; job: Booking; vendorId: string; onReleased: () => void }) {
  const backend = useBackend();
  const [reason, setReason] = useState<ReleaseReason>();
  const [note, setNote] = useState('');
  const release = useAction(backend.vendor.releaseJob);
  const late = isLateRelease(job);
  const checked = checkRelease(reason, note);
  const problem = 'error' in checked ? checked.error : null;

  const submit = async () => {
    if ('error' in checked) return release.setError(checked.error);
    if (await release.run(vendorId, job.id, checked)) onReleased();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Can’t make it?"
      footer={<Button label="Release this job" size="lg" variant="danger" fullWidth disabled={!!problem} loading={release.pending} onPress={submit} />}
    >
      {release.error ? <Banner tone="danger" icon="alert-circle" title={release.error} /> : null}
      {late ? (
        <Banner
          tone="warning"
          icon="time-outline"
          title="This will be a late release"
          message={job.status === 'on_the_way'
            ? 'You are already on the way. A late release lowers your completion rate, and the customer is left waiting.'
            : 'The visit is 2 hours away or less. A late release lowers your completion rate, and the customer is left waiting.'}
        />
      ) : (
        <Banner tone="info" icon="information-circle-outline" title="The job goes back to Profecian" message="We’ll find another professional and tell the customer. Releasing this early doesn’t affect your completion rate." />
      )}
      <FieldShell label="Why can’t you make it?" required>
        <ChipGroup<ReleaseReason> value={reason} onChange={setReason} options={RELEASE_REASONS.map((r) => ({ value: r, label: RELEASE_REASON_LABEL[r] }))} />
      </FieldShell>
      <TextField
        label="Note"
        optional={reason !== 'other'}
        required={reason === 'other'}
        multiline
        placeholder={reason === 'other' ? 'Tell us what happened' : 'Anything our team should know'}
        value={note}
        onChangeText={setNote}
      />
    </Sheet>
  );
}

/**
 * A problem at the customer's address. At the door: "Customer not available" or "Can't do this
 * job". Once started: "Can't complete" with a reason. The job stays with the professional until
 * the Profecian team decides what happens.
 */
export function IssueSheet({ visible, onClose, job, vendorId }: { visible: boolean; onClose: () => void; job: Booking; vendorId: string }) {
  const backend = useBackend();
  const kinds = issueKindsFor(job.status);
  const started = job.status === 'in_progress';
  const [kind, setKind] = useState<JobIssueKind | undefined>(started ? 'cant_complete' : undefined);
  const [reason, setReason] = useState<CantCompleteReason>();
  const [note, setNote] = useState('');
  const report = useAction(backend.vendor.reportIssue);
  const checked = checkIssue(job.status, kind, reason, note);
  const problem = 'error' in checked ? checked.error : null;
  const noteRequired = !started || reason === 'other';

  const submit = async () => {
    if ('error' in checked) return report.setError(checked.error);
    if (await report.run(vendorId, job.id, checked)) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={started ? 'Can’t complete the job?' : 'Report a problem'}
      footer={<Button label="Send to Profecian" size="lg" fullWidth disabled={!!problem} loading={report.pending} onPress={submit} />}
    >
      {report.error ? <Banner tone="danger" icon="alert-circle" title={report.error} /> : null}
      <Banner
        tone="info"
        icon="headset-outline"
        title="Our team will decide with the customer"
        message={started ? 'They may arrange a return visit, agree a revised quote, or cancel. Stay reachable — the job stays with you until then.' : 'They may reschedule, send someone else, or cancel. Stay reachable — the job stays with you until then.'}
      />
      {started ? (
        <FieldShell label="What’s stopping you?" required>
          <ChipGroup<CantCompleteReason> value={reason} onChange={setReason} options={CANT_COMPLETE_REASONS.map((r) => ({ value: r, label: CANT_COMPLETE_REASON_LABEL[r] }))} />
        </FieldShell>
      ) : (
        <FieldShell label="What went wrong?" required>
          <ChipGroup<JobIssueKind> value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: JOB_ISSUE_LABEL[k] }))} />
        </FieldShell>
      )}
      {started && reason === 'bigger_problem' && !job.inspection ? (
        <Banner tone="info" icon="document-text-outline" title="You can quote the extra work instead" message="Close this and tap “Share quote” on the job screen. The customer approves it in the app and you carry on." />
      ) : null}
      <TextField
        label="Note"
        optional={!noteRequired}
        required={noteRequired}
        multiline
        placeholder={started ? 'e.g. which part is needed' : 'e.g. rang the bell and called twice, no answer'}
        value={note}
        onChangeText={setNote}
      />
    </Sheet>
  );
}
