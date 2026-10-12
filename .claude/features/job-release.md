# Job release (giving a job back after accepting)

Rules and messages: `packages/shared/src/release.ts` ↔ `backend/.../bookings/ReleaseRules.java`, tested with the same cases (`packages/shared/test/release.test.ts`; `ReleaseRulesTest`, `ReleaseIT`).

## Principle
A vendor never cancels the customer's booking. They **release** it: status → `pending_assignment`, `vendorId` removed, back in the admin queue. Only the customer or an admin cancels. Reassignment is manual (no auto re-offer).

## By stage
| Stage | Vendor action | Effect |
| --- | --- | --- |
| `assigned` | Decline (reason optional) | Back to queue. Not a release; nothing on the vendor's record. |
| `accepted`, > 2 h before slot | "Can't make it" → `vendor.releaseJob` | **Early** release. Admin + customer notified. |
| `accepted` ≤ 2 h before slot (or slot passed), or `on_the_way` | same | **Late** release: `booking.urgent = true`, counts against completion rate. |
| `arrived` | "Report a problem" → `vendor.reportIssue` (`customer_unavailable` / `cant_do`, note required) | No release. `booking.issue` opened; job stays with vendor until admin decides. |
| `in_progress` | "Can't complete" → `reportIssue` (`cant_complete` + reason `needs_part` / `bigger_problem` / `safety` / `other`; note required for other) | Same. |

Release reasons: `unwell`, `vehicle_problem`, `previous_job_late`, `wrong_service`, `other` (note ≥ 5 chars required for other).

## Data
- `Booking.releases: JobRelease[]` (history: vendorId, vendorName, reason, note, late, at) — backend table `booking_releases`.
- `Booking.urgent` — set by a late release; cleared when a vendor is assigned or the booking is closed.
- `Booking.issue: JobIssue` — open on-site report; backend columns `bookings.issue_*`.
- Timeline kinds: `released` (note = `releaseNote`: "Ravi Patil released the job — Vehicle problem (late release)"), `issue_reported`, `issue_resolved`.
- Migration `V5__job_release.sql`. Snapshot/mock DB version 11.

## Closing an on-site report
- Admin: `resolveIssue(bookingId, note)` (mark handled, job carries on), `scheduleReturnVisit(bookingId, date, slot)` (same vendor, status → `accepted`, customer + vendor notified), reassign, or any status change / cancel — all clear `issue`.
- Vendor carrying on with the job (next step) also clears it (timeline `issue_resolved` by vendor).
- "Revised quote" for a non-inspection booking has no price-change mechanism yet: admin marks it handled with a note.

## Who sees what (backend `ApiMapper`)
- `bookingForAdmin` — everything (`releases`, `urgent`, `issue`, notes).
- `booking` (customer) — no `releases` / `urgent` / `issue`; notes of `released` / `issue_*` events are blanked. The customer UI also drops `issue_*` events and relabels `released` as "Finding another professional".
- `bookingForVendor` — own `issue`, no `releases`, no start code.
- Never hand a booking to a non-admin through `bookingForAdmin`.

## Completion rate
- `reliabilityOf(db, vendor)` → `{ accepted, lateReleases, rate }`. accepted = bookings the vendor holds/finished after accepting (`acceptedByCurrentVendor`) + their releases; rate = (accepted − late) ÷ accepted, whole %, `null` ("New") until 5 accepted. No stored counters, no penalty, no auto-suspension.
- Backend `ReliabilityService` counts the same in SQL and sends `Vendor.acceptedJobs` / `lateReleases` (vendor's own app can't see bookings it released); the mock counts from its bookings. Customers never get the totals.
- Shown: admin vendor list ("Completion" column) and vendor page (stat card), red below `RELIABILITY_LOW` (85); vendor's own profile; vendor picker rows.
- Ranking: `suggestVendors` / `VendorMatcher` add `reliabilityPenalty(rate)` = 0.2 per point below 100 (nothing while "New").

## Screens
- Vendor: `components/ReleaseSheets.tsx` (`ReleaseSheet` says early vs late up front; `IssueSheet`), buttons under the slider on the job screen, banner while a report is open, completion-rate card on Profile.
- Customer: tracker back at "Finding a professional" with "Your professional couldn't make it — we're finding another one. Your slot stays the same."; immediate `professional_released` WhatsApp/push.
- Admin: dashboard "Needs attention" rows (urgent, released, on-site problems); assignment queue sorted `byUrgencyThenSchedule` with Urgent/Released badges; Bookings tab "Released / reported"; booking page banner, decision panel (return visit, mark handled, call, cancel) and "Releases" history panel.

## API
`POST /vendor/jobs/{id}/decline` (reason optional) · `/release` `{reason, note}` · `/issue` `{kind, reason, note}` · `POST /admin/bookings/{id}/issue/resolve` `{note}` · `/return-visit` `{date, slot}`.

## Extra-work quotes on normal bookings (2026-10-10)
- A booking's quote thread (`Booking.inspection`) now has `kind`: `not_sure` (default; customer chose "Other / Not sure") or `extra_work` (vendor found more work on a normal booking). Helpers in `inspection.ts`: `isNotSure`, `isExtraWork`, `canQuoteExtraWork` (no thread yet + arrived/in progress), `canShareQuote`.
- `vendor.shareQuote` on a booking with no thread creates an `extra_work` thread (fee 0, description empty) and quotes in one step. Approval adds the quote to the booked items (`inspectionServiceAmount` = items + approved quote); decline leaves the booked price, and a revised quote is allowed. One open quote at a time; completion and payment wait for the answer, as for "Not sure". "No repair needed" is "Not sure" only.
- This is the "revised quote" outcome for "Can't complete → Bigger problem than booked"; the report sheet points to it.
- Backend: `V6__extra_work_quotes.sql` (`booking_inspections.kind`), `Inspection.kind`, `VendorJobService.shareQuote`, wording in `NotifyFor` / `BookingLabels` ("Extra work"). Snapshot/mock DB version 12 (13 since Q&A was removed). Tests: `ExtraWorkQuoteIT` (3), `packages/shared/test/extra-work.test.ts` (5).
- UI: `InspectionPanel` and `QuoteSheet` word themselves by kind; vendor job screen has a "Found more work than was booked?" card on site; on a "Not sure" job at the door "Share quote" is also in the bottom bar (the panel button sits below the fold on phones). Lists label it "Extra work · …"; the admin "Not sure" tab excludes extra-work threads.
- Anything that means "Not sure booking" must use `isNotSure(b)`, not `!!b.inspection`.

## Share quote: same for every service, only after start (2026-10-10)
- `canQuote` / `canQuoteExtraWork` (and `BookingCore` in Java) are true only at `in_progress` — not at the door. Error: `QUOTE_ERRORS.notStarted` "Share a quote after you start the service"; "No repair needed" before start: `noWorkNotStarted` "Start the service and inspect first".
- Vendor job screen: one "Share a quote" card with a "Share quote" button (or "Share revised quote" after a decline) for "Not sure" and normal jobs alike, shown when `canShareQuote(job)`. The at-the-door bottom-bar button, the panel's own button and the "Found more work than was booked?" card are gone. `QuoteSheet` is titled "Share quote" for both.
- "Not sure" at the door now reads "Start the service with the customer's code, then inspect and share a quote."
- Tests that quote must start the job first (start code) and clear the demo vendor's other in-progress jobs.
