# Vendor (Partner) app

**Where:** `apps/vendor/src`. Hook `useVendor()` in `src/backend.ts`.

- `index.tsx` routes by status: no session → `login` (OTP); unknown number → `register`; not approved → `onboarding` (Aadhaar, PAN, DL, selfie via PhotoPicker; bank; submit sets `kycSubmittedAt`; rejected docs block submit; demo "Simulate admin approval"); approved → `(tabs)`.
- Tabs: dashboard (today, earnings, availability toggle), jobs (`JobCard`), earnings (wallet via `computeVendorWallet`, payouts, request payout), profile (docs, working hours, service areas, reset demo).
- `job/[id]`: accept/decline, on the way (maps link), arrived, start, complete with proof photos, collect cash; money shown as service amount − commission = you earn.
- `reviews`, `notifications`.
