# 2026-09-27 — Dynamic location picker, mobile navbar/hero layout

## Request
1. "change location field to dynamic in Navbar"
2. Follow-up: "In Mobile view take location in top bar and in mobile hide heading, description and tags from hero"

## Implementation

### Dynamic location
- `data/locations.ts` — `CITIES` list, `City` type, `DEFAULT_CITY` ("Solapur"), `isCity()`.
- `services/locationApi.ts` — `fetchCity`/`saveCity`, AsyncStorage key `@quickjob/location/v1` (mirrors `authApi.ts`/`bookingsApi.ts`).
- `context/LocationContext.tsx` — `LocationProvider`/`useLocation()`; wrapped in `app/_layout.tsx` between `AuthProvider` and `BookingsProvider`.
- `components/LocationPill.tsx` (new) — replaces the static text pill that used to live inline in `Navbar.tsx`. Tap opens a picker (bottom sheet mobile / dialog desktop) over `CITIES`, selecting calls `setCity` and closes.

### Mobile navbar layout
`components/Navbar.tsx`: the mobile-only second row (which held just the location pill) is gone. `LocationPill` now renders inside the same top `bar` row as the logo and `NavAvatar`, for both mobile and desktop — the `middle` section is no longer wrapped in `{!isMobile && ...}` for the pill (only the Home/Services links stay desktop-only). Added a `middleMobile` style (`justifyContent: 'flex-end'`) so the pill sits close to the avatar on narrow screens.

### Mobile hero
`app/index.tsx`: the hero heading ("Home services, done right."), the subtitle, and `TrustBadges` are now wrapped in `{!isMobile && ...}` — hidden on phones, unchanged on tablet/desktop. The eyebrow badge and search bar remain on all breakpoints. Reduced the hero's mobile `minHeight` from 520 to 320 in the same edit, since removing three elements left a large empty gap.

## Files Changed
New: `data/locations.ts`, `services/locationApi.ts`, `context/LocationContext.tsx`, `components/LocationPill.tsx`.
Edited: `components/Navbar.tsx`, `app/_layout.tsx`, `app/index.tsx`.

## Database Changes
New AsyncStorage key `@quickjob/location/v1` (string, one of `CITIES`).

## API Changes
None.

## Important Decisions
See `DECISIONS.md`'s 2026-09-27 entries for location, mobile navbar and mobile hero.

## Verification
`npx tsc --noEmit` clean, `npx expo lint` → 0 errors (5 pre-existing warnings, see Additional Findings), `npx expo-doctor` 21/21. Manually verified in the browser: mobile top bar shows logo + location pill + avatar with no second row; tapping the pill opens the picker, selecting "Pune" updates the pill immediately and survives a reload; mobile hero shows only the eyebrow badge and search bar with a tighter height; desktop/tablet hero and navbar are unchanged (heading, subtitle, trust badges, and the inline location+search all still present there).

## Additional Findings (not fixed — out of scope for this task)
`components/Navbar.tsx` imports `SearchBar` and keeps `query`/`search` state, but no `<SearchBar>` is actually rendered in its JSX anymore, and `app/index.tsx` still defines an unused `QUICK_SEARCHES` array. These predate this session's changes (present before the location/hero work started) and only produce lint warnings, not errors. Worth a follow-up to either restore the navbar search input or delete the dead code.

## Remaining Work
Same as before — commit/push, replace placeholder data, decide on the navbar search dead code above.
