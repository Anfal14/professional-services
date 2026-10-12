/**
 * Safeguards on the professional's job workflow, in the shared rules and the mock backend. The rule
 * cases match backend/.../bookings/VendorJobRulesTest.java and the flows match VendorJobIT.java.
 *
 *   npm test   (from the repo root)
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createMockBackend, DEMO, isValidStartCode, JOB_ERRORS, newStartCode, otherJobInProgress, undoableStep, undoTimeLeft, type Booking,
} from '../src/index';

const T0 = Date.parse('2026-10-10T10:00:00Z');

/** A booking whose last timeline event is `kind` by `by`, made at T0. */
const at = (status: Booking['status'], kind: Booking['timeline'][number]['kind'], by: 'vendor' | 'admin', extra: Partial<Booking> = {}) => ({
  status,
  payment: { status: 'unpaid' as const },
  reviewId: undefined as string | undefined,
  timeline: [
    { kind: 'assigned' as const, by: 'admin' as const, at: new Date(T0 - 600_000).toISOString() },
    { kind, by, at: new Date(T0).toISOString() },
  ],
  ...extra,
});

describe('job rules', () => {
  test('start codes are four digits', () => {
    assert.ok(isValidStartCode('0482'));
    for (const bad of ['482', '12345', '12a4', '', undefined]) assert.equal(isValidStartCode(bad), false);
    for (let i = 0; i < 200; i++) assert.match(newStartCode(), /^\d{4}$/);
    assert.equal(newStartCode(() => 0.0482), '0482');
  });

  test('a step can be undone within the window (plus grace on the server)', () => {
    const b = at('arrived', 'arrived', 'vendor');
    assert.equal(undoableStep(b, T0 + 3_000), 'arrived');
    assert.equal(undoableStep(b, T0 + 10_000), 'arrived');
    assert.equal(undoableStep(b, T0 + 10_001), null);
    assert.equal(undoableStep(b, T0 + 15_000, 5_000), 'arrived');
    assert.equal(undoableStep(b, T0 + 16_000, 5_000), null);
    assert.equal(undoTimeLeft(b, T0 + 3_000), 7_000);
    assert.equal(undoTimeLeft(b, T0 + 12_000), 0);
  });

  test("only the professional's own latest step can be undone", () => {
    for (const s of ['accepted', 'on_the_way', 'in_progress', 'completed'] as const) assert.equal(undoableStep(at(s, s, 'vendor'), T0), s);
    assert.equal(undoableStep(at('arrived', 'arrived', 'admin'), T0), null); // support moved it
    assert.equal(undoableStep(at('in_progress', 'quote_shared', 'vendor'), T0), null); // something happened since
    assert.equal(undoableStep(at('assigned', 'assigned', 'vendor'), T0), null); // not a vendor step
  });

  test('a paid or reviewed job stays completed', () => {
    assert.equal(undoableStep(at('completed', 'completed', 'vendor', { payment: { status: 'paid' } }), T0), null);
    assert.equal(undoableStep(at('completed', 'completed', 'vendor', { payment: { status: 'pending' } }), T0), null);
    assert.equal(undoableStep(at('completed', 'completed', 'vendor', { reviewId: 'rev_1' }), T0), null);
  });

  test('messages match the backend', () => {
    assert.equal(JOB_ERRORS.startCodeWrong(4), 'That code doesn’t match — ask the customer for the start code in their app (4 tries left)');
    assert.ok(JOB_ERRORS.startCodeWrong(1).endsWith('(1 try left)'));
    assert.equal(JOB_ERRORS.busy('PF12AB'), 'Finish job PF12AB first — only one job can be in progress at a time');
  });
});

/** A fresh mock backend where the demo vendor (ven_1) has nothing in progress. */
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
  const finishOtherJobs = async () => {
    for (const b of db().bookings.filter((x) => x.vendorId === vendorId && x.status === 'in_progress')) await backend.admin.setBookingStatus(b.id, 'cancelled', 'Cleared for a test');
  };
  await finishOtherJobs();
  const date = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const assignedJob = async () => {
    const [b] = await backend.customer.checkout({
      customerId: customer!.id, groups: [{ categoryId: 'electrician', problemTypeIds: ['el-fan'] }], date, slot: '03:00 PM',
      address: customer!.addresses[0], contactName: 'Priya Sharma', contactPhone: '9876500001',
    });
    await backend.admin.assignVendor(b.id, vendorId);
    return b.id;
  };
  const advance = (id: string, startCode?: string) => backend.vendor.advanceJob(vendorId, id, { startCode });
  const toTheDoor = async (id: string) => {
    await advance(id);
    await advance(id);
    return advance(id);
  };
  const wrong = (code: string) => (code === '0000' ? '1111' : '0000');
  return { backend, db, get, vendorId, assignedJob, advance, toTheDoor, wrong };
}

