# 2026-09-27 — Navbar redesign, mock auth, home page redesign

## Request
1. In the Navbar, remove About and Contact completely.
2. After Services, add a static location "Solapur" and a search bar.
3. Replace the "Book a Service" button with an avatar: click → login if signed out; if signed in → dropdown with Account, My Bookings, Logout. Remove My Bookings from the navbar.
4. Remove the home page hero and stats sections completely. Replace with: a grid of sketch/tool-icon service tiles on one side, and a curvy-roadmap "how it works" on the other, so a landing user immediately understands the offering and can quick-book.

## Implementation
- **Navbar** (`components/Navbar.tsx`): top links trimmed to Home/Services (`TOP_LINKS`, filtered from the existing `NAV_ITEMS`, which still feeds `BottomNav` unchanged). Added a static `LocationPill` ("Solapur") and a compact `SearchBar` after the links on desktop/tablet; on mobile they move to a second row below the main bar (hidden on `back`-mode sub-pages). Replaced the desktop "Book a Service" button and the mobile WhatsApp icon with `NavAvatar` on every breakpoint.
- **Mock auth** (new): `services/authApi.ts` + `context/AuthContext.tsx` (mirrors `bookingsApi.ts`/`BookingsContext` pattern), `types.ts` `AuthUser`. Wrapped `AuthProvider` around the app in `app/_layout.tsx`.
- **`components/NavAvatar.tsx`** (new): avatar button; signed-out → login form (name + 10-digit phone, reuses `isValidPhone`); signed-in → menu (Account → `/account`, My Bookings → `/bookings`, Logout). Bottom sheet on mobile, small dialog near the top-right on desktop.
- **`app/account.tsx`** (new): minimal profile screen; registered in `_layout.tsx`.
- **`components/SearchBar.tsx`**: added a `compact` prop (smaller, no shadow, pill-shaped) for the navbar; existing usages unaffected.
- **Home page** (`app/index.tsx`): removed the hero banner, the stats strip, and the old numbered 3-card "how it works" section. Removed the now-redundant full-photo "Our services" `ServiceCard` grid (kept on `/services`). Added a top "quick-book" section: a grid of `ServiceIconTile`s (each service's existing outline icon + tint) next to `RoadmapSteps`, a new curvy dashed-line timeline component (`components/RoadmapSteps.tsx`, built on `react-native-svg`). Kept "Why QuickJob", testimonials and the WhatsApp CTA sections unchanged.
- Installed `react-native-svg` via `npx expo install`.

## Files Changed
`QuickJob/src/components/Navbar.tsx`, `NavAvatar.tsx` (new), `RoadmapSteps.tsx` (new), `SearchBar.tsx`, `app/index.tsx`, `app/account.tsx` (new), `app/_layout.tsx`, `context/AuthContext.tsx` (new), `services/authApi.ts` (new), `types.ts`, `package.json`/`package-lock.json` (react-native-svg).

## Database Changes
New AsyncStorage key `@quickjob/auth/v1` (mock user: `{ name, phone }`).

## API Changes
None (still no backend).

## Important Decisions
See `DECISIONS.md` (2026-09-27 entries): `NAV_ITEMS` vs `TOP_LINKS` split, avatar on every breakpoint, static location, mock auth pattern, home page consolidation, `react-native-svg` justification.

## Verification
`npx tsc --noEmit` clean, `npx expo lint` clean, `npx expo-doctor` 21/21. Manually exercised in the web preview at desktop and mobile widths: login → avatar shows initials → account menu (Account/My Bookings/Logout) → `/account` page; mobile second-row location+search; mobile back-mode pages don't show the extra row; home page renders the icon grid + curvy roadmap on both breakpoints; no console errors. Not run on a native simulator/device.

## Remaining Work
Commit and push (repo has this + the earlier restructure commit still pending); replace placeholder business data; real backend/auth eventually (see `features/auth.md`).
