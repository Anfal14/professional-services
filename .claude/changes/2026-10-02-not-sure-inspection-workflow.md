# 2026-10-02 — "Other / Not sure" inspection workflow

## Request
Production-ready handling when a customer picks "Not sure" / "Other" in any service: keep the chosen category, no fake categories, clear info and actions for customer, vendor and admin, and edge cases (missing details, vendor rejection, reassignment, clarification, cancellation).

## Design
- `Booking.inspection?: InspectionRequest` (types.ts) — description (required, ≥15 chars), photos (≤3), `fee`, `status` (pending → quoted → approved | declined, or no_work_needed), `quote` (itemised lines, vendor, responded by customer|admin), `messages` (Q&A thread), `awaitingCustomer`. `problemTypeId` is now optional; "Not sure" no longer maps to a real problem type (previously it silently became e.g. "Noise or bad smell").
- Pricing: per-category `inspectionFee` → `settings.defaultInspectionFee` (199). Service amount = known items + fee, or + approved quote instead of the fee (`inspectionServiceAmount`). Commission/payout follow automatically.
- Rules in `packages/shared/src/inspection.ts`: `INSPECTION_STATUS`, `inspectionNextStep(b, role)`, `isQuoteOpen`, `canQuote`, `inspectionNeedsAttention`, limits.
- Backend (mock.ts): createBooking validates details; customer `answerClarification`, `respondToQuote`; vendor `askClarification`, `shareQuote`, `markNoWorkNeeded`; admin `askCustomer`, `respondToQuote` (on behalf). Guards: can't complete (vendor or admin) or pay online while the quote is open; reassign/unassign drops an unanswered quote; decline keeps the request for the next professional; closed bookings reject actions. New notification + timeline kinds.
- UI: `InspectionPanel` + `ComposeSheet` in packages/ui (same view for all roles, role actions injected). Customer: cart requires a description (+ photos) per "Not sure" service, booking page Approve/Decline/Reply, payment held while price is open. Vendor: badge on job card, panel with Ask / Share quote (`QuoteSheet`) / No repair needed, Complete blocked until settled. Admin: panel with Ask / Record approval/decline / Call, "Not sure" bookings filter, dashboard attention count, fee fields in category sheet + settings.
- Seed (DB_VERSION 6): AC Repair new job (vendor), Electrician quote awaiting customer, Painting with an open support question.

## Verification
typecheck + lint clean; web exports (all apps) + android (customer). Browser: vendor accept → arrive → quote validation → quote shared; customer approve (₹600 → ₹708 incl. GST, pay re-enabled), reply to support question, checkout blocked without description then booked with category kept and no problem type; admin dashboard count, Not sure filter, record approval via support.
