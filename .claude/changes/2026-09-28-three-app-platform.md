# 2026-09-28 — Three-app platform (customer, vendor, admin)

## Request
Full customer-journey platform: customer app, admin web panel, vendor app, notifications (WhatsApp acks), payments with automatic commission/payout. User answers: backend undecided → frontend flow only; monorepo with 3 apps; third parties stubbed.

## Implementation
- Repo converted to npm workspaces; `QuickJob/` → `apps/customer` (copy + `git rm --cached`, the folder was locked).
- New `packages/shared` and `packages/ui`; new `apps/vendor`, `apps/admin`.
- Customer app rewired from its own `*Api.ts` modules to the shared backend and extended (OTP, profile, tracking, payments, reviews, invoice, notifications). Deleted `services/bookingsApi.ts`, `services/authApi.ts`.
- Root `README.md` and `CLAUDE.md` updated.

## Database changes
Storage keys now `@profecian/<app>/db/v4` and `/session/v1`; old `@quickjob/*` keys ignored.

## Verification
typecheck + lint clean in all apps; expo-doctor 21/21 ×3; `expo export` web (all) + android/ios (customer, vendor) succeed. Browser-tested admin login/assign/pages; vendor OTP → job workflow → cash; customer OTP → book → WhatsApp ack → tracking → UPI pay → review → invoice → notifications; new-user sign-up.

## Remaining
Not committed. Choose backend; real OTP/WhatsApp Business/payment gateway; shared state across apps; push notifications; delete the stale `professional-services/QuickJob/` folder.
