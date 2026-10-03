# Shared domain, mock backend, UI kit

**Where:** `packages/shared/src`, `packages/ui/src` (file map in `ARCHITECTURE.md`).

- Entities: Customer, Address, Vendor (kyc docs, bank, workingHours, serviceAreas, `kycSubmittedAt`), AdminUser, ServiceCategory (`commissionRate`), ProblemType (`pricingModel` fixed/starting_at/inspection), Booking (`code`, status, `price: PriceBreakdown`, `payment`, `timeline`, proofPhotos, reviewId), Review, Complaint, Payout, AppNotification (`channels`, `whatsappUrl`), PlatformSettings.
- Booking statuses: pending → assigned → accepted → on_the_way → arrived → in_progress → completed (+ cancelled). Vendor advances via `VENDOR_NEXT`.
- Sessions `@profecian/<app>/session/v1`; DB `@profecian/<app>/db/v4`.
- Stubs: `TEST_OTP` 123456; WhatsApp = `wa.me` link stored on the notification; payments sandbox with `simulateFailure`.
- `useAction(fn)` → `{run, pending, error, setError}`; `ApiError` messages are safe to show.
- Wiring a real backend: implement the same `backend` object over HTTP and pass it to `BackendProvider` in each app's `src/backend.ts`.
- **Themes (2026-09-29):** `ui/theme.ts` live tokens + `ThemeProvider` (accent purple/blue × light/dark/system, stored per app). Write styles with `createStyles`; see MEMORY constraints. `Booking.items` holds every problem of a cart visit; `Booking.inspection` holds "Other / Not sure" requests — see `changes/2026-10-02-not-sure-inspection-workflow.md` (`shared/inspection.ts` rules, `ui/Inspection.tsx` panel) — display with `bookingProblemLabel`/`bookingProblemNames`.
