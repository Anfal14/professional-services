# Architecture

## Monorepo
Root `package.json` workspaces `apps/*`, `packages/*`; scripts `customer|vendor|admin|typecheck|lint`. Metro's monorepo auto-config + `experiments.autolinkingModuleResolution` in each `app.json`. Packages export TS source (`"main": "src/index.ts"`), deps declared `"*"`.

## packages/shared/src
`types.ts` (Database & entities) · `seed.ts` (deterministic seed, `DB_VERSION`, `DEMO`) · `pricing.ts` (`computeBreakdown`, `computeVendorWallet`) · `status.ts` (status label/tone/icon maps, vendor workflow `VENDOR_NEXT`) · `format.ts` · `geo.ts` (haversine, `mapsUrl`) · `providers.ts` (OTP/WhatsApp/payments stubs) · `notify.ts` (`notifyFor.*` builds notifications per event) · `analytics.ts` · `mock.ts` (`createMockBackend`, `ROLE_PERMISSIONS`, `can`, `suggestVendors`) · `react.tsx` (`BackendProvider`, `useDb`, `useSession`, `useAction`).

## packages/ui/src
`theme.ts` (+ `toneColors`, `chartColors`) · `primitives.tsx` (Button, Card, Badge, TextField, ChipGroup, Toggle, StatCard…; `PressableScale` splits layout vs visual style) · `widgets.tsx` (Stars, StarInput, PhotoPicker, Timeline, Sheet, DateSlotPicker) · `OtpLogin.tsx` · `Charts.tsx` (ColumnChart, LineChart, BarList with table toggle) · `confirm.ts`.

## Data flow
Screen → `useDb()` (snapshot via `useSyncExternalStore`) for reads; `useAction(backend.<role>.<fn>)` for writes → `commit` immutable update → persist to AsyncStorage → subscribers re-render. Each write also appends notifications via `notifyFor`.

## Apps
- **customer** (`apps/customer/src`): `_layout` = BackendProvider → AuthProvider → LocationProvider → BookingsProvider. Catalogue built from DB via `useCatalog()` (`data/services.ts`). Routes: `/`, `/services`, `/service/[id]`, `/book/[id]`, `/success`, `/bookings`, `/booking/[id]`, `/invoice/[id]`, `/notifications`, `/account`, `/login`, `/profile-setup`, `/about`, `/contact`.
- **vendor** (`apps/vendor/src`): `index` routes by vendor status → `login` / `register` / `onboarding` / `(tabs)` (dashboard, jobs, earnings, profile); `job/[id]`, `reviews`, `notifications`.
- **admin** (`apps/admin/src`): `login`; `(panel)` wrapped in `AdminShell` (sidebar ≥1024) with `Page` permission gate: dashboard, bookings(+[id]), assign, vendors(+[id]), users(+[id]), services(+[id]), payments, reviews, analytics, notifications, settings. Generic `DataTable` in `components/admin.tsx`.
