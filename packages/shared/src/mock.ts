/**
 * Mock backend — the stand-in for the real API while only the frontend
 * exists. Holds the whole Database in memory, persists it through the
 * storage adapter each app injects (AsyncStorage), and exposes async
 * methods grouped by caller (customer / vendor / admin) with the same
 * shape a REST backend would have. Replace `createMockBackend` with an
 * HTTP client implementing the same `Backend` interface later.
 *
 * Note: each app has its own storage, so the three apps do not share
 * state with each other — every app starts from the same seed.
 */
import { bookingBlockedReason, commissionRateIn, findCity, inspectionFeeIn, normalizeCity, problemPriceIn, type CityInput } from './cities';
import { distanceKm, jitterNear } from './geo';
import { isValidPhone, normalizePhone, scheduledAt, toISODate } from './format';
import { notifyFor } from './notify';
import { afterPhotosOf, cashMatches, isValidStartCode, JOB_ERRORS, MAX_PROOF_PHOTOS, MIN_AFTER_PHOTOS, newStartCode, otherJobInProgress, START_CODE_MAX_ATTEMPTS, UNDO_GRACE_MS, undoableStep, VENDOR_PREVIOUS, type ProofKind } from './job';
import { canQuote, canQuoteExtraWork, isExtraWork, QUOTE_ERRORS, INSPECTION_MAX_PHOTOS, INSPECTION_MIN_DETAILS, inspectionServiceAmount, isQuoteOpen } from './inspection';
import { breakdownFor, computeBreakdown, computeVendorWallet } from './pricing';
import { sandboxOtp, sandboxPayments, type OtpProvider, type PaymentGateway, type PaymentRequest } from './providers';
import { createSeedDatabase, DB_VERSION, DEMO } from './seed';
import {
  canRelease, checkIssue, checkRelease, isLateRelease, issueNote, RELEASE_ERRORS, releaseNote, reliabilityOf, reliabilityPenalty,
} from './release';
import { BOOKING_STATUS, canCustomerModify, VENDOR_NEXT } from './status';
import type {
  Address, AdminUser, AppNotification, BankAccount, Booking, BookingEvent, BookingStatus, CantCompleteReason, City, Complaint, Customer, Database,
  ID, InspectionRequest, JobIssue, JobIssueKind, JobRelease, KycDocType, KycDocument, PaymentMethod, Payout, PlatformSettings, ProblemType, QuoteLine, ReleaseReason, Review, Role, ServiceCategory, Vendor, WorkingHours,
} from './types';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface Session {
  role: Role;
  userId: ID;
}

export interface Snapshot {
  db: Database;
  session: Session | null;
}

export class ApiError extends Error {}

export type BackendKind = 'mock' | 'http';

/** One visit per service in a cart checkout. */
export interface CheckoutGroup {
  categoryId: ID;
  problemTypeIds: ID[];
  notes?: string;
  inspection?: { description: string; photos?: string[] };
}

