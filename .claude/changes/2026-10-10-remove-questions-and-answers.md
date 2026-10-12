# Questions and answers removed (2026-10-10)

The in-app question thread on a booking's quote panel ("Ask customer" for vendor and admin, "Reply" for the customer) is gone for every role. Supersedes the Q&A parts of `2026-10-02-not-sure-inspection-workflow.md`.

## What went
- UI: "QUESTIONS & ANSWERS" block and "Waiting for customer" badge in `InspectionPanel`; "Ask customer" buttons and sheets (vendor job screen, admin booking page); customer "Reply" button and sheet; "waiting for customer" wording on the admin bookings list and vendor `JobCard`. `ComposeSheet` stays (used for "No repair needed").
- Shared: `InspectionRequest.messages` / `awaitingCustomer`, `ClarificationMessage`, timeline and notification kinds `clarification_requested` / `clarification_answered`, `notifyFor.clarificationRequested/Answered`, backend methods `customer.answerClarification`, `vendor.askClarification`, `admin.askCustomer` (mock and http).
- Backend: `POST /customer/bookings/{id}/clarification`, `/vendor/jobs/{id}/clarification`, `/admin/bookings/{id}/ask` and their service methods; `Inspection.messages` / `awaitingCustomer`; `Api.ClarificationMessage`.
- Data: `V7__remove_questions.sql` drops `inspection_messages` and `booking_inspections.awaiting_customer`, deletes the clarification timeline events and notifications, and renumbers `booking_events.position` (it is an `@OrderColumn`, so gaps are not allowed).
- Seed: no question rows in `seed.ts`, `V1000__dev_seed.sql` or `generate-dev-seed.ts`. Snapshot / mock DB version 12 → 13.

## Notes
- Dev profile now has `spring.flyway.validate-on-migrate: false`: V1000 had to be edited by hand (it inserted into the dropped table), which changes its checksum on databases that already ran it. Production loads `db/migration` only and still validates.
- `inspectionNeedsAttention` is now: no professional yet, or a quote unanswered.
- If a professional or support needs details from the customer, they call (the Call buttons are unchanged).
