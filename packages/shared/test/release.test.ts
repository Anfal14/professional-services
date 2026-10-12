/**
 * Giving a job back after accepting it, in the shared rules and the mock backend. The rule cases
 * match backend/.../bookings/ReleaseRulesTest.java and the flows match ReleaseIT.java.
 *
 *   npm test   (from the repo root)
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  awaitingAfterRelease, byUrgencyThenSchedule, canRelease, checkIssue, checkRelease, completionRate, createMockBackend, DEMO, isLateRelease, issueKindsFor,
  issueNote, RELEASE_ERRORS, releaseAttention, releaseNote, reliabilityOf, reliabilityPenalty, scheduledAt, suggestVendors, type BookingStatus,
} from '../src/index';

const DAY = '2026-10-12';
/** `minutes` before the 02:00 PM slot. */
const before = (minutes: number) => scheduledAt(DAY, '02:00 PM').getTime() - minutes * 60_000;
const job = (status: BookingStatus) => ({ status, date: DAY, slot: '02:00 PM' });

describe('release rules', () => {
  test('only accepted and on-the-way jobs can be released', () => {
    assert.ok(canRelease('accepted') && canRelease('on_the_way'));
    for (const s of ['assigned', 'arrived', 'in_progress', 'completed', 'cancelled', 'pending_assignment'] as const) assert.equal(canRelease(s), false);
  });

  test('late means 2 hours or less to the slot, or already on the way', () => {
    assert.equal(isLateRelease(job('accepted'), before(121)), false);
    assert.equal(isLateRelease(job('accepted'), before(120)), true); // exactly 2 hours is late
    assert.equal(isLateRelease(job('accepted'), before(30)), true);
    assert.equal(isLateRelease(job('accepted'), before(-45)), true); // the slot has passed
    assert.equal(isLateRelease(job('accepted'), before(60 * 26)), false);
    assert.equal(isLateRelease(job('on_the_way'), before(60 * 26)), true);
  });

  test('a release needs a reason, and Other needs a note', () => {
    assert.deepEqual(checkRelease('unwell', undefined), { reason: 'unwell', note: undefined });
    assert.deepEqual(checkRelease('other', '  Family   emergency '), { reason: 'other', note: 'Family emergency' });
    assert.deepEqual(checkRelease(undefined, undefined), { error: RELEASE_ERRORS.reason });
    assert.deepEqual(checkRelease('bored', undefined), { error: RELEASE_ERRORS.reason });
    assert.deepEqual(checkRelease('other', undefined), { error: RELEASE_ERRORS.note });
    assert.deepEqual(checkRelease('other', 'no'), { error: RELEASE_ERRORS.note });
  });

  test('on-site reports depend on the stage', () => {
    assert.deepEqual(issueKindsFor('arrived'), ['customer_unavailable', 'cant_do']);
    assert.deepEqual(issueKindsFor('in_progress'), ['cant_complete']);
    assert.deepEqual(issueKindsFor('accepted'), []);

    assert.deepEqual(checkIssue('arrived', 'customer_unavailable', undefined, 'Nobody answered the door'), { kind: 'customer_unavailable', note: 'Nobody answered the door' });
    assert.deepEqual(checkIssue('arrived', 'cant_do', undefined, undefined), { error: RELEASE_ERRORS.note });
    assert.deepEqual(checkIssue('arrived', 'cant_complete', 'needs_part', undefined), { error: RELEASE_ERRORS.issueKind });
    assert.deepEqual(checkIssue('accepted', 'cant_do', undefined, 'Too far away'), { error: RELEASE_ERRORS.issueStage });

    assert.deepEqual(checkIssue('in_progress', 'cant_complete', 'needs_part', undefined), { kind: 'cant_complete', reason: 'needs_part', note: undefined });
    assert.deepEqual(checkIssue('in_progress', 'cant_complete', undefined, undefined), { error: RELEASE_ERRORS.reason });
    assert.deepEqual(checkIssue('in_progress', 'cant_complete', 'other', undefined), { error: RELEASE_ERRORS.note });
    assert.deepEqual(checkIssue('in_progress', 'customer_unavailable', undefined, 'Gone out'), { error: RELEASE_ERRORS.issueKind });
  });

  test('timeline notes say who, why and whether it was late', () => {
    assert.equal(releaseNote({ vendorName: 'Ravi Patil', reason: 'vehicle_problem', late: true }), 'Ravi Patil released the job — Vehicle problem (late release)');
    assert.equal(releaseNote({ vendorName: 'Ravi Patil', reason: 'other', note: 'Family emergency', late: false }), 'Ravi Patil released the job — Other: Family emergency (early release)');
    assert.equal(issueNote({ vendorName: 'Ravi Patil', kind: 'cant_complete', reason: 'needs_part', note: 'Capacitor not in stock' }), 'Ravi Patil: Can’t complete — Needs a part: Capacitor not in stock');
  });

  test('completion rate counts only late releases and is New until 5 jobs', () => {
    assert.equal(completionRate(0, 0), null);
    assert.equal(completionRate(4, 1), null);
    assert.equal(completionRate(5, 0), 100);
    assert.equal(completionRate(5, 1), 80);
    assert.equal(completionRate(20, 3), 85);
    assert.equal(completionRate(7, 1), 86); // 85.71
    assert.equal(completionRate(8, 1), 88); // 87.5 rounds up
  });

  test('a lower completion rate ranks lower', () => {
    assert.equal(reliabilityPenalty(null), 0); // "New" is not penalised
    assert.equal(reliabilityPenalty(100), 0);
    assert.equal(reliabilityPenalty(80), 4);
    assert.equal(reliabilityPenalty(50), 10);
  });

  test('urgent bookings sort to the top of the queue', () => {
    const a = { urgent: false, date: '2026-10-11', slot: '09:00 AM' };
    const b = { urgent: true, date: '2026-10-14', slot: '05:00 PM' };
    const c = { urgent: undefined, date: '2026-10-12', slot: '09:00 AM' };
    assert.deepEqual([a, b, c].sort(byUrgencyThenSchedule), [b, a, c]);
  });
});

