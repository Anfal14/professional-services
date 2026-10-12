# Vendor job safeguards

Rules and messages live in `packages/shared/src/job.ts`, mirrored by `backend/.../bookings/VendorJobRules.java`. Both are tested with the same cases (`packages/shared/test/vendor-job.test.ts`; `VendorJobRulesTest`, `VendorJobIT`).

## 1. Start code
- `Booking.startCode`: 4 digits, created when the status becomes `arrived` (vendor step or admin override — mock `withStartCode`, backend `BookingCore.moveTo`). Kept if the arrival/start is undone.
- Customer app: card with the code on the booking page while `arrived`; also in the `vendor_arrived` notification. Admin booking page shows it under "Change status" (for reading to the customer only).
- **Never sent to the vendor**: backend uses `ApiMapper.bookingForVendor` for every vendor response and the vendor snapshot. The mock holds everything in one local DB, so the vendor app shows a "Demo mode: the code is …" hint only when `backend.kind === 'mock'`.
- `vendor.advanceJob(vendorId, bookingId, { startCode })` → `POST /vendor/jobs/{id}/advance` body `{ startCode }` (body optional for other steps). Wrong code: counted (`startCodeAttempts`; backend counts in a `REQUIRES_NEW` transaction since the request fails), 5 wrong codes lock the job — only support can start it (`admin.setBookingStatus(id, 'in_progress')`, unchanged), which also resets the count.

## 2. After photo
- `Booking.afterPhotos` (new) vs `proofPhotos` (= "before", optional). `vendor.addProofPhoto(vendorId, bookingId, uri, kind = 'before' | 'after')` → `POST …/proof` body `{ uri, kind }`. Max 6 of each.
- Completing needs ≥ 1 after photo (vendor path only; the admin override is exempt). Use `afterPhotosOf(b)` — the field can be missing in an old cached snapshot.

## 3. Slide to confirm + undo
- `SlideToConfirm` (packages/ui): drag the thumb ≥ 85% of the track; a tap does nothing. Screen readers get an `activate` action; on web Enter/Space on the focused control confirms. Its gesture handlers are created once and read props through a ref (the job screen re-renders 4×/s during the undo countdown — recreating them dropped drags), travel distance is measured at drag start, and confirmation never waits on an animation.
- Vendor job screen: slide for start travel / arrived / start service / complete; Accept and Decline stay buttons (a choice, not a step). After any step (including Accept) an "Undo (Ns)" bar shows for `UNDO_WINDOW_MS` (10 s, this device's clock).
- `vendor.undoStep` → `POST /vendor/jobs/{id}/undo`. Allowed (`undoableStep` / `VendorJobRules.undoTarget`) only if the step is the booking's very last timeline event, made by the vendor, within 10 s (+5 s server grace), and a completed job isn't paid/pending/reviewed. Effect: status back one step, timeline event `step_undone` ("Undid “Arrived”"), `jobsCompleted` restored, and the step's customer notifications (`vendor_on_the_way`, `vendor_arrived`, `service_completed`) removed.
- Backend sends vendor-step messages late: `BookingCore.commit(b, drafts, VendorJobRules.NOTIFY_AFTER)` sets the outbox rows' `next_attempt_at` 20 s ahead; undo calls `NotificationService.retract`, which deletes the notifications and (by FK cascade) their unsent outbox rows. In-app notifications still appear immediately.

## 4. One job in progress
- Starting (`arrived → in_progress`) is refused while the vendor has another booking `in_progress` (`otherJobInProgress`; backend `findFirstByVendorIdAndStatusAndIdNot`). Vendor screen shows a banner linking to that job and locks the slider. Admin override is not restricted.

## Data
- `V4__vendor_job_safeguards.sql`: `bookings.start_code`, `start_code_attempts`, table `booking_after_photos`, partial index on in-progress jobs; backfills a code for bookings already `arrived`. Snapshot/mock DB version 10. New booking event kind `step_undone`, notification kind `vendor_arrived`.
- Customer mock "Simulate next update" adds a demo after photo and passes the code (falls back to the admin override if the demo vendor is busy).
