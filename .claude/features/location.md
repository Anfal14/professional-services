# Location (mock, on-device)

## Purpose
Let the user pick which city they're booking in, shown as a pill in the navbar. No geolocation or backend yet — a fixed city list, persisted on-device.

## Status
Completed (mock only).

## Relevant Files (`QuickJob/src/`)
- `data/locations.ts` — `CITIES` (Solapur, Pune, Mumbai, Bengaluru, Hyderabad, Delhi, Nagpur, Kolhapur), `City` type, `DEFAULT_CITY` ("Solapur"), `isCity()` guard.
- `services/locationApi.ts` — `fetchCity`, `saveCity`. AsyncStorage key `@quickjob/location/v1`. Mirrors `bookingsApi.ts`/`authApi.ts`'s pattern.
- `context/LocationContext.tsx` — `LocationProvider`, `useLocation()` → `{ city, loading, setCity }`. Wrapped in `app/_layout.tsx` (between `AuthProvider` and `BookingsProvider`).
- `components/LocationPill.tsx` — the only UI: a pill showing the current city; tapping opens a picker (bottom sheet on mobile, small dialog on desktop) listing `CITIES` with a checkmark on the active one.
- `components/Navbar.tsx` renders `<LocationPill />` — desktop/tablet in the middle nav row next to Home/Services, mobile in the single top row next to the logo and avatar (see `features/ui-shell.md`).

## Architecture
Same shape as auth/bookings: Context → API module → AsyncStorage. No validation needed beyond "is one of `CITIES`" (`isCity`).

## Constraints
- Selecting a city does not currently filter services, prices or ETAs — it's a display/persisted preference only, same as the city being cosmetic before this change.
- Don't rename cities without checking nothing else keys off the string (nothing does yet).

## Known Issues
No geolocation ("use my location") and no "service not available in this city" handling — every city sees the same catalogue.

## Future Work
Wire geolocation, per-city service/price differences, and an "not serviceable here" state if that's ever needed.

## Last Important Change
2026-09-27 — initial build (replaced the static "Solapur" text pill). See `changes/2026-09-27-dynamic-location.md`.
