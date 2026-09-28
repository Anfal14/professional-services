# 2026-09-27 — Hero revert, icon-tile grid removed

## Request
"Icon cards not looking good and specifying service details, revert hero page design except stats" — i.e. the new icon-tile quick-book grid looks bad and doesn't show price/rating; bring back the hero, but leave the stats strip removed.

## Implementation
In `app/index.tsx`:
- Restored the original hero section verbatim (photo background, headline, search bar + quick-search chips, `TrustBadges`, desktop hero card) — this is the code that was removed earlier the same day in `changes/2026-09-27-navbar-and-home-redesign.md`.
- Did **not** restore the stats strip (kept removed, per "except stats").
- Removed the icon-tile quick-book grid (`ServiceIconTile`) entirely and restored the original "Our services" section using the full photo `ServiceCard` grid instead (shows rating, review count, price).
- Kept `RoadmapSteps` (the curvy "how it works" timeline) since it wasn't the thing complained about, but gave it its own centered "How it works" section (a single card, not paired side-by-side with the service grid as it briefly was).

## Files Changed
`QuickJob/src/app/index.tsx` only.

## Database Changes
None.

## API Changes
None.

## Important Decisions
See `DECISIONS.md`'s "Home page hero, stats and the numbered how-it-works cards removed, then hero reverted same day" entry.

## Verification
`npx tsc --noEmit` clean, `npx expo lint` clean, `npx expo-doctor` 21/21. Confirmed in the web preview: hero renders with search/chips/trust badges, no stats strip beneath it, "Our services" shows photo cards with rating/price, "How it works" shows the curvy roadmap in its own card. No console errors.

## Remaining Work
Same as before — commit/push, replace placeholder data.
