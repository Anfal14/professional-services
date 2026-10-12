# 2026-10-10 — Vendors can release a job after accepting

## Request
Let vendors release a job after accepting it (never cancel it): back to "awaiting assignment" with the vendor removed, manual reassignment, a reason from a short list recorded on the timeline. Stage rules (decline / early release / late release → urgent / on-site reports instead of release), a completion rate from booking history (only late releases count; "New" under 5 accepted; red below 85%; used in ranking; no auto-suspension), immediate customer notice, and admin visibility. Mock + Spring Boot, with tests.

## Implementation
See `features/job-release.md`. Shared `release.ts` ↔ `ReleaseRules.java`; `ReliabilityService`; V5 migration; DB version 10 → 11; vendor `ReleaseSheets`; admin dashboard / queue / booking page / vendor pages; customer tracker wording.

## Decisions not in the request
- An on-site report keeps the job with the vendor; if the vendor simply carries on (e.g. the customer turns up) the report closes itself.
- Admin gets "Arrange return visit" (same vendor, new slot, back to Accepted) and "Mark as handled" (with a note). A revised quote on a non-inspection booking has no price-change mechanism yet, so it is recorded with "Mark as handled".
- A slot that has already passed counts as late.
- The customer is not shown the vendor's reason, the release history or on-site reports (stripped by the backend and hidden in the app).
- A release drops any unanswered inspection quote made by that vendor (as an admin unassign does).
- Ranking penalty: 0.2 score points per percentage point below 100% (80% ≈ one extra job of workload).
- The old "% completion" hint on the admin vendor page (done ÷ all jobs) was replaced by the new completion rate.

## Verification
- Backend: 34 unit + 29 integration tests pass (new `ReleaseRulesTest` 7, `ReleaseIT` 5).
- `npm test`: 35 pass (13 new for release rules and the mock).
- Typecheck + lint clean.
- Browser on the real backend: early release from the vendor app (reason required; customer page showed "couldn't make it… slot stays the same" with no reason leaked); late release while on the way ("Other" needed a note; totals went 25/0 → 26/1, profile 96%); on-site "Customer not available" report; admin dashboard showed 1 urgent / 2 released / 1 on-site problem; urgent job at the top of the assignment queue; booking page showed the urgent banner, "Late release" history and timeline note; return visit put the job back to Accepted on the new slot; vendor list and page showed 96% (1 late of 26).
- Not exercised in the browser: a late release by time alone (≤ 2 h before the slot) — covered by unit tests on both sides; the red (< 85%) styling, since no vendor is that low in the data.

## Remaining
Not committed. Test bookings left in the dev DB: PFJQNA30 (released early), PFJRQ3NG (released late, urgent), PF2T89NF (return visit on 14 Oct).
