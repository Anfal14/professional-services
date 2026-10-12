/**
 * Quotes for extra work on a normal (fixed-price) booking, in the shared rules and the mock backend.
 * The flows match backend/src/test/java/com/profecian/ExtraWorkQuoteIT.java.
 *
 *   npm test   (from the repo root)
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  bookingProblemNames, canQuote, canQuoteExtraWork, canShareQuote, createMockBackend, DEMO, inspectionNextStep, isExtraWork, isNotSure, isQuoteOpen, QUOTE_ERRORS,
  type Booking,
} from '../src/index';

const at = (status: Booking['status'], inspection?: Booking['inspection']) => ({ status, inspection, vendorId: 'ven_1' });
const thread = (kind: 'not_sure' | 'extra_work', status: NonNullable<Booking['inspection']>['status']): NonNullable<Booking['inspection']> =>
  ({ kind, status, description: '', photos: [], fee: kind === 'extra_work' ? 0 : 199 });

describe('quote rules', () => {
  test('a quote can be shared only after the service is started, whatever was booked', () => {
    assert.equal(canQuoteExtraWork(at('accepted')), false);
    assert.equal(canQuoteExtraWork(at('on_the_way')), false);
    assert.equal(canQuoteExtraWork(at('arrived')), false);
    assert.equal(canQuoteExtraWork(at('in_progress')), true);
    assert.equal(canQuoteExtraWork(at('completed')), false);
    // A "Not sure" booking uses its own quote instead.
    assert.equal(canQuoteExtraWork(at('in_progress', thread('not_sure', 'pending'))), false);
    assert.equal(canShareQuote(at('arrived', thread('not_sure', 'pending'))), false);
    assert.equal(canShareQuote(at('in_progress', thread('not_sure', 'pending'))), true);
    assert.equal(canShareQuote(at('in_progress')), true);
  });

  test('one quote at a time; a declined one can be revised', () => {
    assert.equal(canShareQuote(at('in_progress', thread('extra_work', 'quoted'))), false);
    assert.equal(canShareQuote(at('in_progress', thread('extra_work', 'approved'))), false);
    assert.equal(canQuote(at('in_progress', thread('extra_work', 'declined'))), true);
    assert.equal(isQuoteOpen(at('in_progress', thread('extra_work', 'quoted'))), true);
    assert.equal(isQuoteOpen(at('in_progress', thread('extra_work', 'declined'))), false);
  });

  test('the two kinds are told apart, and described differently', () => {
    const extra = at('in_progress', thread('extra_work', 'declined'));
    const notSure = at('in_progress', { ...thread('not_sure', 'declined'), kind: undefined }); // older bookings carry no kind
    assert.deepEqual([isExtraWork(extra), isNotSure(extra)], [true, false]);
    assert.deepEqual([isExtraWork(notSure), isNotSure(notSure)], [false, true]);
    assert.match(inspectionNextStep(extra, 'vendor'), /booked work only/);
    assert.match(inspectionNextStep(notSure, 'vendor'), /inspection fee/);
    const names = bookingProblemNames({ problemTypes: [] }, { items: [{ problemTypeId: 'p', name: 'Fan repair', price: 249 }], inspection: extra.inspection });
    assert.deepEqual(names, ['Fan repair', 'Extra work']);
  });
});

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
  // Only one job can be in progress at a time: clear the demo vendor's seeded ones.
  for (const b of db().bookings.filter((x) => x.vendorId === vendorId && x.status === 'in_progress')) await backend.admin.setBookingStatus(b.id, 'cancelled', 'Cleared for a test');
  const date = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const quote = (id: string, description: string, amount: number) => backend.vendor.shareQuote(vendorId, id, [{ description, amount }], 'Found while checking the fan');
  const startedJob = async () => {
    const [b] = await backend.customer.checkout({
      customerId: customer!.id, groups: [{ categoryId: 'electrician', problemTypeIds: ['el-fan'] }], date, slot: '01:00 PM',
      address: customer!.addresses[0], contactName: 'Priya Sharma', contactPhone: '9876500001',
    });
    await backend.admin.assignVendor(b.id, vendorId);
    await backend.vendor.advanceJob(vendorId, b.id);
    await backend.vendor.advanceJob(vendorId, b.id);
    await backend.vendor.advanceJob(vendorId, b.id);
    // At the door is still too early: the service has to be started first.
    await assert.rejects(quote(b.id, 'Replace regulator', 350), { message: QUOTE_ERRORS.notStarted });
    await backend.vendor.advanceJob(vendorId, b.id, { startCode: get(b.id).startCode });
    return b.id;
  };
  return { backend, db, get, vendorId, customerId: customer!.id, quote, startedJob };
}

describe('mock backend', () => {
  test('an approved quote is added to the booked work', async () => {
    const { backend, db, get, vendorId, customerId, quote, startedJob } = await setup();
    const id = await startedJob();

    const quoted = await quote(id, 'Replace regulator', 350);
    assert.deepEqual([quoted.inspection!.kind, quoted.inspection!.status, quoted.inspection!.fee, quoted.inspection!.quote!.amount], ['extra_work', 'quoted', 0, 350]);
    assert.equal(quoted.price.serviceAmount, 249); // nothing changes until the customer answers
    assert.deepEqual([quoted.timeline.at(-1)!.kind, quoted.timeline.at(-1)!.note], ['quote_shared', 'Extra work: 1 item, ₹350 + GST']);
    assert.ok(db().notifications.some((n) => n.bookingId === id && n.audience === 'customer' && n.title === 'Quote for extra work'));
    assert.ok(db().notifications.some((n) => n.bookingId === id && n.audience === 'admin' && n.title === 'Extra-work quote shared'));

    await assert.rejects(backend.vendor.markNoWorkNeeded(vendorId, id, 'Nothing else to do'), { message: QUOTE_ERRORS.notSureOnly });
    await assert.rejects(quote(id, 'Another item', 100), { message: QUOTE_ERRORS.notStarted });

    const approved = await backend.customer.respondToQuote(customerId, id, true);
    assert.equal(approved.inspection!.status, 'approved');
    assert.deepEqual([approved.price.serviceAmount, approved.price.tax, approved.price.total], [599, 108, 707]);
    assert.equal(approved.price.commissionRate, quoted.price.commissionRate);
    assert.ok(get(id).price.vendorPayout > quoted.price.vendorPayout);
  });

  test('a declined quote leaves the booked price and can be revised', async () => {
    const { backend, get, customerId, quote, startedJob } = await setup();
    const id = await startedJob();
    await quote(id, 'Rewire the switchboard', 1200);
    await assert.rejects(backend.admin.setBookingStatus(id, 'completed'), { message: 'The extra-work quote has no answer yet — record the customer’s answer first' });

    const declined = await backend.customer.respondToQuote(customerId, id, false);
    assert.deepEqual([declined.inspection!.status, declined.price.serviceAmount, declined.price.total], ['declined', 249, 294]);

    assert.equal((await quote(id, 'Replace the faulty switch only', 200)).inspection!.status, 'quoted');
    assert.equal((await backend.admin.respondToQuote(id, true, 'Confirmed by phone')).inspection!.status, 'approved');
    assert.equal(get(id).price.serviceAmount, 449);
  });
});
