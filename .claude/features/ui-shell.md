# App Shell & Design System

## Purpose
Shared page chrome, theme tokens and reusable primitives.

## Status
Completed.

## Relevant Files (`QuickJob/src/`)
- `components/Screen.tsx` — page shell (navbar, scroll, footer, bottom nav / actionBar, `pageTitle` → web tab title).
- `components/Navbar.tsx` — desktop/tablet: logo, Home/Services links (`TOP_LINKS`, filtered from `NAV_ITEMS`), `LocationPill`, a compact `SearchBar`, and `NavAvatar` on the far right. **Mobile: logo, `LocationPill` and `NavAvatar` all sit in the single top row** (no second row anymore — see Decisions). Row hidden/replaced by a back button + title on `back`-mode sub-pages.
- `components/LocationPill.tsx` — interactive location pill (was static "Solapur" text before 2026-09-27); opens a picker (bottom sheet mobile / dialog desktop) listing `CITIES` from `data/locations.ts`; backed by `LocationContext`/`services/locationApi.ts` (see `features/location.md`).
- `components/NavAvatar.tsx` — avatar button; logged out → login modal (name + phone, mock auth); logged in → menu (Account, My Bookings, Logout). Bottom sheet on mobile, small dialog anchored near the top-right on desktop.
- `components/BottomNav.tsx` — mobile tab bar; still uses the **full** `NAV_ITEMS` (Home/Services/Bookings/About/Contact) — intentionally not touched by the navbar redesign, so About/Contact/Bookings stay reachable on mobile.
- `components/RoadmapSteps.tsx` — curvy "how it works" timeline (react-native-svg `Path` behind numbered nodes). Home-page specific but kept as a shared component in case another page wants it.
- `components/Footer.tsx`, `navigation.ts` (`NAV_ITEMS`, `isActive`).
- Primitives: `AppText`, `Button` (primary gradient, secondary, outline, ghost, whatsapp, dark, light), `PressableScale`, `FadeIn`, `Container`, `Grid`, `Logo`, `EmptyState`.
- `theme/index.ts`, `hooks/useResponsive.ts`, `app/_layout.tsx` (wraps `AuthProvider` → `LocationProvider` → `BookingsProvider`).

## Important Decisions
See `DECISIONS.md` (custom chrome, Animated + useState values, fonts per weight, mock local auth/location, `NAV_ITEMS` vs `TOP_LINKS` split, mobile hero simplification).

## Constraints
- Use theme tokens, not raw colors, for new UI.
- Hover styles typed via `WebPressableState` (`types.ts`).
- Do not add About/Contact/My Bookings back into `Navbar`'s `TOP_LINKS` — they were deliberately moved to `NavAvatar`'s menu / `BottomNav`. Edit `NAV_ITEMS` in `navigation.ts` only if the change should also affect the mobile tab bar.
- `react-native-svg` is a project dependency now (installed for `RoadmapSteps`).
- On mobile, `app/index.tsx`'s hero only shows the eyebrow badge + search bar (heading, subtitle and `TrustBadges` are hidden via `!isMobile &&`) — don't reintroduce them on mobile without also revisiting the reduced mobile hero `minHeight` (320).

## Known Issues (pre-existing, not touched by the location/hero work)
`Navbar.tsx` imports `SearchBar` and has unused `query`/`search` state — the navbar's own search input is not currently rendered in its JSX (only lint warnings, not errors). Worth a follow-up: either wire it back in or remove the dead code.

## Last Important Change
2026-09-27 — Location pill made dynamic (`features/location.md`); moved to the mobile top bar instead of a second row; hero heading/subtitle/`TrustBadges` hidden on mobile and hero `minHeight` reduced there to avoid empty space.
