# Home & Service Discovery

## Purpose
Let users find a service: home hero + service grid, service list with search, service details with issue selection.

## Status
Completed.

## Relevant Files (`QuickJob/src/`)
- `app/index.tsx` — hero (photo, headline, search + quick-search chips, `TrustBadges`), "Our services" full photo `ServiceCard` grid, "How it works" (`RoadmapSteps` curvy timeline in a centered card), why-us, testimonials, WhatsApp CTA. **No stats strip** (removed 2026-09-27, stays removed — see decisions below).
- `app/services.tsx` — full list with photo `ServiceCard`s; `?q=` param seeds search (synced during render, not in an effect).
- `app/service/[id].tsx` — hero, issue cards (single select + "Not sure" = `OTHER_ISSUE_ID`), includes list, related services; mobile sticky action bar, desktop summary card.
- `components/ServiceCard.tsx`, `IssueCard.tsx`, `SearchBar.tsx` (has a `compact` prop for the navbar), `TrustBadges.tsx`, `Rating.tsx`, `SectionHeader.tsx`, `RoadmapSteps.tsx` (curvy how-it-works timeline, uses `react-native-svg`).
- `data/services.ts` — `services[]`, `getService`, `searchServices`, `getIssueTitle`, `HERO_IMAGE`/`ABOUT_IMAGE`/`TECH_IMAGE`, `stats` (used by `about.tsx` only — home no longer shows it), `testimonials`.

## Architecture
Static catalogue; search matches service name, tagline and issue titles. "Book Now" routes to `/book/[id]` with optional `issue` param. Global search/location also live in `Navbar` (see `ui-shell.md`) alongside the hero's own search — a deliberate small duplication, same as `services.tsx` having its own search too.

## Data Model
`Service { id, name, tagline, description, image, icon, tint, rating, reviews, startingPrice, eta, popular?, includes[], issues[] }`; `Issue { id, title, description, price, duration, icon }`.

## Constraints
- Service/issue ids are stored in bookings — renaming them breaks existing bookings.
- Image URLs use Unsplash `w=900`; detail hero swaps to `w=1800` via string replace.
- Don't reintroduce the stats strip on the home page — explicitly removed and asked to stay removed (2026-09-27).
- Don't reintroduce a plain icon-tile service grid on the home page — tried on 2026-09-27, reverted the same day for looking bad and not showing price/rating; the full photo `ServiceCard` grid is what belongs there.

## Known Issues
Sample prices/ratings; images hot-linked.

## Last Important Change
2026-09-27 (two changes same day):
1. Removed hero + stats + old "how it works" cards, added a home-page-only icon-tile quick-book grid + roadmap (`changes/2026-09-27-navbar-and-home-redesign.md`).
2. Reverted #1's hero removal and icon-tile grid after feedback ("icon cards not looking good and not specifying service details"); restored the original hero and the full photo `ServiceCard` grid, kept the stats strip removed, and kept `RoadmapSteps` but as its own centered "How it works" section instead of paired with the icon grid (`changes/2026-09-27-hero-revert.md`).
3. Replaced the hero's desktop floating "Verified professional" card (one `TECH_IMAGE` photo + caption + rating badge) with a plain 2×2 grid of 4 service photos, no labels/badges/shared frame — `heroPreviewServices = services.slice(0, 4)` in `app/index.tsx` (went through a few intermediate looks — asymmetric grid, then a rotated free-floating scatter — before landing on this flat grid per a reference screenshot). See `changes/2026-09-27-hero-services-collage.md`.
