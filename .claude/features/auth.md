# Auth (mock, on-device)

> **Superseded 2026-09-28**: see `platform-customer.md`. Paths below are relative to the old `QuickJob/` (now `apps/customer/`).

## Purpose
Let a user "log in" with just a name + phone so the navbar avatar can show an account menu (Account, My Bookings, Logout) instead of a login prompt. No backend, no OTP — a placeholder until real auth exists.

## Status
Completed (mock only).

## Relevant Files (`QuickJob/src/`)
- `services/authApi.ts` — persistence: `fetchUser`, `loginUser(name, phone)`, `logoutUser`. AsyncStorage key `@quickjob/auth/v1`. Mirrors `bookingsApi.ts`'s pattern so it's a drop-in swap for a real API later.
- `context/AuthContext.tsx` — `AuthProvider`, `useAuth()` → `{ user, loading, login, logout }`. Wrapped around the app in `app/_layout.tsx` (outside `BookingsProvider`).
- `components/NavAvatar.tsx` — the only UI: login form when signed out, menu when signed in.
- `app/account.tsx` — minimal profile screen (name, phone, My Bookings button, Logout). Guards on `!user` with an `EmptyState`.
- `types.ts` — `AuthUser { name, phone }`.

## Architecture
Same shape as bookings: Context → API module → AsyncStorage. `login()` accepts any name (≥2 chars) and a valid 10-digit Indian mobile (reuses `utils/validation.ts`'s `isValidPhone`/`normalizePhone`) — there is no password, OTP or server check.

## Constraints
- Do not wire real credentials/passwords into this — it's a placeholder. Replacing it with real auth means swapping `authApi.ts`'s three functions and probably adding a `token` to `AuthUser`.
- Booking data is not yet linked to the logged-in user (bookings are still just "on this device", not "for this account").

## Known Issues
- No OTP/verification — anyone can "log in" as anyone with any phone number.
- Logging out does not clear bookings (by design — bookings aren't user-scoped yet).

## Future Work
Real backend auth (OTP or password), scope bookings to the logged-in user, "edit profile" on the account page.

## Last Important Change
2026-09-27 — initial build (`changes/2026-09-27-navbar-and-home-redesign.md`).
