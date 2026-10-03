/**
 * HTTP backend — the same surface as `createMockBackend` (same methods, return types and
 * ApiError messages), backed by the Spring Boot API in /backend. Screens keep reading the
 * `Database` snapshot through useDb(); here that snapshot is the server's role-scoped view
 * (GET /api/v1/sync), refreshed after every action and whenever a live event arrives over
 * STOMP/WebSocket. All three apps therefore share the same data.
 */
import { createSeedDatabase } from './seed';
import { computeVendorWallet } from './pricing';
import {
  ApiError,
  type Backend,
  type BackendKind,
  type CheckoutInput,
  type KeyValueStorage,
  type Session,
  type Snapshot,
} from './mock';
import type { PaymentRequest } from './providers';
import type {
  Address, AdminUser, BookingStatus, Booking, Complaint, Customer, Database, ID, KycDocType, Payout, ProblemType, QuoteLine, Review,
  ServiceCategory, Vendor, WorkingHours,
} from './types';

export interface HttpBackendOptions {
  /** e.g. "http://localhost:8080" */
  baseUrl: string;
  storage: KeyValueStorage;
  /** Storage key prefix, one per app, e.g. "@profecian/customer" */
  namespace: string;
}

interface StoredSession extends Session {
  accessToken: string;
  refreshToken: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const EMPTY_DB = (): Database => {
  const seed = createSeedDatabase();
  return { ...seed, customers: [], vendors: [], admins: [], bookings: [], reviews: [], complaints: [], payouts: [], notifications: [] };
};

export function createHttpBackend(options: HttpBackendOptions): Backend {
  const base = options.baseUrl.replace(/\/+$/, '');
  const { storage, namespace } = options;
  const SESSION_KEY = `${namespace}/http-session/v1`;
  const CACHE_KEY = `${namespace}/http-db/v1`;

  let auth: StoredSession | null = null;
  let snapshot: Snapshot = { db: EMPTY_DB(), session: null };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  /** A verified phone number waiting for its profile (customer) or registration (vendor). */
  let pendingSignup: { role: 'customer' | 'vendor'; phone: string; signupToken: string } | null = null;

  /* ───────── Session + snapshot ───────── */

  const sessionOf = (a: StoredSession | null): Session | null => (a ? { role: a.role, userId: a.userId } : null);

  /**
   * The session screens see: only when this snapshot actually contains that user. Layouts look the
   * user up in the snapshot and login pages look at the session — if those ever disagreed, their
   * redirects would bounce forever. This keeps them consistent by construction.
   */
  const visibleSession = (a: StoredSession | null, db: Database): Session | null => {
    const sess = sessionOf(a);
    if (!sess) return null;
    const list: { id: string }[] = sess.role === 'customer' ? db.customers : sess.role === 'vendor' ? db.vendors : db.admins;
    return list.some((u) => u.id === sess.userId) ? sess : null;
  };

  /**
   * Stores the tokens. A new session is NOT published here: screens would see "logged in" before
   * the snapshot contains that user (layouts redirect on that, and could bounce forever). It is
   * published by {@link refresh} together with the user's data. Logging out publishes at once.
   */
  async function saveAuth(next: StoredSession | null) {
    auth = next;
    const session = visibleSession(next, snapshot.db);
    if (session?.userId !== snapshot.session?.userId || session?.role !== snapshot.session?.role) {
      snapshot = { ...snapshot, session };
      emit();
    }
    try {
      if (next) await storage.setItem(SESSION_KEY, JSON.stringify(next));
      else await storage.removeItem(SESSION_KEY);
    } catch {
      // Storage unavailable: the session lives in memory only.
    }
  }

  async function startSession(session: Session, tokens: Tokens) {
    await saveAuth({ ...session, ...tokens });
    live.restart();
    await refresh();
  }

  let refreshing: Promise<void> | null = null;
  let refreshAgain = false;

  /** Re-fetches the snapshot. Calls during a fetch coalesce into one more fetch afterwards. */
  function refresh(): Promise<void> {
    if (refreshing) {
      refreshAgain = true;
      return refreshing;
    }
    refreshing = (async () => {
      try {
        do {
          refreshAgain = false;
          const db = await request<Database>('GET', '/api/v1/sync', undefined, { allowAnonymous: true });
          // Session and data change together, like the mock.
          snapshot = { db, session: visibleSession(auth, db) };
          emit();
          void storage.setItem(CACHE_KEY, JSON.stringify(db)).catch(() => undefined);
        } while (refreshAgain);
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  /* ───────── Requests ───────── */

  let tokenRefresh: Promise<boolean> | null = null;

  async function renewTokens(): Promise<boolean> {
    if (!auth) return false;
    tokenRefresh ??= (async () => {
      try {
        const res = await fetch(`${base}/api/v1/auth/refresh`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: auth!.refreshToken }),
        });
        if (!res.ok) throw new Error('refresh failed');
        const t = (await res.json()) as Tokens;
        await saveAuth({ ...auth!, ...t });
        live.restart();
        return true;
      } catch {
        await saveAuth(null);
        live.restart();
        return false;
      } finally {
        tokenRefresh = null;
      }
    })();
    return tokenRefresh;
  }

  async function request<T>(method: string, path: string, body?: unknown, opts: { allowAnonymous?: boolean; idempotencyKey?: string; retried?: boolean } = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (auth) headers.Authorization = `Bearer ${auth.accessToken}`;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Network error — check your connection and try again');
    }
    if (res.status === 401 && auth && !opts.retried && !path.startsWith('/api/v1/auth/')) {
      if (await renewTokens()) return request<T>(method, path, body, { ...opts, retried: true });
      if (opts.allowAnonymous) return request<T>(method, path, body, { ...opts, retried: true });
      throw new ApiError('Your session has expired. Please log in again.');
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? safeJson(text) : undefined;
    if (!res.ok) {
      const message = data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : 'Something went wrong';
      throw new ApiError(message);
    }
    return data as T;
  }

  /** Runs an action, then re-syncs so screens see the change before the promise resolves (like the mock). */
  async function act<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    await refresh();
    return result;
  }

  /* ───────── Files ───────── */

  /** Uploads a local photo (file://, blob:, data:) and returns its storage key; server URLs pass through. */
  async function upload(uri: string | undefined): Promise<string | undefined> {
    if (!uri) return uri;
    if (/^https?:\/\//.test(uri)) return uri;
    const form = new FormData();
    const name = uri.split('/').pop()?.split('?')[0] || 'photo.jpg';
    if (typeof document === 'undefined') {
      // React Native: FormData takes { uri, name, type }.
      form.append('file', { uri, name, type: guessType(name) } as unknown as Blob);
    } else {
      const blob = await (await fetch(uri)).blob();
      form.append('file', blob, name.includes('.') ? name : `${name}.${(blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`);
    }
    const res = await request<{ key: string; url: string }>('POST', '/api/v1/files', form);
    return res.key;
  }

  const uploadAll = async (uris: string[] | undefined) => (uris ? Promise.all(uris.map((u) => upload(u) as Promise<string>)) : []);

  /* ───────── Live updates (STOMP over WebSocket) ───────── */

  const live = createLive(() => (base.replace(/^http/, 'ws') + '/ws'), () => auth, () => void refresh().catch(() => undefined));

  /* ───────── Auth helpers ───────── */

  interface VerifyResult {
    phone: string;
    customer?: Customer;
    vendor?: Vendor;
    session?: Session;
    tokens?: Tokens;
    signupToken?: string;
  }

  async function requestOtp(phone: string) {
    return request<{ requestId: string; resendInSec: number }>('POST', '/api/v1/auth/otp', { phone });
  }

  /* ───────── Customer ───────── */

  const customer: Backend['customer'] = {
    requestOtp,

    async verifyOtp(requestId: string, code: string) {
      const r = await request<VerifyResult>('POST', '/api/v1/auth/customer/verify', { requestId, code });
      if (r.session && r.tokens) {
        await startSession(r.session, r.tokens);
        return { phone: r.phone, customer: r.customer ?? null };
      }
      pendingSignup = { role: 'customer', phone: r.phone, signupToken: r.signupToken! };
      return { phone: r.phone, customer: null };
    },

    async createProfile(input: { phone: string; name: string; email?: string; city: string }) {
      if (!pendingSignup || pendingSignup.role !== 'customer') throw new ApiError('OTP expired, please request a new one');
      const r = await request<VerifyResult>('POST', '/api/v1/auth/customer/profile', { signupToken: pendingSignup.signupToken, name: input.name, email: input.email, city: input.city });
      pendingSignup = null;
      await startSession(r.session!, r.tokens!);
      return r.customer!;
    },

    async updateProfile(_id: ID, patch: Partial<Pick<Customer, 'name' | 'email' | 'city'>>) {
      await act(() => request('PATCH', '/api/v1/customer/profile', patch));
    },

    async saveAddress(_customerId: ID, address: Omit<Address, 'id'> & { id?: ID }) {
      return act(() => request<Address>('POST', '/api/v1/customer/addresses', address));
    },

    async deleteAddress(_customerId: ID, addressId: ID) {
      await act(() => request('DELETE', `/api/v1/customer/addresses/${encodeURIComponent(addressId)}`));
    },

    async createBooking(input) {
      const inspection = input.inspection ? { description: input.inspection.description, photos: await uploadAll(input.inspection.photos) } : undefined;
      return act(() => request<Booking>('POST', '/api/v1/customer/bookings', { ...input, inspection }));
    },

    async checkout(input: CheckoutInput) {
      const groups = await Promise.all(input.groups.map(async (g) => ({
        ...g,
        inspection: g.inspection ? { description: g.inspection.description, photos: await uploadAll(g.inspection.photos) } : undefined,
      })));
      return act(() => request<Booking[]>('POST', '/api/v1/customer/checkout', { ...input, groups }));
    },

    async answerClarification(_customerId: ID, bookingId: ID, answer: string) {
      return act(() => request<Booking>('POST', `/api/v1/customer/bookings/${bookingId}/clarification`, { answer }));
    },

    async respondToQuote(_customerId: ID, bookingId: ID, approve: boolean) {
      return act(() => request<Booking>('POST', `/api/v1/customer/bookings/${bookingId}/quote`, { approve }));
    },

    async cancelBooking(id: ID, reason: string) {
      return act(() => request<Booking>('POST', `/api/v1/customer/bookings/${id}/cancel`, { reason }));
    },

    async rescheduleBooking(id: ID, date: string, slot: string) {
      return act(() => request<Booking>('POST', `/api/v1/customer/bookings/${id}/reschedule`, { date, slot }));
    },

    async chooseCash(id: ID) {
      return act(() => request<Booking>('POST', `/api/v1/customer/bookings/${id}/cash`));
    },

    async payOnline(id: ID, method: PaymentRequest['method'], opts: { simulateFailure?: boolean } = {}) {
      const key = `pay_${id}_${Date.now().toString(36)}`;
      try {
        return await request<Booking>('POST', `/api/v1/customer/bookings/${id}/pay`, { method, simulateFailure: !!opts.simulateFailure }, { idempotencyKey: key });
      } finally {
        // Failed payments are recorded on the booking too, so re-sync either way.
        await refresh().catch(() => undefined);
      }
    },

    async submitReview(input: { bookingId: ID; rating: number; text: string; images: string[] }) {
      const images = await uploadAll(input.images);
      return act(() => request<Review>('POST', '/api/v1/customer/reviews', { ...input, images }));
    },

    async raiseComplaint(input: { bookingId: ID; subject: string; message: string }) {
      return act(() => request<Complaint>('POST', '/api/v1/customer/complaints', input));
    },

    markNotificationsRead: (_recipientId: ID, ids?: ID[]) => markRead(ids),
  };

  /* ───────── Vendor ───────── */

  const vendor: Backend['vendor'] = {
    requestOtp,

    async verifyOtp(requestId: string, code: string) {
      const r = await request<VerifyResult>('POST', '/api/v1/auth/vendor/verify', { requestId, code });
      if (r.session && r.tokens) {
        await startSession(r.session, r.tokens);
        return { phone: r.phone, vendor: r.vendor ?? null };
      }
      pendingSignup = { role: 'vendor', phone: r.phone, signupToken: r.signupToken! };
      return { phone: r.phone, vendor: null };
    },

    async register(input: { phone: string; name: string; email?: string; city: string; categoryIds: ID[]; serviceAreas: string[] }) {
      if (!pendingSignup || pendingSignup.role !== 'vendor') throw new ApiError('OTP expired, please request a new one');
      const r = await request<VerifyResult>('POST', '/api/v1/auth/vendor/register', { ...input, signupToken: pendingSignup.signupToken });
      pendingSignup = null;
      await startSession(r.session!, r.tokens!);
      return r.vendor!;
    },

    async uploadDocument(_vendorId: ID, type: KycDocType, doc: { number?: string; imageUri?: string }) {
      const imageUri = await upload(doc.imageUri);
      await act(() => request('POST', `/api/v1/vendor/documents/${type}`, { number: doc.number, imageUri }));
    },

    async saveBank(_vendorId: ID, input: { holderName: string; accountNumber: string; ifsc: string; bankName: string }) {
      await act(() => request('PUT', '/api/v1/vendor/bank', input));
    },

    async submitForReview(_vendorId: ID) {
      await act(() => request('POST', '/api/v1/vendor/submit'));
    },

    async updateProfile(_vendorId: ID, patch: Partial<Pick<Vendor, 'available' | 'serviceAreas' | 'categoryIds' | 'email' | 'photo'>> & { workingHours?: WorkingHours }) {
      const photo = patch.photo ? await upload(patch.photo) : undefined;
      await act(() => request('PATCH', '/api/v1/vendor/profile', { ...patch, photo }));
    },

    async advanceJob(_vendorId: ID, bookingId: ID) {
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/advance`));
    },

    async askClarification(_vendorId: ID, bookingId: ID, question: string) {
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/clarification`, { text: question }));
    },

    async shareQuote(_vendorId: ID, bookingId: ID, lines: QuoteLine[], note?: string) {
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/quote`, { lines, note }));
    },

    async markNoWorkNeeded(_vendorId: ID, bookingId: ID, note: string) {
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/no-work`, { text: note }));
    },

    async declineJob(_vendorId: ID, bookingId: ID, reason: string) {
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/decline`, { reason }));
    },

    async addProofPhoto(_vendorId: ID, bookingId: ID, uri: string) {
      const key = await upload(uri);
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/proof`, { uri: key }));
    },

    async collectCash(_vendorId: ID, bookingId: ID) {
      return act(() => request<Booking>('POST', `/api/v1/vendor/jobs/${bookingId}/collect-cash`));
    },

    async requestPayout(_vendorId: ID) {
      return act(() => request<Payout>('POST', '/api/v1/vendor/payouts'));
    },

    markNotificationsRead: (_recipientId: ID, ids?: ID[]) => markRead(ids),
  };

  /* ───────── Admin ───────── */

  const admin: Backend['admin'] = {
    async login(email: string, password: string) {
      const r = await request<{ admin: AdminUser; session: Session; tokens: Tokens }>('POST', '/api/v1/auth/admin/login', { email, password });
      await startSession(r.session, r.tokens);
      return r.admin;
    },

    async setCustomerBlocked(id: ID, blocked: boolean) {
      await act(() => request('POST', `/api/v1/admin/customers/${id}/blocked`, { blocked }));
    },

    async reviewVendor(id: ID, decision: 'approved' | 'rejected' | 'suspended', reason?: string) {
      await act(() => request('POST', `/api/v1/admin/vendors/${id}/review`, { decision, reason }));
    },

    async verifyDocument(vendorId: ID, type: KycDocType, status: 'verified' | 'rejected', note?: string) {
      await act(() => request('POST', `/api/v1/admin/vendors/${vendorId}/documents/${type}`, { status, note }));
    },

    async setVendorCategories(vendorId: ID, categoryIds: ID[]) {
      await act(() => request('PUT', `/api/v1/admin/vendors/${vendorId}/categories`, { categoryIds }));
    },

    async saveCategory(input: Omit<ServiceCategory, 'id' | 'sortOrder'> & { id?: ID }) {
      return act(() => request<ServiceCategory>('PUT', '/api/v1/admin/categories', input));
    },

    async saveProblemType(input: Omit<ProblemType, 'id'> & { id?: ID }) {
      return act(() => request<ProblemType>('PUT', '/api/v1/admin/problem-types', input));
    },

    async deleteProblemType(id: ID) {
      await act(() => request('DELETE', `/api/v1/admin/problem-types/${id}`));
    },

    async askCustomer(bookingId: ID, question: string) {
      return act(() => request<Booking>('POST', `/api/v1/admin/bookings/${bookingId}/ask`, { question }));
    },

    async respondToQuote(bookingId: ID, approve: boolean, note: string) {
      return act(() => request<Booking>('POST', `/api/v1/admin/bookings/${bookingId}/quote`, { approve, note }));
    },

    async assignVendor(bookingId: ID, vendorId: ID) {
      return act(() => request<Booking>('POST', `/api/v1/admin/bookings/${bookingId}/assign`, { vendorId }));
    },

    async setBookingStatus(bookingId: ID, status: BookingStatus, note?: string) {
      return act(() => request<Booking>('POST', `/api/v1/admin/bookings/${bookingId}/status`, { status, note }));
    },

    async createPayout(vendorId: ID) {
      return act(() => request<Payout>('POST', '/api/v1/admin/payouts', { vendorId }));
    },

    async updatePayout(id: ID, status: Payout['status']) {
      await act(() => request('PATCH', `/api/v1/admin/payouts/${id}`, { status }));
    },

    async setReviewStatus(id: ID, status: Review['status']) {
      await act(() => request('PATCH', `/api/v1/admin/reviews/${id}`, { status }));
    },

    async updateComplaint(id: ID, status: Complaint['status'], resolution?: string) {
      await act(() => request('PATCH', `/api/v1/admin/complaints/${id}`, { status, resolution }));
    },

    async updateSettings(patch: Partial<Database['settings']>) {
      await act(() => request('PATCH', '/api/v1/admin/settings', patch));
    },

    async sendTodayReminders() {
      return act(async () => (await request<{ count: number }>('POST', '/api/v1/admin/reminders/today')).count);
    },

    markNotificationsRead: (_recipientId: ID, ids?: ID[]) => markRead(ids),
  };

  function markRead(ids?: ID[]) {
    // Optimistic: flip locally right away, then persist.
    snapshot = { ...snapshot, db: { ...snapshot.db, notifications: snapshot.db.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) } };
    emit();
    void request('POST', '/api/v1/notifications/read', ids ? { ids } : {}).then(refresh).catch(() => undefined);
  }

  return {
    kind: 'http' as BackendKind,

    async init() {
      try {
        const [rawAuth, rawDb] = await Promise.all([storage.getItem(SESSION_KEY), storage.getItem(CACHE_KEY)]);
        auth = rawAuth ? (JSON.parse(rawAuth) as StoredSession) : null;
        const db = rawDb ? (JSON.parse(rawDb) as Database) : snapshot.db;
        snapshot = { db, session: visibleSession(auth, db) };
      } catch {
        auth = null;
      }
      emit();
      live.restart();
      // With a cached snapshot the app can render offline; otherwise wait for the server.
      const sync = refresh().catch(() => undefined);
      if (!snapshot.db.categories.length || (auth && !snapshot.session)) await sync;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot: () => snapshot,

    logout() {
      const token = auth?.refreshToken;
      if (token) void fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: token }) }).catch(() => undefined);
      void saveAuth(null).then(() => {
        live.restart();
        snapshot = { db: { ...snapshot.db, customers: [], vendors: [], admins: [], bookings: [], complaints: [], payouts: [], notifications: [] }, session: null };
        emit();
        return refresh();
      }).catch(() => undefined);
    },

    async resetDemoData() {
      throw new ApiError('Demo reset is only available in offline demo mode');
    },

    wallet: (vendorId: ID) => computeVendorWallet(vendorId, snapshot.db.bookings, snapshot.db.payouts),
    customer,
    vendor,
    admin,
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function guessType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
}

