# 2026-10-08 — Multi-city support

## Request
"In case we want to extend these services to multiple cities, implement this feature."

## Implementation
See `features/multi-city.md`. Cities became managed records (status, centre + radius, localities, services not offered) with an admin Cities page; booking, vendor sign-up and vendor matching are city-aware in both the mock and the Spring Boot backend; the customer and vendor apps read cities from the platform instead of hard-coded lists. Seed: 5 live cities, Delhi/Nagpur/Kolhapur coming soon, pest control not offered in Mumbai. DB version 7 → 8.

Also in this change (uncommitted from before): `npm run dev` / `dev:mock` one-command launcher (`scripts/dev.mjs`).

## Verification
- Backend: 15 unit + 16 integration tests pass (new `CitiesIT`: seeded details, booking rules, same-city suggestions, admin create/launch/rename/validation/delete/permissions, vendor sign-up).
- Mock: script run of the same scenarios — identical outcomes and messages.
- Typecheck + lint clean.
- Browser (real backend, existing dev DB migrated in place via V2 + V1001): admin Cities page stats; created Nashik (coming soon, painting off) → launched → customer picker listed it, home hid Painting, Painting page showed the notice and wouldn't add to cart → paused in admin → customer home showed "Bookings in Nashik are paused for now" live → deleted Nashik → customer fell back to Solapur.

## Remaining
City-specific pricing, city-scoped admin roles, per-city support numbers. Not committed.

## 2026-10-10 — Admin global search + city filter
Request: "Add global search button for admin in navbar, add city filter in each section." See `features/platform-admin.md` (last section). Verified in the browser on the real backend: Mumbai filter gave consistent numbers across all eight sections (24 bookings, 1 vendor, 4 users), survived a reload and cleared; search found bookings/vendor for "ravi", opened the vendor with ↓×5 + Enter, and matched a partial phone number; phone-width top bar fixed (Admin badge hidden under 420px). Typecheck + lint clean. Frontend only — no backend changes.

## 2026-10-10 — City-based pricing
Request: price level per city (base × level, rounded to end in 9; 100% unchanged), exact per-city price per problem type, inspection fee by the same rule, optional city commission, backend prices from the visit address's city, customer app shows the selected city's prices and the cart reprices + says so, existing bookings keep their price, city filter on the admin Services tab, mock + Spring Boot with tests. See `features/multi-city.md` → "City pricing".
Verification: backend 21 unit + 22 integration tests pass (new CityPricingTest, CityPricingIT); `npm test` 13 pass (same cases against the shared rules and the mock); typecheck + lint clean. Browser on the real backend (dev DB migrated in place by V3 + V1002): customer in Mumbai saw ₹349 fan / ₹189 switch / ₹249 inspection, added both, chose a Solapur address → cart showed "Prices updated for Solapur … ₹398 (it was ₹538)"; admin Services with the Mumbai filter showed city prices + 22% city commission, set and cleared an exact ₹199 price for switch repair; Cities card/sheet show level and commission.
Behaviour change: repricing after an inspection quote now keeps the booking's stored commission rate. Not committed.