/** A fresh mock backend where the demo vendor (ven_1, Ravi Patil) has nothing in progress. */
async function setup() {
  const mem = new Map<string, string>();
  const storage = {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  };
  const backend = createMockBackend({ storage, namespace: 'test', latencyMs: 0 });
  await backend.init();
  const otp = await backend.customer.requestOtp(DEMO.customerPhone);
  const { customer } = await backend.customer.verifyOtp(otp.requestId, '123456');
  const db = () => backend.getSnapshot().db;
  const get = (id: string) => db().bookings.find((b) => b.id === id)!;
  const vendorId = 'ven_1';
  for (const b of db().bookings.filter((x) => x.vendorId === vendorId && x.status === 'in_progress')) await backend.admin.setBookingStatus(b.id, 'cancelled', 'Cleared for a test');
  const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
  const assignedJob = async () => {
    const [b] = await backend.customer.checkout({
      customerId: customer!.id, groups: [{ categoryId: 'electrician', problemTypeIds: ['el-fan'] }], date: day(3), slot: '05:00 PM',
      address: customer!.addresses[0], contactName: 'Priya Sharma', contactPhone: '9876500001',
    });
    await backend.admin.assignVendor(b.id, vendorId);
    return b.id;
  };
  const advance = (id: string, startCode?: string) => backend.vendor.advanceJob(vendorId, id, { startCode });
  const stats = () => reliabilityOf(db(), db().vendors.find((v) => v.id === vendorId)!);
  return { backend, db, get, vendorId, assignedJob, advance, stats, day };
}

