# Vendor (Partner) app

**Where:** `apps/vendor/src`. Hook `useVendor()` in `src/backend.ts`.

- `index.tsx` routes by status: no session → `login` (OTP); unknown number → `register`; not approved → `onboarding` (Aadhaar, PAN, DL, selfie via PhotoPicker; bank; submit sets `kycSubmittedAt`; rejected docs block submit; demo "Simulate admin approval"); approved → `(tabs)`.
- Tabs: dashboard (today, earnings, availability toggle), jobs (`JobCard`), earnings (wallet via `computeVendorWallet`, payouts, request payout), profile (docs, working hours, service areas, reset demo).
- `job/[id]`: accept/decline, on the way (maps link), arrived, start, complete with proof photos, collect cash; money shown as service amount − commission = you earn.
- `reviews`, `notifications`.

## Home, Jobs tab and job screen (2026-10-10)
- `src/jobGroups.ts` → `groupJobs(mine, today)` is the single definition of the vendor's lists, used by Home and the Jobs tab: `in_progress` (on_the_way / arrived / in_progress — the in-progress one first), `upcoming` (accepted, not started), `new` (assigned; labelled "Assigned"), `today` (everything open scheduled today; overlaps the others), `completed`, `cancelled`.
- Home: no earnings card (earnings live on the Earnings tab). Stat cards are tappable (`StatCard onPress`): Today's jobs / Upcoming / Completed open `/jobs?filter=…`, Rating opens `/reviews`. Sections in order: In progress → Upcoming (3, "See all") → Assigned.
- Jobs tab: filters In progress, Upcoming, Assigned, Today, Completed, Cancelled; honours `?filter=`; default is In progress, else Assigned, else Upcoming.
- Job screen: Call and Navigate are the same small button (124 px wide) in one column — Call beside the customer, Navigate beside the address.
- Collect cash: a sheet where the vendor types the amount received; it must equal the amount due (`cashMatches`, `JOB_ERRORS.cashAmountMismatch`). `vendor.collectCash(vendorId, bookingId, amountReceived)` → `POST /vendor/jobs/{id}/collect-cash` body `{ amount }`; the backend rejects a missing or different amount. No part-payments.
