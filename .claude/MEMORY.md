# Project Memory — Profecian

## Purpose
Home-services platform (Urban Company style), rebranded from "QuickJob" by the user. Three Expo frontends (customer, vendor "Partner", admin web) plus a Spring Boot backend in `backend/` (2026-10-02). Apps use the offline mock unless `EXPO_PUBLIC_API_URL` points at the backend.

## Stack
npm-workspaces monorepo. Expo SDK 57, RN 0.86, React 19.2, Expo Router (`src/app` in each app), TS strict, react-native-web, react-native-svg (charts + roadmap). Do not upgrade Expo/RN; `npx expo install` inside the app folder.

## Layout
`apps/customer` (8081) · `apps/vendor` (8082) · `apps/admin` (8083, web-first) · `packages/shared` (types, seed, pricing, statuses, notify, analytics, mock backend, hooks) · `packages/ui` (theme, primitives, widgets, OtpLogin, Charts). Details: `ARCHITECTURE.md`.

## Backend (mock)
`createMockBackend` in `packages/shared/src/mock.ts`: in-memory `Database`, persisted per app at `@profecian/<app>/db/v${DB_VERSION}` (DB_VERSION 6 — bump when seed/shape changes). Apps **do not share state**; each starts from the same deterministic seed. Screens only call `backend.customer|vendor|admin.*` / hooks (`useDb`, `useSession`, `useAction`).

## Demo
Customer 9876500001 · Vendor 9876500101 (approved) / 9876500109 (pending) · OTP 123456 · Admin admin@profecian.app / Admin@123 (+ ops@/finance@/support@ roles).

## Constraints
- Web + Android + iOS for customer/vendor; guard platform-only APIs.
- React Compiler lint: no ref reads in render, no sync setState in effects.
- Status colors reserved; charts follow dataviz rules (light + dark palettes validated in `packages/ui/src/theme.ts`).
- **Theming:** never `StyleSheet.create` or copy a colour into a module-level constant — use `createStyles(() => ({...}))` and read `colors`/`shadows`/`type` at render. Tokens are live objects rewritten by `applyTheme`; `ThemeProvider` remounts the tree on change. Use `colors.night` for always-dark surfaces, `colors.inverse` for text on `ink`, `tintTile()` for category tint tiles.
- Customer app keeps the user's own edits: Google demo login, hero (mobile subtitle + TrustBadges, minHeight 300), storage keys `@profecian/...`.

## Known issues / placeholders
Business details in `apps/customer/src/config.ts`, GSTIN on invoice, Unsplash images, seed data — all placeholders. Payments/OTP/WhatsApp are sandbox (`packages/shared/src/providers.ts`). No push notifications (in-app list mirrors WhatsApp/push).

## Repo / infra
Git root `Documents/professional-services`, remote `https://github.com/Anfal14/professional-services.git`, `main` pushed to `63ce6ae`. The monorepo restructure + platform (2026-09-28) is **uncommitted** — commit/push when asked. Old `professional-services/QuickJob/` folder is a stale copy (gitignored, was locked by a shell); `Documents/QuickJob` is also obsolete (holds only the session `.claude/launch.json`).

## Backend
Java 21 / Spring Boot 3.5.16 in `backend/` — see `features/backend.md`. Run: `npm run backend:up` (docker compose: Postgres+PostGIS :5433, Redis :6379), then `npm run backend` (:8080, Swagger /swagger-ui.html). Tests: `npm run backend:test`. After editing seed.ts run `npm run backend:seed` — it rewrites V1000 (relative timestamps), which breaks Flyway's checksum on existing dev DBs: restore V1000 from git unless you also wipe the DB (`docker compose -f backend/docker-compose.yml down -v`). New schema migrations go in db/migration as V3, V4…; the dev profile runs Flyway out-of-order so they still apply above the V1000/V1001 dev data. Docker Desktop installed 2026-10-02; `npm run backend:test` = 34 unit + 32 Testcontainers ITs, all passing (2026-10-10). One command: `npm run dev` (scripts/dev.mjs: docker compose up --wait → backend, waits for /actuator/health → three apps with EXPO_PUBLIC_API_URL set); `npm run dev:mock` = apps on the mock. Full e2e (customer → admin → vendor → payment → review) verified 2026-10-02 against the live backend with live STOMP updates. Point an app at it with `EXPO_PUBLIC_API_URL=http://localhost:8080` in `apps/<app>/.env.local` (gitignored). The HTTP client only exposes a session whose user is in the snapshot (`visibleSession`) — keep it that way or login/layout redirects loop.

## Verification
Root: `npm run typecheck`, `npm run lint`. Per app: `npx expo-doctor`, `npx expo export --platform web` (+ android/ios for customer/vendor). All clean on 2026-09-28.

## Current focus
2026-10-10: vendors can quote extra work on normal jobs — `Booking.inspection.kind` is `not_sure` or `extra_work`; use `isNotSure(b)` not `!!b.inspection` (`features/job-release.md`, last section). 2026-10-10: vendors release (never cancel) an accepted job; late releases are urgent and lower a completion rate counted from history (`features/job-release.md`; rules in `release.ts` ↔ `ReleaseRules.java`; a booking goes to non-admins only through `ApiMapper.booking` / `bookingForVendor`, never `bookingForAdmin`). 2026-10-10: vendor job safeguards — customer start code, required "after" photo, slide-to-confirm with 10 s undo, one job in progress (`features/vendor-job-safeguards.md`; rules in `job.ts` ↔ `VendorJobRules.java`; never return a booking to a vendor except through `ApiMapper.bookingForVendor`, which strips the start code). 2026-10-10: city-based pricing (price level %, exact per-city prices, city commission — `features/multi-city.md` → "City pricing"; any pricing rule must change in both `cities.ts` and `CityPricing.java` with the shared test cases; `npm test` runs the shared/mock tests). 2026-10-10: admin global search (Ctrl/Cmd+K) + shared city filter in each data section (`features/platform-admin.md`). 2026-10-08: multi-city (`features/multi-city.md`, `changes/2026-10-08-multi-city.md`) + `npm run dev` launcher — uncommitted on branch `feat/spring-boot-backend` (backend commit 4cb55d6 pushed; PR to main not yet opened — gh CLI not installed). Cities are data: `settings.cities: City[]`, rules in `packages/shared/src/cities.ts` mirrored by `CityService.java`. Next candidates: production readiness (Dockerfile, prod bootstrap data + first admin, SMS OTP, Razorpay, push), city-scoped admin roles.
2026-10-10: in-app questions and answers on bookings were removed for all roles (no `messages` / `awaitingCustomer`, no ask/answer endpoints; migration V7; DB version 13) — see `changes/2026-10-10-remove-questions-and-answers.md`. Do not reintroduce them.
2026-10-10: Share quote is one button for all services and appears only after the service is started (`in_progress`), never at the door (`features/job-release.md`, last section).