export interface CheckoutInput {
  customerId: ID;
  groups: CheckoutGroup[];
  date: string;
  slot: string;
  address: Omit<Address, 'id'> & { id?: ID };
  contactName: string;
  contactPhone: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;
const bookingCode = () => `PF${Date.now().toString(36).slice(-4).toUpperCase()}${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase().padStart(2, '0')}`;

const replace = <T extends { id: string }>(list: T[], id: string, patch: NoInfer<Partial<T> | ((item: T) => T)>): T[] =>
  list.map((item) => (item.id === id ? (typeof patch === 'function' ? patch(item) : { ...item, ...patch }) : item));

/* ───────────── Role-based access for the admin panel ───────────── */

export type AdminPermission = 'dashboard' | 'users' | 'vendors' | 'services' | 'bookings' | 'payments' | 'reviews' | 'analytics' | 'settings';

export const ROLE_PERMISSIONS: Record<AdminUser['role'], AdminPermission[]> = {
  super_admin: ['dashboard', 'users', 'vendors', 'services', 'bookings', 'payments', 'reviews', 'analytics', 'settings'],
  operations: ['dashboard', 'users', 'vendors', 'services', 'bookings', 'reviews', 'analytics'],
  finance: ['dashboard', 'payments', 'analytics'],
  support: ['dashboard', 'users', 'bookings', 'reviews'],
};

export function can(admin: AdminUser | undefined | null, permission: AdminPermission): boolean {
  return !!admin && ROLE_PERMISSIONS[admin.role].includes(permission);
}

/* ───────────── Vendor matching ───────────── */

export interface VendorSuggestion {
  vendor: Vendor;
  distanceKm: number;
  /** Active jobs on the booking's date */
  workload: number;
  matchesService: boolean;
  available: boolean;
  score: number;
}

/** Approved vendors based in the booking's city, best first. */
export function suggestVendors(db: Database, booking: Booking): VendorSuggestion[] {
  const target = booking.address.lat != null && booking.address.lng != null
    ? { lat: booking.address.lat, lng: booking.address.lng }
    : jitterNear(booking.address.city, booking.id, db.settings.cities);
  const city = booking.address.city.toLowerCase();
  return db.vendors
    .filter((v) => v.status === 'approved' && v.city.toLowerCase() === city)
    .map((v) => {
      const workload = db.bookings.filter(
        (b) => b.vendorId === v.id && b.date === booking.date && !['completed', 'cancelled'].includes(b.status),
      ).length;
      const d = distanceKm(target, v.location);
      const matchesService = v.categoryIds.includes(booking.categoryId);
      // Lower is better: distance dominates, then workload, then rating.
      // Lower is better: distance dominates, then workload, rating and the completion rate.
      const score = d + workload * 4 - v.rating * 2 + (matchesService ? 0 : 1000) + (v.available ? 0 : 500) + reliabilityPenalty(reliabilityOf(db, v).rate);
      return { vendor: v, distanceKm: Math.round(d * 10) / 10, workload, matchesService, available: v.available, score };
    })
    .sort((a, b) => a.score - b.score);
}

/* ───────────── The backend ───────────── */

export interface BackendOptions {
  storage: KeyValueStorage;
  /** Storage key prefix, one per app, e.g. "@profecian/customer" */
  namespace: string;
  latencyMs?: number;
  otp?: OtpProvider;
  payments?: PaymentGateway;
}

export function createMockBackend(options: BackendOptions) {
  const { storage, namespace, latencyMs = 250, otp = sandboxOtp, payments = sandboxPayments } = options;
  const DB_KEY = `${namespace}/db/v${DB_VERSION}`;
  const SESSION_KEY = `${namespace}/session/v1`;

  let snapshot: Snapshot = { db: createSeedDatabase(), session: null };
  const listeners = new Set<() => void>();
  let ready = false;

  const emit = () => listeners.forEach((l) => l());
  const wait = () => sleep(latencyMs);

  async function persist() {
    try {
      await storage.setItem(DB_KEY, JSON.stringify(snapshot.db));
      if (snapshot.session) await storage.setItem(SESSION_KEY, JSON.stringify(snapshot.session));
      else await storage.removeItem(SESSION_KEY);
    } catch {
      // Storage full/unavailable: keep working in memory.
    }
  }

  /** Apply an immutable update to the database, append notifications, persist and notify subscribers. */
  function commit(update: (db: Database) => Database, extra: AppNotification[] = []) {
    const db = update(snapshot.db);
    snapshot = { ...snapshot, db: extra.length ? { ...db, notifications: [...extra, ...db.notifications] } : db };
    emit();
    void persist();
  }

  function setSession(session: Session | null) {
    snapshot = { ...snapshot, session };
    emit();
    void persist();
  }

  const db = () => snapshot.db;
  const getBooking = (id: ID) => {
    const b = db().bookings.find((x) => x.id === id);
    if (!b) throw new ApiError('Booking not found');
    return b;
  };
  const getVendor = (id: ID) => {
    const v = db().vendors.find((x) => x.id === id);
    if (!v) throw new ApiError('Vendor not found');
    return v;
  };
  const event = (kind: BookingEvent['kind'], by: BookingEvent['by'], note?: string): BookingEvent => ({ kind, by, note, at: new Date().toISOString() });

  function updateBooking(id: ID, patch: (b: Booking) => Booking, notes: (b: Booking) => AppNotification[] = () => []) {
    let updated: Booking | undefined;
    commit((d) => ({ ...d, bookings: replace(d.bookings, id, (b) => (updated = patch(b))) }));
    const out = updated!;
    const n = notes(out);
    if (n.length) commit((d) => d, n);
    return out;
  }

  /** Arriving creates the start code the customer reads out; starting clears the wrong-code count. */
  const withStartCode = (b: Booking): Booking =>
    b.status === 'arrived' && !b.startCode ? { ...b, startCode: newStartCode(), startCodeAttempts: 0 } : b.status === 'in_progress' ? { ...b, startCodeAttempts: 0 } : b;

  /** Notifications a vendor step sends — taken back if the step is undone. */
  const STEP_NOTIFICATIONS = ['vendor_on_the_way', 'vendor_arrived', 'service_completed'];

  const otpRequests = new Map<string, string>();

  async function sendOtp(phone: string) {
    if (!isValidPhone(phone)) throw new ApiError('Enter a valid 10-digit mobile number');
    const res = await otp.send(phone);
    otpRequests.set(res.requestId, normalizePhone(phone));
    return res;
  }

  async function checkOtp(requestId: string, code: string) {
    const phone = otpRequests.get(requestId);
    if (!phone) throw new ApiError('OTP expired, please request a new one');
    if (!(await otp.verify(requestId, code))) throw new ApiError('Incorrect OTP');
    otpRequests.delete(requestId);
    return phone;
  }

  function markRead(recipientId: ID, ids?: ID[]) {
    commit((d) => ({
      ...d,
      notifications: d.notifications.map((n) => (n.recipientId === recipientId && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)),
    }));
  }

  /* ───────── "Other / Not sure" (inspection) — shared by all roles ───────── */

  /** Price follows the inspection: known problems + fee, or + the approved quote instead of the fee. */
  const repriced = (b: Booking): Booking =>
    // The commission rate stays the one the booking was placed with (its city's or category's at the time).
    ({ ...b, price: computeBreakdown(inspectionServiceAmount(b), b.price.commissionRate, db().settings.taxRate) });

  const openInspection = (b: Booking): InspectionRequest => {
    if (!b.inspection) throw new ApiError('This booking has no “Not sure” request');
    if (b.status === 'cancelled' || b.status === 'completed') throw new ApiError('This booking is closed');
    return b.inspection;
  };

  function settleQuote(bookingId: ID, approve: boolean, by: 'customer' | 'admin', note?: string) {
    const i = openInspection(getBooking(bookingId));
    if (i.status !== 'quoted' || !i.quote) throw new ApiError('There is no quote waiting for an answer');
    const quote = { ...i.quote, respondedAt: new Date().toISOString(), respondedBy: by };
    return updateBooking(
      bookingId,
      (x) => repriced({
        ...x,
        inspection: { ...i, status: approve ? 'approved' : 'declined', quote },
        timeline: [...x.timeline, event(approve ? 'quote_approved' : 'quote_declined', by, note?.trim() || undefined)],
      }),
      (x) => notifyFor.quoteResponse(db(), x, approve),
    );
  }

  /* ───────── Customer ───────── */

  const customer = {
    requestOtp: sendOtp,

    /** Returns the customer if the number is registered, or `null` when a profile must be created. */
    async verifyOtp(requestId: string, code: string): Promise<{ phone: string; customer: Customer | null }> {
      const phone = await checkOtp(requestId, code);
      const c = db().customers.find((x) => x.phone === phone) ?? null;
      if (c?.blocked) throw new ApiError('This account has been blocked. Please contact support.');
      if (c) setSession({ role: 'customer', userId: c.id });
      return { phone, customer: c };
    },

    async createProfile(input: { phone: string; name: string; email?: string; city: string }): Promise<Customer> {
      await wait();
      const phone = normalizePhone(input.phone);
      if (db().customers.some((c) => c.phone === phone)) throw new ApiError('An account already exists for this number');
      const c: Customer = { id: uid('cus'), name: input.name.trim(), phone, email: input.email?.trim() || undefined, city: input.city, addresses: [], blocked: false, createdAt: new Date().toISOString() };
      commit((d) => ({ ...d, customers: [c, ...d.customers] }));
      setSession({ role: 'customer', userId: c.id });
      return c;
    },

    async updateProfile(id: ID, patch: Partial<Pick<Customer, 'name' | 'email' | 'city'>>) {
      await wait();
      commit((d) => ({ ...d, customers: replace(d.customers, id, patch) }));
    },

    async saveAddress(customerId: ID, address: Omit<Address, 'id'> & { id?: ID }): Promise<Address> {
      const saved: Address = { ...address, id: address.id ?? uid('adr'), ...(address.lat == null ? jitterNear(address.city, address.line, db().settings.cities) : {}) };
      commit((d) => ({
        ...d,
        customers: replace(d.customers, customerId, (c) => ({
          ...c,
          addresses: c.addresses.some((a) => a.id === saved.id) ? c.addresses.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...c.addresses],
        })),
      }));
      return saved;
    },

    async deleteAddress(customerId: ID, addressId: ID): Promise<void> {
      await wait();
      commit((d) => ({
        ...d,
        customers: replace(d.customers, customerId, (c) => ({ ...c, addresses: c.addresses.filter((a) => a.id !== addressId) })),
      }));
    },

    async createBooking(input: {
      customerId: ID; categoryId: ID; problemTypeIds: ID[]; date: string; slot: string;
      address: Omit<Address, 'id'> & { id?: ID }; contactName: string; contactPhone: string; notes?: string;
      /** "Other / Not sure": what the customer sees, in their own words, plus optional photos. */
      inspection?: { description: string; photos?: string[] };
    }): Promise<Booking> {
      await wait();
      const d = db();
      const category = d.categories.find((c) => c.id === input.categoryId && c.enabled);
      const ids = [...new Set(input.problemTypeIds)];
      const problems = ids.map((id) => d.problemTypes.find((p) => p.id === id && p.categoryId === input.categoryId && p.enabled));
      if (!category || problems.some((p) => !p)) throw new ApiError('This service is currently unavailable');
      const blocked = bookingBlockedReason(d.settings, input.address.city, category);
      if (blocked) throw new ApiError(blocked);
      if (!problems.length && !input.inspection) throw new ApiError('Choose a problem, or “Other / Not sure”');
      const description = input.inspection?.description.trim() ?? '';
      if (input.inspection && description.length < INSPECTION_MIN_DETAILS) {
        throw new ApiError(`Describe the problem in a few words (at least ${INSPECTION_MIN_DETAILS} characters)`);
      }
      // Prices, the inspection fee and the commission all follow the city of the visit address.
      const city = findCity(d.settings, input.address.city);
      const items = (problems as ProblemType[]).map((p) => ({ problemTypeId: p.id, name: p.name, price: problemPriceIn(p, city) }));
      const inspection: InspectionRequest | undefined = input.inspection
        ? {
            description,
            photos: (input.inspection.photos ?? []).slice(0, INSPECTION_MAX_PHOTOS),
            fee: inspectionFeeIn(category, d.settings, city),
            status: 'pending',
          }
        : undefined;
      if (!isValidPhone(input.contactPhone)) throw new ApiError('Enter a valid contact number');
      if (scheduledAt(input.date, input.slot).getTime() < Date.now()) throw new ApiError('Please choose a future time slot');
      const address = await customer.saveAddress(input.customerId, input.address);
      const b: Booking = {
        id: uid('bkg'), code: bookingCode(), customerId: input.customerId,
        customerName: input.contactName.trim(), customerPhone: normalizePhone(input.contactPhone),
        categoryId: category.id, problemTypeId: items[0]?.problemTypeId, items, inspection, date: input.date, slot: input.slot, address,
        notes: input.notes?.trim() || undefined, status: 'pending_assignment',
        price: computeBreakdown(inspectionServiceAmount({ items, inspection }), commissionRateIn(category, d.settings, city), d.settings.taxRate), payment: { status: 'unpaid' }, proofPhotos: [], afterPhotos: [],
        timeline: [event('pending_assignment', 'customer', 'Booking placed')], createdAt: new Date().toISOString(),
      };
      commit((x) => ({ ...x, bookings: [b, ...x.bookings] }), notifyFor.bookingCreated(d, b));
      return b;
    },

    /** Cart checkout: one booking per service with a shared slot, address and contact — all or nothing. */
    async checkout(input: CheckoutInput): Promise<Booking[]> {
      if (!input.groups.length) throw new ApiError('Your cart is empty');
      const snapshotBefore = snapshot;
      const created: Booking[] = [];
      try {
        let address = input.address;
        for (const g of input.groups) {
          const b = await customer.createBooking({ ...g, customerId: input.customerId, date: input.date, slot: input.slot, address, contactName: input.contactName, contactPhone: input.contactPhone });
          created.push(b);
          address = b.address;
        }
        return created;
      } catch (e) {
        // Roll back the visits already placed so the cart is never half-booked.
        snapshot = snapshotBefore;
        emit();
        void persist();
        throw e;
      }
    },

    async respondToQuote(customerId: ID, bookingId: ID, approve: boolean) {
      await wait();
      if (getBooking(bookingId).customerId !== customerId) throw new ApiError('Booking not found');
      return settleQuote(bookingId, approve, 'customer');
    },

    async cancelBooking(id: ID, reason: string) {
      await wait();
      if (!canCustomerModify(getBooking(id).status)) throw new ApiError('This booking can no longer be cancelled');
      return updateBooking(
        id,
        (b) => ({ ...b, status: 'cancelled', cancelReason: reason, urgent: false, issue: undefined, timeline: [...b.timeline, event('cancelled', 'customer', reason)] }),
        (b) => notifyFor.cancelled(db(), b, 'customer'),
      );
    },

    async rescheduleBooking(id: ID, date: string, slot: string) {
      await wait();
      if (!canCustomerModify(getBooking(id).status)) throw new ApiError('This booking can no longer be rescheduled');
      if (scheduledAt(date, slot).getTime() < Date.now()) throw new ApiError('Please choose a future time slot');
      return updateBooking(
        id,
        (b) => ({ ...b, date, slot, timeline: [...b.timeline, event('rescheduled', 'customer', `Moved to ${date} ${slot}`)] }),
        (b) => notifyFor.rescheduled(db(), b),
      );
    },

    /** Choose "cash after service" — collected by the professional on completion. */
    async chooseCash(id: ID) {
      await wait();
      return updateBooking(id, (b) => ({ ...b, payment: { ...b.payment, method: 'cash' } }));
    },

    async payOnline(id: ID, method: PaymentRequest['method'], opts: { simulateFailure?: boolean } = {}) {
      const b = getBooking(id);
      if (b.payment.status === 'paid') throw new ApiError('This booking is already paid');
      if (isQuoteOpen(b)) throw new ApiError('You can pay once the inspection is done and the repair quote is settled');
      updateBooking(id, (x) => ({ ...x, payment: { method, status: 'pending' } }));
      const res = await payments.charge({ amount: b.price.total, method, bookingCode: b.code, simulateFailure: opts.simulateFailure });
      if (!res.ok) {
        updateBooking(
          id,
          (x) => ({ ...x, payment: { method, status: 'failed', failureReason: res.reason }, timeline: [...x.timeline, event('payment_failed', 'system', res.reason)] }),
          (x) => notifyFor.paymentFailed(db(), x, res.reason),
        );
        throw new ApiError(res.reason);
      }
      return updateBooking(
        id,
        (x) => ({ ...x, payment: { method, status: 'paid', paidAt: new Date().toISOString(), txnId: res.txnId }, timeline: [...x.timeline, event('payment_received', 'system', res.txnId)] }),
        (x) => notifyFor.paymentReceived(db(), x),
      );
    },

    async submitReview(input: { bookingId: ID; rating: number; text: string; images: string[] }): Promise<Review> {
      await wait();
      const b = getBooking(input.bookingId);
      if (b.status !== 'completed' || !b.vendorId) throw new ApiError('You can review a booking once it is completed');
      if (b.reviewId) throw new ApiError('You have already reviewed this booking');
      const r: Review = {
        id: uid('rev'), bookingId: b.id, customerId: b.customerId, customerName: b.customerName, vendorId: b.vendorId,
        categoryId: b.categoryId, rating: Math.min(5, Math.max(1, Math.round(input.rating))), text: input.text.trim(),
        images: input.images, status: 'published', createdAt: new Date().toISOString(),
      };
      commit((d) => {
        const vendorReviews = [...d.reviews.filter((x) => x.vendorId === r.vendorId && x.status === 'published'), r];
        const avg = Math.round((vendorReviews.reduce((s, x) => s + x.rating, 0) / vendorReviews.length) * 10) / 10;
        return {
          ...d,
          reviews: [r, ...d.reviews],
          bookings: replace(d.bookings, b.id, (x) => ({ ...x, reviewId: r.id, timeline: [...x.timeline, event('reviewed', 'customer')] })),
          vendors: replace(d.vendors, r.vendorId, { rating: avg, ratingCount: vendorReviews.length }),
        };
      });
      return r;
    },

    async raiseComplaint(input: { bookingId: ID; subject: string; message: string }): Promise<Complaint> {
      await wait();
      const b = getBooking(input.bookingId);
      const c: Complaint = { id: uid('cmp'), bookingId: b.id, customerId: b.customerId, vendorId: b.vendorId, subject: input.subject.trim(), message: input.message.trim(), status: 'open', createdAt: new Date().toISOString() };
      commit((d) => ({ ...d, complaints: [c, ...d.complaints] }), notifyFor.complaint(b, c.subject));
      return c;
    },

    markNotificationsRead: markRead,
  };

