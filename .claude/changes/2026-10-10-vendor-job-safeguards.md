# 2026-10-10 — Vendor job safeguards

## Request
For the vendor: (1) a 4-digit start code shown in the customer's app on arrival, which the vendor must enter to start (admin can still start the job); (2) at least one "after" photo before Complete service (before-photos optional); (3) slide to confirm instead of tap buttons, with Undo for ~10 seconds after each step; (4) only one job "in progress" at a time.

## Implementation
See `features/vendor-job-safeguards.md`. Mock + Spring Boot + vendor, customer and admin apps; new `SlideToConfirm` in the UI kit; V4 migration; DB version 9 → 10.

## Decisions not in the request
- 5 wrong codes lock the start; only support can then start the job.
- The start code is also sent in the arrival WhatsApp/push and shown to admins on the booking page.
- Accept / Decline stay buttons (a two-way choice); Accept still gets Undo.
- Undo is enforced on the server (10 s + 5 s grace) and recorded on the timeline; it is refused once a completed job is paid or reviewed.
- WhatsApp/push for vendor steps are delayed 20 s so an undone step sends nothing.
- The admin status override is exempt from the code, the photo and the one-job rule.

## Verification
- Backend: 27 unit + 24 integration tests pass (new `VendorJobRulesTest`, `VendorJobIT`; `PaymentsIT` now asserts on *due* outbox rows).
- `npm test`: 22 pass (9 new for job rules and the mock).
- Typecheck + lint clean.
- Browser on the real backend: accept → undo → accept; tap and short drag on the slider do nothing, full drag confirms; arrival showed code 8077 in the customer app and not in the vendor's data; wrong code rejected ("4 tries left"), right code started; complete locked until an after photo, then completed, undone, completed again, Undo gone after 10 s; a second vendor with a job in progress was blocked at the door with the banner; admin booking page showed the start code, "After (1)" photos and the undo events.
- Bug found and fixed while testing: the slider's gesture handlers were rebuilt on every re-render, so a slide during the undo countdown could be dropped.

## Remaining
Not committed. Test bookings PF2SATTV (completed, unpaid) and PF2T89NF (arrived, Ravi) were left in the dev database.

## Follow-up the same day — vendor home, Jobs tab, job screen, cash
Request: remove the earnings card from home and make the other cards clickable; show in-progress, then upcoming, then assigned jobs; add "in progress" to the Jobs tab; shrink Navigate and put it under Call, aligned; for cash, enter the amount received then confirm. See `features/platform-vendor.md` (last section).
Verified: backend 27 unit + 24 integration tests and `npm test` (22) pass with new cash-amount cases; typecheck + lint clean; in the browser Home showed 4 tappable cards and In progress (4) → Upcoming (2) → Assigned (2), the Completed card opened `/jobs?filter=completed`, Rating opened `/reviews`, Call and Navigate measured 124×36 in one column, ₹200 was refused and ₹294 recorded as Paid · Cash on PFMJOZL3. Not committed.
