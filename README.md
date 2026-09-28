# Profecian — home-services platform (frontend)

npm-workspaces monorepo with three Expo (SDK 57) apps that share one domain package and one UI kit. **There is no real backend yet**: each app runs an in-memory mock backend persisted to its own AsyncStorage, and every third-party service (OTP, WhatsApp, payments) is a sandbox stub.

| App | Folder | Port | Who it's for |
| --- | --- | --- | --- |
| Customer | `apps/customer` | 8081 | Browse, book, track, pay, review |
| Vendor ("Profecian Partner") | `apps/vendor` | 8082 | KYC onboarding, jobs workflow, earnings |
| Admin | `apps/admin` | 8083 | Operations, vendors, services, payments, analytics |

Shared packages: `packages/shared` (types, seed data, pricing, statuses, mock backend, React hooks) and `packages/ui` (theme, primitives, charts, OTP login, sheets).

## Run

```bash
npm install
npm run customer   # or: npm run vendor / npm run admin
```

Checks: `npm run typecheck`, `npm run lint`. Native: `npx expo start` inside an app folder.

## Demo accounts

| App | Login |
| --- | --- |
| Customer | `9876500001` (any new number → sign-up flow) |
| Vendor | `9876500101` (approved) · `9876500109` (pending KYC) |
| Admin | `admin@profecian.app` / `Admin@123` (also `ops@`, `finance@`, `support@` for role-limited views) |

OTP for every phone login: **123456**.

## Mock backend limits

- The three apps **do not share state** — each starts from the same deterministic seed and keeps its own copy. A booking made in the customer app won't appear in the admin app. Demo-only "simulate" buttons stand in for the other side (e.g. "Simulate next update" on a customer booking, "Simulate admin approval" in vendor onboarding).
- Reset data: Admin → Settings or Vendor → Profile (reset demo data); for the customer app, clear site storage.
- Stubs to replace: `packages/shared/src/providers.ts` (OTP, WhatsApp via `wa.me`, payments with a simulated-failure toggle). Screens call `backend.customer|vendor|admin.*`, so an HTTP client with the same surface can replace `createMockBackend` without UI changes.

## Pricing

GST 18% on top of the service amount; commission is a per-category rate on the service amount; vendor payout = service amount − commission. See `packages/shared/src/pricing.ts`.
