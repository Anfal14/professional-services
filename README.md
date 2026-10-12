# Profecian — home-services platform

npm-workspaces monorepo with three Expo (SDK 57) apps, two shared packages and a Spring Boot backend.

| Part | Folder | Port | What it is |
| --- | --- | --- | --- |
| Customer app | `apps/customer` | 8081 | Browse, book, track, pay, review |
| Vendor app ("Profecian Partner") | `apps/vendor` | 8082 | KYC onboarding, jobs workflow, earnings |
| Admin panel | `apps/admin` | 8083 | Operations, vendors, services, payments, analytics |
| Backend | `backend` | 8080 | Java 21 / Spring Boot API, Postgres + PostGIS, Redis |

Shared packages: `packages/shared` (types, seed data, pricing, statuses, mock **and** HTTP backends, React hooks) and `packages/ui` (theme, primitives, charts, OTP login, sheets).

Each app runs in one of two modes, chosen by `EXPO_PUBLIC_API_URL`:

- **Unset → offline demo.** An in-memory mock backend persisted on the device; every app has its own copy of the demo data and demo "simulate" buttons play the other side.
- **Set → real backend.** All three apps share one database through the API; live updates arrive over WebSocket. Demo-only buttons are hidden.

## Run everything in one go

```bash
npm install
npm run dev        # Postgres + Redis (Docker) → backend → customer, vendor, admin on the real backend
npm run dev:mock   # just the three apps on the offline mock (no Docker or Java needed)
```

`npm run dev` waits for the backend to be healthy, then opens the apps at http://localhost:8081 (customer), :8082 (vendor) and :8083 (admin). Ctrl+C stops the backend and apps; Postgres and Redis keep running with their data (`npm run backend:down` stops them). A backend already running on :8080, or an app already on its port, is reused rather than started twice.

## Run the apps (offline demo)

```bash
npm install
npm run customer   # or: npm run vendor / npm run admin
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (shared pricing rules and the mock backend). Native: `npx expo start` inside an app folder.

## Run with the real backend

Needs Java 21, Docker (Docker Desktop on Windows/macOS).

```bash
npm run backend:up      # docker compose: Postgres 16 + PostGIS on :5433, Redis on :6379
npm run backend         # ./mvnw spring-boot:run (profile "dev": migrations + demo data, sandbox OTP/payments)
```

Then start each app pointed at it (any shell):

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080 npm run customer
```

…and the same for `vendor` and `admin`. You can also put `EXPO_PUBLIC_API_URL=…` in `apps/<app>/.env` (see `.env.example`); use `http://10.0.2.2:8080` from the Android emulator and `http://<your-PC-IP>:8080` from a phone.

- API docs: http://localhost:8080/swagger-ui.html
- Tests: `npm run backend:test` (unit tests always; Testcontainers integration tests run when Docker is available)
- Demo data comes from the same seed as the mock: `npm run backend:seed` regenerates `backend/src/main/resources/db/dev/V1000__dev_seed.sql` from `packages/shared/src/seed.ts`. To reload it, `npm run backend:down -- -v` then `backend:up`.
- Stop: `npm run backend:down`

## Demo accounts

| App | Login |
| --- | --- |
| Customer | `9876500001` (any new number → sign-up flow) |
| Vendor | `9876500101` (approved) · `9876500109` (pending KYC) |
| Admin | `admin@profecian.app` / `Admin@123` (also `ops@`, `finance@`, `support@` for role-limited views) |

OTP for every phone login: **123456** (sandbox; the real OTP provider sends an SMS).

Themes: each app has purple or dark blue, in light, dark or system mode (customer: Settings; vendor: Profile; admin: top-bar theme button or Settings).

## Job safeguards (vendor app)

- **Start code** — when the professional marks "arrived", the customer's app shows a 4-digit code. The professional must enter it to start the service. After 5 wrong codes only support can start the job (admin → booking → Change status → In progress).
- **After photo** — at least one "after" photo is needed before the service can be completed; "before" photos are optional.
- **Slide to confirm, with undo** — each step is a slide, not a tap, and can be undone for 10 seconds. Customer messages about a step go out only after that window.
- **One job at a time** — a professional can't start a job while another of theirs is in progress.

In the offline mock the vendor app shows the start code as a "Demo mode" hint, because the customer app has separate data there.

## Giving a job back (vendor app)

A professional never cancels a customer's booking. They **release** it: it returns to "awaiting assignment" in the admin's queue and the admin picks the next professional.

- **Not accepted yet** — Decline, reason optional, nothing on their record.
- **Accepted, more than 2 hours before the slot** — "Can't make it" with a reason (Unwell, Vehicle problem, Previous job running late, Wrong service for me, Other + note). An early release.
- **2 hours or less to go, or already on the way** — the same, but a late release: the booking is marked urgent (top of the assignment queue and the dashboard's "Needs attention").
- **Arrived / in progress** — no release. The professional reports "Customer not available", "Can't do this job" or "Can't complete" and the admin decides: return visit, reassign, mark handled, or cancel.

The customer is told straight away and their tracker goes back to "Finding a professional". Each professional has a **completion rate** = (jobs accepted − late releases) ÷ jobs accepted, shown as "New" until 5 jobs, in red below 85%, and used in the suggestion ranking. There is no money penalty and no automatic suspension.

## Cities

Admins manage cities in the admin panel under **Cities** (super admin). Each city has:

- **Status** — *Live* (customers can book), *Coming soon* (vendors can sign up and get verified ahead of launch; customers see "coming soon"), or *Paused* (no new bookings; existing ones carry on).
- **Centre and service radius** — "Use current location" only matches a city within its radius.
- **Localities** — the service areas vendors pick from.
- **Services offered** — switch off a service in one city while you have no professionals for it there.

- **Price level** — prices in the city as a percentage of the base price (100 = base). City price = base × level, rounded to the nearest amount ending in 9; the inspection fee follows the same rule. For a single problem you can instead type an **exact price** for that city (Services → pick the city in the filter → open the problem); it is charged as typed.
- **City commission** (optional) — replaces the category commission for bookings in that city.

Prices and commission follow the city of the visit address, and existing bookings keep the price they were placed at. With a city picked in the admin's city filter, the Services tab shows that city's prices.

Bookings are only accepted in live cities for services offered there, and vendor matching only suggests professionals based in the booking's city. To open a new city: add it as *Coming soon*, recruit and approve vendors there, then switch it to *Live*. A city can't be renamed, and can only be deleted while nothing uses it (pause it instead).

## Integrations

Third parties sit behind interfaces with sandbox implementations: OTP (`OtpProvider`), push / WhatsApp / SMS (`notifications/Providers.java`, delivered through a transactional outbox with retries), payments (`PaymentGateway`: sandbox with "simulate failure", Razorpay adapter TODO) and file storage (`StorageService`: local folder in dev, any S3-compatible store in prod).

## Pricing

GST 18% on top of the service amount; commission is a per-category rate on the service amount; vendor payout = service amount − commission. Same rules in `packages/shared/src/pricing.ts` and `backend/.../pricing/Pricing.java`.
