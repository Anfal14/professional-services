# 2026-10-02 — Real backend (Spring Boot) + HTTP client

## Request
Build the real backend in `backend/` (Java 21, Spring Boot 3, modular monolith, Postgres 16 + PostGIS, Flyway, JPA, Redis, outbox + scheduled worker, STOMP live updates, provider interfaces, docker-compose, Testcontainers, springdoc) mirroring the mock exactly, and connect the three apps through `createHttpBackend` with the mock's surface; keep the mock when `EXPO_PUBLIC_API_URL` is unset.

## Implementation
See `features/backend.md`. Frontend: `packages/shared/src/http.ts` (new); the mock gained `kind`, `checkout` (all-or-nothing) and an async `addProofPhoto`; each app's `src/backend.ts` chooses mock or HTTP; the cart uses `checkout`; simulate / reset-demo buttons render only for the mock. Root scripts: `backend`, `backend:up`, `backend:down`, `backend:test`, `backend:seed`; `tsx` dev dependency; `.env.example` per app; README rewritten.

## Verification
Backend compiles; 15 unit tests pass; 11 Testcontainers integration tests compile and are skipped (Docker not installed on this machine yet). Apps: typecheck + lint clean. **Not yet run end-to-end against a live backend** — needs Docker Desktop.

## Remaining
Install Docker → `npm run backend:up`, `npm run backend`, run the integration tests, then run the apps with `EXPO_PUBLIC_API_URL` and fix what turns up. Razorpay adapter, real providers, push-token endpoint. Not committed.

## Test run (Docker installed)
- Seed bug found by the DB: vendor #2's generated phone equalled the demo vendor's (9876500101). Fixed in seed.ts (other vendors now 98765001xx from 111), DB_VERSION → 7, SnapshotService.VERSION → 7, seed SQL regenerated.
- Webhook / idempotency dedupe didn't work: `saveAndFlush` on a composite-key entity merges instead of inserting. Replaced with atomic `INSERT … ON CONFLICT DO NOTHING` claims.
- Result: 15 unit + 11 integration tests pass (`npm run backend:test`).

## End-to-end run (all three apps on the live backend)
Flow verified with `EXPO_PUBLIC_API_URL=http://localhost:8080` (in each app's gitignored `.env.local`): customer OTP login → cart checkout (PFWS8I7M) → admin login → assign best match → vendor OTP login → accept → travel → arrived → start → proof photo (upload → signed URL serves 200 image/png) → complete → customer pays online (sandbox UPI) → review. Each step showed up live in the other tabs over STOMP; ledger rows 294 / 45 / 204; 13 outbox messages sent, none failed; no server errors.
Fixes:
- Admin tab froze after login ("Maximum update depth exceeded"): the session was published before the snapshot contained that admin, so login (checks session) and panel layout (checks db.admins) redirected each other forever. `http.ts` now only exposes a session whose user exists in the current snapshot (`visibleSession`), and waits for the first sync on start when a stored session has no matching cache; admin `login.tsx` redirects on `useAdmin()` like the layout.
- Customer booking page showed the "Demo only — …" note on the HTTP backend; the note and simulate button now render only for the mock.
Note: on web, `confirmAction` uses `window.confirm`; browser automation must stub it.