describe('mock backend', () => {
  test('start code, after photo, undo and one job at a time', async () => {
    const { backend, db, get, vendorId, assignedJob, advance, toTheDoor, wrong } = await setup();
    const first = await assignedJob();
    const second = await assignedJob();

    assert.equal((await advance(first)).status, 'accepted');
    assert.equal((await advance(first)).status, 'on_the_way');
    assert.equal(get(first).startCode, undefined);
    const arrived = await advance(first);
    assert.equal(arrived.status, 'arrived');
    const code = get(first).startCode!;
    assert.match(code, /^\d{4}$/);
    assert.ok(db().notifications.some((n) => n.bookingId === first && n.kind === 'vendor_arrived' && n.body.includes(`Start code ${code}`)));

    // Starting needs that code.
    await assert.rejects(advance(first), { message: JOB_ERRORS.startCodeMissing });
    await assert.rejects(advance(first, '12'), { message: JOB_ERRORS.startCodeMissing });
    await assert.rejects(advance(first, wrong(code)), { message: JOB_ERRORS.startCodeWrong(4) });
    assert.equal(get(first).status, 'arrived');
    assert.equal((await advance(first, code)).status, 'in_progress');

    // Only one job in progress.
    await toTheDoor(second);
    const secondCode = get(second).startCode!;
    assert.equal(otherJobInProgress(db().bookings, vendorId, second)?.id, first);
    await assert.rejects(advance(second, secondCode), { message: JOB_ERRORS.busy(get(first).code) });

    // Completing needs an "after" photo; a "before" photo doesn't count.
    await assert.rejects(advance(first), { message: JOB_ERRORS.afterPhoto });
    await backend.vendor.addProofPhoto(vendorId, first, 'file:///before.jpg', 'before');
    await assert.rejects(advance(first), { message: JOB_ERRORS.afterPhoto });
    const withPhoto = await backend.vendor.addProofPhoto(vendorId, first, 'file:///after.jpg', 'after');
    assert.deepEqual([withPhoto.proofPhotos.length, withPhoto.afterPhotos?.length], [1, 1]);
    const jobsBefore = db().vendors.find((v) => v.id === vendorId)!.jobsCompleted;
    assert.equal((await advance(first)).status, 'completed');
    assert.equal(db().vendors.find((v) => v.id === vendorId)!.jobsCompleted, jobsBefore + 1);
    assert.ok(db().notifications.some((n) => n.bookingId === first && n.kind === 'service_completed'));

    // Undo: back to in progress, on the record, and the "completed" message is taken back.
    const undone = await backend.vendor.undoStep(vendorId, first);
    assert.equal(undone.status, 'in_progress');
    assert.deepEqual([undone.timeline.at(-1)!.kind, undone.timeline.at(-1)!.note], ['step_undone', 'Undid “Completed”']);
    assert.equal(db().vendors.find((v) => v.id === vendorId)!.jobsCompleted, jobsBefore);
    assert.equal(db().notifications.some((n) => n.bookingId === first && n.kind === 'service_completed'), false);
    await assert.rejects(backend.vendor.undoStep(vendorId, first), { message: JOB_ERRORS.undoExpired });

    // Complete again; once paid, the job stays completed.
    assert.equal((await advance(first)).status, 'completed');
    // Cash is recorded only for exactly the amount due.
    const due = get(first).price.total;
    await assert.rejects(backend.vendor.collectCash(vendorId, first, Number.NaN), { message: JOB_ERRORS.cashAmountMissing });
    await assert.rejects(backend.vendor.collectCash(vendorId, first, due - 1), { message: JOB_ERRORS.cashAmountMismatch });
    await assert.rejects(backend.vendor.collectCash(vendorId, first, due + 100), { message: JOB_ERRORS.cashAmountMismatch });
    assert.equal(get(first).payment.status, 'unpaid');
    assert.equal((await backend.vendor.collectCash(vendorId, first, due)).payment.status, 'paid');
    await assert.rejects(backend.vendor.undoStep(vendorId, first), { message: JOB_ERRORS.undoExpired });

    // With the first job done the second can start; undoing the start keeps the same code.
    assert.equal((await advance(second, secondCode)).status, 'in_progress');
    assert.equal((await backend.vendor.undoStep(vendorId, second)).status, 'arrived');
    assert.equal(get(second).startCode, secondCode);
    assert.equal((await advance(second, secondCode)).status, 'in_progress');
  });

  test('too many wrong codes lock the job until support starts it', async () => {
    const { backend, get, assignedJob, advance, toTheDoor, wrong } = await setup();
    const id = await assignedJob();
    await toTheDoor(id);
    const code = get(id).startCode!;

    for (let left = 4; left >= 1; left--) await assert.rejects(advance(id, wrong(code)), { message: JOB_ERRORS.startCodeWrong(left) });
    await assert.rejects(advance(id, wrong(code)), { message: JOB_ERRORS.startCodeLocked });
    await assert.rejects(advance(id, code), { message: JOB_ERRORS.startCodeLocked });

    const started = await backend.admin.setBookingStatus(id, 'in_progress', 'Customer couldn’t find the code');
    assert.equal(started.status, 'in_progress');
  });

  test('support moving a job to arrived also creates the start code', async () => {
    const { backend, get, assignedJob, advance } = await setup();
    const id = await assignedJob();
    await backend.admin.setBookingStatus(id, 'arrived');
    assert.match(get(id).startCode!, /^\d{4}$/);
    assert.equal((await advance(id, get(id).startCode)).status, 'in_progress');
  });

  test('photos are capped per kind', async () => {
    const { backend, vendorId, assignedJob } = await setup();
    const id = await assignedJob();
    for (let i = 0; i < 6; i++) await backend.vendor.addProofPhoto(vendorId, id, `file:///a${i}.jpg`, 'after');
    await assert.rejects(backend.vendor.addProofPhoto(vendorId, id, 'file:///a7.jpg', 'after'), { message: JOB_ERRORS.tooManyPhotos });
    await backend.vendor.addProofPhoto(vendorId, id, 'file:///b0.jpg');
  });
});