/**
 * Minimal STOMP 1.2 client over a plain WebSocket (no extra dependency). Subscribes to the
 * caller's own events, public catalogue/settings changes and, for admins, the admin topic.
 * Every message just triggers a re-sync; reconnects with backoff.
 */
function createLive(url: () => string, auth: () => StoredSession | null, onEvent: () => void) {
  let ws: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let generation = 0;
  const NUL = '\u0000';

  const frame = (command: string, headers: Record<string, string>) =>
    `${command}\n${Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n')}\n\n${NUL}`;

  function stop() {
    generation += 1;
    if (retry) clearTimeout(retry);
    if (heartbeat) clearInterval(heartbeat);
    retry = null;
    heartbeat = null;
    if (ws) {
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        // already closed
      }
    }
    ws = null;
  }

  function start() {
    if (typeof WebSocket === 'undefined') return;
    const gen = generation;
    const session = auth();
    let socket: WebSocket;
    try {
      socket = new WebSocket(url());
    } catch {
      schedule(gen);
      return;
    }
    ws = socket;
    socket.onopen = () => {
      const headers: Record<string, string> = { 'accept-version': '1.2', 'heart-beat': '20000,20000' };
      if (session) headers.Authorization = `Bearer ${session.accessToken}`;
      socket.send(frame('CONNECT', headers));
    };
    socket.onmessage = (e) => {
      const data = String(e.data);
      for (const raw of data.split(NUL)) {
        const msg = raw.replace(/^\n+/, '');
        if (!msg) continue;
        const command = msg.slice(0, msg.indexOf('\n') === -1 ? msg.length : msg.indexOf('\n'));
        if (command === 'CONNECTED') {
          attempts = 0;
          const subs = ['/topic/public'];
          if (session) subs.push('/user/queue/events');
          if (session?.role === 'admin') subs.push('/topic/admin');
          subs.forEach((destination, i) => socket.send(frame('SUBSCRIBE', { id: `sub-${i}`, destination })));
          heartbeat = setInterval(() => {
            try {
              socket.send('\n');
            } catch {
              // closed; onclose reconnects
            }
          }, 20000);
          onEvent();
        } else if (command === 'MESSAGE') {
          onEvent();
        }
      }
    };
    socket.onclose = () => {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      schedule(gen);
    };
    socket.onerror = () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
    };
  }

  function schedule(gen: number) {
    if (gen !== generation) return;
    attempts += 1;
    retry = setTimeout(() => {
      if (gen === generation) start();
    }, Math.min(30000, 1000 * 2 ** Math.min(attempts, 5)));
  }

  return {
    restart() {
      stop();
      start();
    },
  };
}
