# My Bookings

> **Superseded 2026-09-28**: see `platform-customer.md`. Paths below are relative to the old `QuickJob/` (now `apps/customer/`).

## Purpose
List user's bookings with status badges; filter and cancel.

## Status
Completed.

## Relevant Files (`QuickJob/src/`)
- `app/bookings.tsx` — filters All/Upcoming/Completed/Cancelled with counts, `BookingCard`, cancel via `confirmAction`, WhatsApp help.
- `components/StatusBadge.tsx` — pending/confirmed/in_progress/completed/cancelled styles.
- `components/BottomNav.tsx` — upcoming-count badge.
- `context/BookingsContext.tsx` — `effectiveStatus` (in_progress at slot start, completed 2 h later), `cancelBooking`.
- `utils/confirm.ts`.

## Architecture
Sort: upcoming first (soonest), then others newest first. Cancel allowed only for pending/confirmed.

## Constraints
Status derivation is client-side; replace with server status when a backend exists.

## Last Important Change
2026-09-25 — initial build.
