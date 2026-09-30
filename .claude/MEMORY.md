# Project Memory — Profecian

## Purpose
Home-services platform (Urban Company style), rebranded from "QuickJob" by the user. Three frontends: customer app, vendor ("Partner") app, admin web panel. **Backend/DB not decided** — user asked for frontend flow only, third parties stubbed ("stub now, wire later").

## Stack
npm-workspaces monorepo. Expo SDK 57, RN 0.86, React 19.2, Expo Router (`src/app` in each app), TS strict, react-native-web, react-native-svg (charts + roadmap). Do not upgrade Expo/RN; `npx expo install` inside the app folder.

## Layout
`apps/customer` (8081) · `apps/vendor` (8082) · `apps/admin` (8083, web-first) · `packages/shared` (types, seed, pricing, statuses, notify, analytics, mock backend, hooks) · `packages/ui` (theme, primitives, widgets, OtpLogin, Charts). Details: `ARCHITECTURE.md`.

## Backend (mock)
`createMockBackend` in `packages/shared/src/mock.ts`: in-memory `Database`, persisted per app at `@profecian/<app>/db/v${DB_VERSION}` (DB_VERSION 4 — bump when seed/shape changes). Apps **do not share state**; each starts from the same deterministic seed. Screens only call `backend.customer|vendor|admin.*` / hooks (`useDb`, `useSession`, `useAction`).

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

## Verification
Root: `npm run typecheck`, `npm run lint`. Per app: `npx expo-doctor`, `npx expo export --platform web` (+ android/ios for customer/vendor). All clean on 2026-09-28.

## Current focus
2026-09-29: customer cart (multi-select problems → one booking per service), Zomato-style location/addresses, purple/dark-blue × light/dark/system themes in all apps (`changes/2026-09-29-cart-location-theme.md`). Uncommitted on branch `feat/quickjob-app`. Platform base: `changes/2026-09-28-three-app-platform.md`. Next: pick backend, replace mock with an HTTP client of the same surface, real OTP/WhatsApp Business/payment gateway, shared state across apps.
