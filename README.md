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

## Run the apps (offline demo)

```bash
npm install
npm run customer   # or: npm run vendor / npm run admin
```

Checks: `npm run typecheck`, `npm run lint`. Native: `npx expo start` inside an app folder.

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

## Integrations

Third parties sit behind interfaces with sandbox implementations: OTP (`OtpProvider`), push / WhatsApp / SMS (`notifications/Providers.java`, delivered through a transactional outbox with retries), payments (`PaymentGateway`: sandbox with "simulate failure", Razorpay adapter TODO) and file storage (`StorageService`: local folder in dev, any S3-compatible store in prod).

## Pricing

GST 18% on top of the service amount; commission is a per-category rate on the service amount; vendor payout = service amount − commission. Same rules in `packages/shared/src/pricing.ts` and `backend/.../pricing/Pricing.java`.