  /* ───────── Vendor ───────── */

  const REQUIRED_DOCS: KycDocType[] = ['aadhaar', 'pan', 'selfie', 'bank_proof'];

  const vendor = {
    requestOtp: sendOtp,

    async verifyOtp(requestId: string, code: string): Promise<{ phone: string; vendor: Vendor | null }> {
      const phone = await checkOtp(requestId, code);
      const v = db().vendors.find((x) => x.phone === phone) ?? null;
      if (v) setSession({ role: 'vendor', userId: v.id });
      return { phone, vendor: v };
    },

    async register(input: { phone: string; name: string; email?: string; city: string; categoryIds: ID[]; serviceAreas: string[] }): Promise<Vendor> {
      await wait();
      const phone = normalizePhone(input.phone);
      if (db().vendors.some((v) => v.phone === phone)) throw new ApiError('A vendor account already exists for this number');
      if (!input.categoryIds.length) throw new ApiError('Select at least one service category');
      const city = findCity(db().settings, input.city);
      if (!city || city.status === 'paused') throw new ApiError('We aren’t accepting partners in that city right now');
      const v: Vendor = {
        id: uid('ven'), name: input.name.trim(), phone, email: input.email?.trim() || undefined, city: city.name,
        serviceAreas: input.serviceAreas, categoryIds: input.categoryIds, status: 'pending',
        kyc: (['aadhaar', 'pan', 'driving_license', 'selfie', 'bank_proof'] as KycDocType[]).map((type) => ({ type, status: 'missing' })),
        available: false, workingHours: { start: '09:00', end: '19:00', days: [1, 2, 3, 4, 5, 6] },
        rating: 0, ratingCount: 0, jobsCompleted: 0, location: jitterNear(city.name, phone, db().settings.cities), joinedAt: new Date().toISOString(),
      };
      commit((d) => ({ ...d, vendors: [v, ...d.vendors] }));
      setSession({ role: 'vendor', userId: v.id });
      return v;
    },

    async uploadDocument(vendorId: ID, type: KycDocType, doc: { number?: string; imageUri?: string }) {
      await wait();
      const masked = doc.number ? doc.number.replace(/\s/g, '').replace(/.(?=.{4})/g, 'X') : undefined;
      const next: KycDocument = { type, number: masked, imageUri: doc.imageUri, status: 'pending', uploadedAt: new Date().toISOString() };
      // A changed document needs a fresh review unless the vendor is already approved.
      commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, (v) => ({ ...v, kyc: v.kyc.map((k) => (k.type === type ? next : k)), kycSubmittedAt: v.status === 'approved' ? v.kycSubmittedAt : undefined })) }));
    },

    async saveBank(vendorId: ID, input: { holderName: string; accountNumber: string; ifsc: string; bankName: string }) {
      await wait();
      const acct = input.accountNumber.replace(/\s/g, '');
      if (!/^\d{9,18}$/.test(acct)) throw new ApiError('Enter a valid account number');
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(input.ifsc.toUpperCase())) throw new ApiError('Enter a valid IFSC code');
      const bank: BankAccount = { holderName: input.holderName.trim(), accountLast4: acct.slice(-4), ifsc: input.ifsc.toUpperCase(), bankName: input.bankName.trim() };
      commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, { bank }) }));
    },

    /** Submit a completed registration for admin review. */
    async submitForReview(vendorId: ID) {
      await wait();
      const v = getVendor(vendorId);
      const missing = REQUIRED_DOCS.filter((t) => v.kyc.find((k) => k.type === t)?.status === 'missing');
      if (missing.length) throw new ApiError('Upload all required documents first');
      if (!v.bank) throw new ApiError('Add your bank account details first');
      if (v.kyc.some((k) => k.status === 'rejected')) throw new ApiError('Re-upload the rejected documents first');
      commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, { status: 'pending', rejectionReason: undefined, kycSubmittedAt: new Date().toISOString() }) }), notifyFor.vendorSubmitted(v));
    },

    async updateProfile(vendorId: ID, patch: Partial<Pick<Vendor, 'available' | 'serviceAreas' | 'categoryIds' | 'email' | 'photo'>> & { workingHours?: WorkingHours }) {
      commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, patch) }));
    },

    /** Move a job to its next workflow step (accept → on the way → arrived → in progress → completed). */
    /** Accept → on the way → arrived → in progress (needs the customer's start code) → completed (needs an "after" photo). */
    async advanceJob(vendorId: ID, bookingId: ID, opts: { startCode?: string } = {}) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      const next = VENDOR_NEXT[b.status];
      if (!next) throw new ApiError('No further action for this job');
      if (next === 'in_progress') {
        const busy = otherJobInProgress(db().bookings, vendorId, bookingId);
        if (busy) throw new ApiError(JOB_ERRORS.busy(busy.code));
        const attempts = b.startCodeAttempts ?? 0;
        if (attempts >= START_CODE_MAX_ATTEMPTS) throw new ApiError(JOB_ERRORS.startCodeLocked);
        if (!isValidStartCode(opts.startCode)) throw new ApiError(JOB_ERRORS.startCodeMissing);
        if (opts.startCode !== b.startCode) {
          updateBooking(bookingId, (x) => ({ ...x, startCodeAttempts: attempts + 1 }));
          const left = START_CODE_MAX_ATTEMPTS - attempts - 1;
          throw new ApiError(left > 0 ? JOB_ERRORS.startCodeWrong(left) : JOB_ERRORS.startCodeLocked);
        }
      }
      if (next === 'completed' && isQuoteOpen(b)) {
        throw new ApiError(
          b.inspection?.status === 'quoted'
            ? 'Wait for the customer to approve or decline your quote before completing'
            : 'Share a quote, or mark that no repair is needed, before completing',
        );
      }
      if (next === 'completed' && afterPhotosOf(b).length < MIN_AFTER_PHOTOS) throw new ApiError(JOB_ERRORS.afterPhoto);
      const v = getVendor(vendorId);
      const updated = updateBooking(
        bookingId,
        (x) => withStartCode({
          ...x,
          status: next,
          issue: undefined,
          timeline: [...x.timeline, ...(x.issue ? [event('issue_resolved', 'vendor', 'The professional continued the job')] : []), event(next, 'vendor')],
        }),
        (x) => (next === 'on_the_way' ? notifyFor.vendorOnTheWay(db(), x, v) : next === 'arrived' ? notifyFor.vendorArrived(db(), x, v)
          : next === 'completed' ? notifyFor.serviceCompleted(db(), x) : []),
      );
      if (next === 'completed') commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, (x) => ({ ...x, jobsCompleted: x.jobsCompleted + 1 })) }));
      return updated;
    },

    /** After inspecting: an itemised quote the customer must approve before the repair starts. */
    async shareQuote(vendorId: ID, bookingId: ID, lines: QuoteLine[], note?: string) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      if (b.status === 'cancelled' || b.status === 'completed') throw new ApiError('This booking is closed');
      // "Not sure": the first or a revised quote. A normal booking: a quote for extra work found on site.
      if (b.inspection ? !canQuote(b) : !canQuoteExtraWork(b)) throw new ApiError(QUOTE_ERRORS.notStarted);
      const i: InspectionRequest = b.inspection ?? { kind: 'extra_work', description: '', photos: [], fee: 0, status: 'pending' };
      const clean = lines
        .map((l) => ({ description: l.description.trim(), amount: Math.round(Number(l.amount)) }))
        .filter((l) => l.description || l.amount);
      if (!clean.length) throw new ApiError('Add at least one item to the quote');
      if (clean.length > 10) throw new ApiError('Keep the quote to 10 items or fewer');
      if (clean.some((l) => l.description.length < 3)) throw new ApiError('Describe each item of the quote');
      if (clean.some((l) => !Number.isFinite(l.amount) || l.amount <= 0 || l.amount > 500_000)) throw new ApiError('Enter a valid amount for each item');
      const amount = clean.reduce((sum, l) => sum + l.amount, 0);
      return updateBooking(
        bookingId,
        (x) => ({
          ...x,
          inspection: { ...i, status: 'quoted', quote: { lines: clean, amount, note: note?.trim() || undefined, vendorId, createdAt: new Date().toISOString() } },
          timeline: [...x.timeline, event('quote_shared', 'vendor', `${i.kind === 'extra_work' ? 'Extra work: ' : ''}${clean.length} item${clean.length > 1 ? 's' : ''}, ₹${amount} + GST`)],
        }),
        (x) => notifyFor.quoteShared(db(), x),
      );
    },

    async markNoWorkNeeded(vendorId: ID, bookingId: ID, note: string) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      const i = openInspection(b);
      if (isExtraWork(b)) throw new ApiError(QUOTE_ERRORS.notSureOnly);
      if (!canQuote(b)) throw new ApiError(QUOTE_ERRORS.noWorkNotStarted);
      const text = note.trim();
      if (text.length < 5) throw new ApiError('Tell the customer what you found');
      return updateBooking(bookingId, (x) => repriced({
        ...x,
        inspection: { ...i, status: 'no_work_needed', noWorkNote: text, quote: undefined },
        timeline: [...x.timeline, event('no_work_needed', 'vendor', text)],
      }));
    },

    /** Decline an assigned job — it goes back to the admin queue. */
    /** Turning down a job that was only offered: the reason is optional and nothing goes on the professional's record. */
    async declineJob(vendorId: ID, bookingId: ID, reason?: string) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId || b.status !== 'assigned') throw new ApiError('Only newly assigned jobs can be declined');
      const why = reason?.trim();
      return updateBooking(
        bookingId,
        (x) => ({ ...x, status: 'pending_assignment', vendorId: undefined, timeline: [...x.timeline, event('pending_assignment', 'vendor', why ? `Declined: ${why}` : 'Declined')] }),
        (x) => [...notifyFor.bookingCreated(db(), x).filter((n) => n.audience === 'admin')],
      );
    },

    /**
     * "Can't make it" after accepting: the booking goes back to the admin's queue without this
     * professional. Late (2 h or less to the slot, or on the way) marks it urgent and counts against
     * the completion rate. The customer is told straight away. The booking is never cancelled here.
     */
    async releaseJob(vendorId: ID, bookingId: ID, input: { reason: ReleaseReason; note?: string }) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      if (!canRelease(b.status)) throw new ApiError(b.status === 'arrived' || b.status === 'in_progress' ? RELEASE_ERRORS.onSite : RELEASE_ERRORS.notReleasable);
      const checked = checkRelease(input.reason, input.note);
      if ('error' in checked) throw new ApiError(checked.error);
      const v = getVendor(vendorId);
      const release: JobRelease = { vendorId, vendorName: v.name, ...checked, late: isLateRelease(b), at: new Date().toISOString() };
      return updateBooking(
        bookingId,
        (x) => ({
          ...x,
          status: 'pending_assignment',
          vendorId: undefined,
          urgent: release.late,
          releases: [...(x.releases ?? []), release],
          // A quote belongs to the professional who made it.
          inspection: x.inspection?.status === 'quoted' ? { ...x.inspection, status: 'pending', quote: undefined } : x.inspection,
          timeline: [...x.timeline, event('released', 'vendor', releaseNote(release))],
        }),
        (x) => notifyFor.jobReleased(db(), x, release),
      );
    },

    /**
     * On site there is no release: the professional reports the problem ("customer not available",
     * "can't do this job", or "can't complete" once started) and keeps the job until the admin decides.
     */
    async reportIssue(vendorId: ID, bookingId: ID, input: { kind: JobIssueKind; reason?: CantCompleteReason; note?: string }) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      const checked = checkIssue(b.status, input.kind, input.reason, input.note);
      if ('error' in checked) throw new ApiError(checked.error);
      const issue: JobIssue = { ...checked, vendorId, vendorName: getVendor(vendorId).name, at: new Date().toISOString() };
      return updateBooking(
        bookingId,
        (x) => ({ ...x, issue, timeline: [...x.timeline, event('issue_reported', 'vendor', issueNote(issue))] }),
        (x) => notifyFor.issueReported(db(), x, issue),
      );
    },

    /** Takes back the professional's last step, within the undo window (see undoableStep). */
    async undoStep(vendorId: ID, bookingId: ID) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      const step = undoableStep(b, Date.now(), UNDO_GRACE_MS);
      const previous = step && VENDOR_PREVIOUS[step];
      if (!step || !previous) throw new ApiError(JOB_ERRORS.undoExpired);
      const since = b.timeline[b.timeline.length - 1].at;
      const updated = updateBooking(bookingId, (x) => ({ ...x, status: previous, timeline: [...x.timeline, event('step_undone', 'vendor', `Undid “${BOOKING_STATUS[step].label}”`)] }));
      commit((d) => ({
        ...d,
        // The customer shouldn't keep a message about a step that didn't happen.
        notifications: d.notifications.filter((n) => !(n.bookingId === bookingId && n.createdAt >= since && STEP_NOTIFICATIONS.includes(n.kind))),
        vendors: step === 'completed' ? replace(d.vendors, vendorId, (x) => ({ ...x, jobsCompleted: Math.max(0, x.jobsCompleted - 1) })) : d.vendors,
      }));
      return updated;
    },

    async addProofPhoto(vendorId: ID, bookingId: ID, uri: string, kind: ProofKind = 'before') {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId) throw new ApiError('This job is not assigned to you');
      if ((kind === 'after' ? afterPhotosOf(b) : b.proofPhotos).length >= MAX_PROOF_PHOTOS) throw new ApiError(JOB_ERRORS.tooManyPhotos);
      return updateBooking(bookingId, (x) => (kind === 'after' ? { ...x, afterPhotos: [...afterPhotosOf(x), uri] } : { ...x, proofPhotos: [...x.proofPhotos, uri] }));
    },

    /** The professional types the cash they were handed; it must be exactly the amount due. */
    async collectCash(vendorId: ID, bookingId: ID, amountReceived: number) {
      await wait();
      const b = getBooking(bookingId);
      if (b.vendorId !== vendorId || b.status !== 'completed') throw new ApiError('Collect payment after completing the service');
      if (b.payment.status === 'paid') throw new ApiError('Payment already received');
      if (!(amountReceived >= 0)) throw new ApiError(JOB_ERRORS.cashAmountMissing);
      if (!cashMatches(amountReceived, b.price.total)) throw new ApiError(JOB_ERRORS.cashAmountMismatch);
      return updateBooking(
        bookingId,
        (x) => ({ ...x, payment: { method: 'cash', status: 'paid', paidAt: new Date().toISOString() }, timeline: [...x.timeline, event('payment_received', 'vendor', 'Cash collected')] }),
        (x) => notifyFor.paymentReceived(db(), x),
      );
    },

    async requestPayout(vendorId: ID): Promise<Payout> {
      await wait();
      const d = db();
      const wallet = computeVendorWallet(vendorId, d.bookings, d.payouts);
      if (wallet.balance < 100) throw new ApiError('Minimum payout is ₹100');
      const settledIds = new Set(d.payouts.filter((p) => p.vendorId === vendorId).flatMap((p) => p.bookingIds));
      const bookingIds = d.bookings.filter((b) => b.vendorId === vendorId && b.status === 'completed' && b.payment.status === 'paid' && !settledIds.has(b.id)).map((b) => b.id);
      const p: Payout = { id: uid('pay'), vendorId, amount: wallet.balance, bookingIds, status: 'pending', createdAt: new Date().toISOString() };
      commit((x) => ({ ...x, payouts: [p, ...x.payouts] }));
      return p;
    },

    markNotificationsRead: markRead,
  };

  /* ───────── Admin ───────── */

  const admin = {
    async login(email: string, password: string): Promise<AdminUser> {
      await wait();
      const a = db().admins.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      // Sandbox: every seeded admin shares the demo password. A real backend verifies a hash.
      if (!a || password !== DEMO.adminPassword) throw new ApiError('Invalid email or password');
      setSession({ role: 'admin', userId: a.id });
      return a;
    },

    async setCustomerBlocked(id: ID, blocked: boolean) {
      await wait();
      commit((d) => ({ ...d, customers: replace(d.customers, id, { blocked }) }));
    },

    async reviewVendor(id: ID, decision: 'approved' | 'rejected' | 'suspended', reason?: string) {
      await wait();
      commit((d) => ({
        ...d,
        vendors: replace(d.vendors, id, (v) => ({
          ...v,
          status: decision,
          rejectionReason: decision === 'rejected' ? reason : undefined,
          available: decision === 'approved' ? v.available : false,
          kyc: decision === 'approved' ? v.kyc.map((k) => (k.status === 'pending' ? { ...k, status: 'verified' } : k)) : v.kyc,
        })),
      }));
    },

    async verifyDocument(vendorId: ID, type: KycDocType, status: 'verified' | 'rejected', note?: string) {
      await wait();
      commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, (v) => ({ ...v, kyc: v.kyc.map((k) => (k.type === type ? { ...k, status, note } : k)) })) }));
    },

    async setVendorCategories(vendorId: ID, categoryIds: ID[]) {
      commit((d) => ({ ...d, vendors: replace(d.vendors, vendorId, { categoryIds }) }));
    },

    async saveCategory(input: Omit<ServiceCategory, 'id' | 'sortOrder'> & { id?: ID }): Promise<ServiceCategory> {
      await wait();
      if (!input.name.trim()) throw new ApiError('Category name is required');
      const existing = input.id ? db().categories.find((c) => c.id === input.id) : undefined;
      const c: ServiceCategory = existing
        ? { ...existing, ...input, id: existing.id }
        : { ...input, id: uid('cat'), sortOrder: db().categories.length };
      commit((d) => ({ ...d, categories: existing ? replace(d.categories, c.id, c) : [...d.categories, c] }));
      return c;
    },

    async saveProblemType(input: Omit<ProblemType, 'id'> & { id?: ID }): Promise<ProblemType> {
      await wait();
      if (!input.name.trim()) throw new ApiError('Problem type name is required');
      if (!(input.price >= 0)) throw new ApiError('Enter a valid price');
      const existing = input.id ? db().problemTypes.find((p) => p.id === input.id) : undefined;
      const p: ProblemType = existing ? { ...existing, ...input, id: existing.id } : { ...input, id: uid('prb') };
      commit((d) => ({ ...d, problemTypes: existing ? replace(d.problemTypes, p.id, p) : [...d.problemTypes, p] }));
      return p;
    },

    /** Sets the exact price of one problem in one city, or (with null) goes back to the city's price level. */
    async setCityPrice(problemTypeId: ID, cityName: string, price: number | null): Promise<ProblemType> {
      await wait();
      const existing = db().problemTypes.find((p) => p.id === problemTypeId);
      if (!existing) throw new ApiError('Problem type not found');
      const city = findCity(db().settings, cityName);
      if (!city) throw new ApiError('City not found');
      if (price != null && !(price >= 0 && price <= 1_000_000)) throw new ApiError('Enter a valid price');
      const cityPrices = { ...existing.cityPrices };
      if (price == null) delete cityPrices[city.name];
      else cityPrices[city.name] = Math.round(price * 100) / 100;
      const p: ProblemType = { ...existing, cityPrices };
      commit((d) => ({ ...d, problemTypes: replace(d.problemTypes, p.id, p) }));
      return p;
    },

    async deleteProblemType(id: ID) {
      if (db().bookings.some((b) => b.problemTypeId === id || b.items?.some((i) => i.problemTypeId === id))) throw new ApiError('This problem type has bookings — disable it instead');
      commit((d) => ({ ...d, problemTypes: d.problemTypes.filter((p) => p.id !== id) }));
    },

    /** Record the customer's answer to a quote, e.g. after confirming by phone. */
    async respondToQuote(bookingId: ID, approve: boolean, note: string) {
      await wait();
      return settleQuote(bookingId, approve, 'admin', note || 'Confirmed with the customer by support');
    },

    async assignVendor(bookingId: ID, vendorId: ID) {
      await wait();
      const b = getBooking(bookingId);
      const v = getVendor(vendorId);
      if (v.status !== 'approved') throw new ApiError('Only approved vendors can be assigned');
      if (b.status === 'completed' || b.status === 'cancelled') throw new ApiError('This booking is closed');
      const reassign = !!b.vendorId && b.vendorId !== vendorId;
      return updateBooking(
        bookingId,
        (x) => ({
          ...x,
          // A quote belongs to the professional who made it: a newly assigned professional inspects again.
          inspection: reassign && x.inspection?.status === 'quoted' ? { ...x.inspection, status: 'pending', quote: undefined } : x.inspection,
          vendorId,
          status: 'assigned',
          urgent: false,
          issue: undefined,
          timeline: [...x.timeline, event(reassign ? 'reassigned' : 'assigned', 'admin', `${reassign ? 'Reassigned' : 'Assigned'} to ${v.name}`)],
        }),
        (x) => notifyFor.vendorAssigned(db(), x, v),
      );
    },

    /** Closes an on-site report without moving the booking — e.g. the customer turned up, or a new price was agreed by phone. */
    async resolveIssue(bookingId: ID, note: string) {
      await wait();
      const b = getBooking(bookingId);
      if (!b.issue) throw new ApiError(RELEASE_ERRORS.noIssue);
      const text = note.trim();
      if (text.length < 5) throw new ApiError('Say what was decided');
      return updateBooking(bookingId, (x) => ({ ...x, issue: undefined, timeline: [...x.timeline, event('issue_resolved', 'admin', text)] }));
    },

    /**
     * A return visit after an on-site report: the same professional comes back at a new time. The
     * booking goes back to "accepted" for that slot and the report is closed.
     */
    async scheduleReturnVisit(bookingId: ID, date: string, slot: string) {
      await wait();
      const b = getBooking(bookingId);
      if (b.status === 'completed' || b.status === 'cancelled') throw new ApiError('This booking is closed');
      if (!b.vendorId) throw new ApiError(RELEASE_ERRORS.returnVisit);
      if (scheduledAt(date, slot).getTime() < Date.now()) throw new ApiError('Please choose a future time slot');
      return updateBooking(
        bookingId,
        (x) => ({
          ...x, date, slot, status: 'accepted', issue: undefined,
          timeline: [...x.timeline, ...(x.issue ? [event('issue_resolved', 'admin', 'Return visit arranged')] : []), event('rescheduled', 'admin', `Return visit on ${date} ${slot}`)],
        }),
        (x) => notifyFor.rescheduled(db(), x),
      );
    },

    async setBookingStatus(bookingId: ID, status: BookingStatus, note?: string) {
      await wait();
      const b = getBooking(bookingId);
      if (status !== 'pending_assignment' && status !== 'cancelled' && !b.vendorId) throw new ApiError('Assign a vendor first');
      if (status === 'completed' && isQuoteOpen(b)) {
        throw new ApiError(isExtraWork(b)
          ? 'The extra-work quote has no answer yet — record the customer’s answer first'
          : 'This “Not sure” booking has no settled quote — record the customer’s answer, or have the professional mark no repair needed, first');
      }
      return updateBooking(
        bookingId,
        // Support override: no start code or photo needed, but arriving still creates the customer's code.
        (x) => withStartCode({
          ...x,
          // Unassigning drops a quote made by the previous professional.
          inspection: status === 'pending_assignment' && x.inspection?.status === 'quoted' ? { ...x.inspection, status: 'pending', quote: undefined } : x.inspection,
          // Any decision by support closes an open on-site report; a closed booking is no longer urgent.
          issue: undefined, urgent: status === 'cancelled' || status === 'completed' ? false : x.urgent,
          status, vendorId: status === 'pending_assignment' ? undefined : x.vendorId, cancelReason: status === 'cancelled' ? note ?? 'Cancelled by support' : x.cancelReason, timeline: [...x.timeline, event(status, 'admin', note)] }),
        (x) => (status === 'cancelled' ? notifyFor.cancelled(db(), x, 'admin') : status === 'completed' ? notifyFor.serviceCompleted(db(), x) : []),
      );
    },

    async createPayout(vendorId: ID) {
      return vendor.requestPayout(vendorId);
    },

    async updatePayout(id: ID, status: Payout['status']) {
      await wait();
      const p = db().payouts.find((x) => x.id === id);
      if (!p) throw new ApiError('Payout not found');
      const utr = status === 'settled' ? `UTR${Date.now().toString().slice(-10)}` : p.utr;
      commit(
        (d) => ({ ...d, payouts: replace(d.payouts, id, { status, utr, settledAt: status === 'settled' ? new Date().toISOString() : p.settledAt }) }),
        status === 'settled' ? notifyFor.payoutSettled(p.vendorId, p.amount, utr!) : [],
      );
    },

    async setReviewStatus(id: ID, status: Review['status']) {
      await wait();
      commit((d) => {
        const reviews = replace(d.reviews, id, { status });
        const r = reviews.find((x) => x.id === id)!;
        const published = reviews.filter((x) => x.vendorId === r.vendorId && x.status === 'published');
        const avg = published.length ? Math.round((published.reduce((s, x) => s + x.rating, 0) / published.length) * 10) / 10 : 0;
        return { ...d, reviews, vendors: replace(d.vendors, r.vendorId, { rating: avg, ratingCount: published.length }) };
      });
    },

    async updateComplaint(id: ID, status: Complaint['status'], resolution?: string) {
      await wait();
      commit((d) => ({ ...d, complaints: replace(d.complaints, id, { status, resolution }) }));
    },

    async updateSettings(patch: Partial<Omit<PlatformSettings, 'cities'>>) {
      await wait();
      commit((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },

    /** Adds a city, or updates one (`editing` = its name). New cities go to the end of the list. */
    async saveCity(input: CityInput, editing?: string): Promise<City> {
      await wait();
      const cities = db().settings.cities;
      if (editing && !cities.some((c) => c.name === editing)) throw new ApiError('City not found');
      const result = normalizeCity(input, cities, editing);
      if ('error' in result) throw new ApiError(result.error);
      const { city } = result;
      commit((d) => ({
        ...d,
        settings: { ...d.settings, cities: editing ? d.settings.cities.map((c) => (c.name === editing ? city : c)) : [...d.settings.cities, city] },
      }));
      return city;
    },

    /** Removes a city nobody uses yet; otherwise pause it instead. */
    async deleteCity(name: string) {
      await wait();
      const d = db();
      const used = d.customers.some((c) => c.city === name || c.addresses.some((a) => a.city === name))
        || d.vendors.some((v) => v.city === name) || d.bookings.some((b) => b.address.city === name);
      if (used) throw new ApiError(`${name} has customers, vendors or bookings — pause it instead`);
      commit((x) => ({
        ...x,
        settings: { ...x.settings, cities: x.settings.cities.filter((c) => c.name !== name) },
        // Its exact prices go with it.
        problemTypes: x.problemTypes.map((p) => {
          if (p.cityPrices?.[name] == null) return p;
          const cityPrices = { ...p.cityPrices };
          delete cityPrices[name];
          return { ...p, cityPrices };
        }),
      }));
    },

    /** Send "your job is today" reminders to vendors (normally a scheduled job). */
    async sendTodayReminders() {
      const today = toISODate(new Date());
      const due = db().bookings.filter((b) => b.date === today && (b.status === 'assigned' || b.status === 'accepted'));
      commit((d) => d, due.flatMap((b) => notifyFor.jobReminder(db(), b)));
      return due.length;
    },

    markNotificationsRead: markRead,
  };

  return {
    /** "mock" keeps everything on this device; "http" talks to the real backend (shared data). */
    kind: 'mock' as BackendKind,
    /** Load persisted state (or seed) — call once at app start. */
    async init() {
      if (ready) return;
      try {
        const [rawDb, rawSession] = await Promise.all([storage.getItem(DB_KEY), storage.getItem(SESSION_KEY)]);
        const parsed = rawDb ? (JSON.parse(rawDb) as Database) : null;
        snapshot = {
          db: parsed && parsed.version === DB_VERSION ? parsed : createSeedDatabase(),
          session: rawSession ? (JSON.parse(rawSession) as Session) : null,
        };
      } catch {
        snapshot = { db: createSeedDatabase(), session: null };
      }
      ready = true;
      emit();
      void persist();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    logout() {
      setSession(null);
    },
    /** Wipe local data and start again from the seed (demo helper). */
    async resetDemoData() {
      snapshot = { db: createSeedDatabase(), session: snapshot.session };
      emit();
      await persist();
    },
    wallet: (vendorId: ID) => computeVendorWallet(vendorId, db().bookings, db().payouts),
    customer,
    vendor,
    admin,
  };
}

export type Backend = ReturnType<typeof createMockBackend>;
export type { PaymentMethod };