describe('mock backend', () => {
  test('declining an offer needs no reason and leaves no record', async () => {
    const { backend, get, vendorId, assignedJob, stats } = await setup();
    const before = stats();
    const id = await assignedJob();
    await assert.rejects(backend.vendor.releaseJob(vendorId, id, { reason: 'unwell' }), { message: RELEASE_ERRORS.notReleasable });
    const declined = await backend.vendor.declineJob(vendorId, id);
    assert.equal(declined.status, 'pending_assignment');
    assert.equal(get(id).vendorId, undefined);
    assert.equal(get(id).timeline.at(-1)!.note, 'Declined');
    assert.equal(get(id).releases, undefined);
    assert.ok(!get(id).urgent);
    assert.deepEqual(stats(), before);
  });

  test('an early release returns the booking to the queue and tells the customer', async () => {
    const { backend, db, get, vendorId, assignedJob, advance, stats } = await setup();
    const id = await assignedJob();
    await advance(id); // accepted
    const before = stats();

    await assert.rejects(backend.vendor.releaseJob(vendorId, id, { reason: 'bored' as never }), { message: RELEASE_ERRORS.reason });
    await assert.rejects(backend.vendor.releaseJob(vendorId, id, { reason: 'other', note: ' ' }), { message: RELEASE_ERRORS.note });
    assert.equal(get(id).status, 'accepted');

    const released = await backend.vendor.releaseJob(vendorId, id, { reason: 'unwell' });
    assert.equal(released.status, 'pending_assignment'); // back in the queue, never cancelled
    assert.equal(released.vendorId, undefined);
    assert.ok(!released.urgent);
    assert.deepEqual({ ...released.releases![0], at: '' }, { vendorId, vendorName: 'Ravi Patil', reason: 'unwell', note: undefined, late: false, at: '' });
    assert.deepEqual([released.timeline.at(-1)!.kind, released.timeline.at(-1)!.by, released.timeline.at(-1)!.note], ['released', 'vendor', 'Ravi Patil released the job — Unwell (early release)']);
    assert.ok(awaitingAfterRelease(released));
    assert.ok(db().notifications.some((n) => n.bookingId === id && n.audience === 'admin' && n.title === 'Job released'));
    assert.ok(db().notifications.some((n) => n.bookingId === id && n.audience === 'customer' && n.kind === 'professional_released'));

    // An early release counts as a job accepted, but not against the completion rate.
    assert.deepEqual(stats(), before);
    const attention = releaseAttention(db().bookings);
    assert.ok(attention.released.some((b) => b.id === id));
    assert.equal(attention.urgent.some((b) => b.id === id), false);

    // Reassignment is manual.
    assert.equal((await backend.admin.assignVendor(id, vendorId)).status, 'assigned');
    assert.equal(awaitingAfterRelease(get(id)), false);
  });

  test('a late release is urgent and counts against the completion rate', async () => {
    const { backend, db, get, vendorId, assignedJob, advance, stats } = await setup();
    const id = await assignedJob();
    await advance(id); // accepted
    const before = stats();
    assert.ok(before.accepted >= 5 && before.rate !== null);
    await advance(id); // on the way → any release is now late

    const released = await backend.vendor.releaseJob(vendorId, id, { reason: 'other', note: '  Bike   broke down on the highway ' });
    assert.equal(released.urgent, true);
    assert.equal(released.releases![0].late, true);
    assert.equal(released.releases![0].note, 'Bike broke down on the highway');
    assert.equal(released.timeline.at(-1)!.note, 'Ravi Patil released the job — Other: Bike broke down on the highway (late release)');
    assert.ok(db().notifications.some((n) => n.bookingId === id && n.title === 'Urgent: job released close to the slot'));
    assert.ok(releaseAttention(db().bookings).urgent.some((b) => b.id === id));

    const after = stats();
    assert.deepEqual([after.accepted, after.lateReleases], [before.accepted, before.lateReleases + 1]);
    assert.equal(after.rate, completionRate(after.accepted, after.lateReleases));
    assert.ok(after.rate! < before.rate!);

    // The ranking score carries exactly the completion-rate penalty.
    const fresh = db();
    const clean = { ...fresh, bookings: fresh.bookings.map((b) => ({ ...b, releases: [] })) };
    const scoreIn = (d: typeof fresh) => suggestVendors(d, get(id)).find((s) => s.vendor.id === vendorId)!.score;
    assert.ok(Math.abs(scoreIn(fresh) - scoreIn(clean) - reliabilityPenalty(after.rate)) < 1e-9);
    assert.ok(reliabilityPenalty(after.rate) > 0);

    // Once the admin assigns someone, it is no longer urgent; the history stays.
    const reassigned = await backend.admin.assignVendor(id, vendorId);
    assert.ok(!reassigned.urgent);
    assert.equal(reassigned.releases!.length, 1);
  });

  test('on-site problems are reported for the admin to decide', async () => {
    const { backend, db, get, vendorId, assignedJob, advance, stats, day } = await setup();
    const id = await assignedJob();
    await advance(id);
    await assert.rejects(backend.vendor.reportIssue(vendorId, id, { kind: 'cant_do', note: 'Too far away' }), { message: RELEASE_ERRORS.issueStage });
    await advance(id);
    await advance(id); // arrived
    const before = stats();

    await assert.rejects(backend.vendor.releaseJob(vendorId, id, { reason: 'unwell' }), { message: RELEASE_ERRORS.onSite });
    await assert.rejects(backend.vendor.reportIssue(vendorId, id, { kind: 'customer_unavailable' }), { message: RELEASE_ERRORS.note });
    await assert.rejects(backend.vendor.reportIssue(vendorId, id, { kind: 'cant_complete', reason: 'needs_part' }), { message: RELEASE_ERRORS.issueKind });

    const reported = await backend.vendor.reportIssue(vendorId, id, { kind: 'customer_unavailable', note: 'Nobody answered the door or the phone' });
    assert.equal(reported.status, 'arrived'); // the job stays with the professional
    assert.equal(reported.issue!.kind, 'customer_unavailable');
    assert.equal(reported.timeline.at(-1)!.note, 'Ravi Patil: Customer not available: Nobody answered the door or the phone');
    assert.ok(db().notifications.some((n) => n.bookingId === id && n.kind === 'job_issue'));
    assert.ok(releaseAttention(db().bookings).issues.some((b) => b.id === id));

    await assert.rejects(backend.admin.resolveIssue(id, 'ok'), { message: 'Say what was decided' });
    const resolved = await backend.admin.resolveIssue(id, 'Customer is back home, go ahead');
    assert.equal(resolved.issue, undefined);
    assert.equal(resolved.timeline.at(-1)!.kind, 'issue_resolved');
    await assert.rejects(backend.admin.resolveIssue(id, 'Nothing to do'), { message: RELEASE_ERRORS.noIssue });

    assert.equal((await advance(id, get(id).startCode)).status, 'in_progress');
    await assert.rejects(backend.vendor.releaseJob(vendorId, id, { reason: 'unwell' }), { message: RELEASE_ERRORS.onSite });
    await assert.rejects(backend.vendor.reportIssue(vendorId, id, { kind: 'cant_complete' }), { message: RELEASE_ERRORS.reason });
    await assert.rejects(backend.vendor.reportIssue(vendorId, id, { kind: 'cant_complete', reason: 'other' }), { message: RELEASE_ERRORS.note });
    const stuck = await backend.vendor.reportIssue(vendorId, id, { kind: 'cant_complete', reason: 'needs_part', note: 'Capacitor not in stock' });
    assert.equal(stuck.status, 'in_progress');
    assert.equal(stuck.timeline.at(-1)!.note, 'Ravi Patil: Can’t complete — Needs a part: Capacitor not in stock');

    // A return visit: same professional, new slot, back to "accepted".
    const back = await backend.admin.scheduleReturnVisit(id, day(6), '11:00 AM');
    assert.deepEqual([back.status, back.vendorId, back.date, back.issue], ['accepted', vendorId, day(6), undefined]);
    assert.ok(back.timeline.some((e) => e.kind === 'issue_resolved') && back.timeline.at(-1)!.kind === 'rescheduled');
    await assert.rejects(backend.admin.scheduleReturnVisit(id, day(-1), '11:00 AM'), { message: 'Please choose a future time slot' });

    // Reports never count against the completion rate.
    assert.deepEqual(stats(), before);
  });

  test('continuing or cancelling closes an open report', async () => {
    const { backend, get, vendorId, assignedJob, advance } = await setup();
    const id = await assignedJob();
    await advance(id);
    await advance(id);
    await advance(id);
    await backend.vendor.reportIssue(vendorId, id, { kind: 'cant_do', note: 'Needs a licensed gas fitter' });
    assert.ok(get(id).issue);

    const started = await advance(id, get(id).startCode);
    assert.deepEqual([started.status, started.issue], ['in_progress', undefined]);
    assert.ok(started.timeline.some((e) => e.kind === 'issue_resolved'));

    await backend.vendor.reportIssue(vendorId, id, { kind: 'cant_complete', reason: 'safety' });
    const cancelled = await backend.admin.setBookingStatus(id, 'cancelled', 'Unsafe wiring, refunding');
    assert.deepEqual([cancelled.status, cancelled.issue], ['cancelled', undefined]);
  });
});
