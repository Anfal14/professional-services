# 2026-10-10 — Quote option for vendors

## Request
"quote option for vendor is not showing". Asked which case; answer: both — add quotes on regular jobs, and make "Share quote" more visible on "Not sure" jobs at the door.

## Findings
The option existed only for "Not sure" jobs once arrived, and on a phone the button sat in the top panel below the fold (863 px on an 812 px screen). Regular fixed-price jobs had no quote option at all.

## Implementation
See `features/job-release.md` → "Extra-work quotes on normal bookings". Mock + Spring Boot + three apps; V6 migration; DB version 11 → 12.

## Verification
Backend 34 unit + 32 integration tests pass (new `ExtraWorkQuoteIT`); `npm test` 40 pass; typecheck + lint clean. Browser on the real backend: "Not sure" job at the door shows "Share quote" in the bottom bar (646 px); on a regular job the "Quote extra work" card appears only once arrived; sent ₹450 for PFJ87R9E, customer saw the quote with the right wording, approved, total went to ₹884 (₹299 + ₹450 + GST) and the vendor saw "Service amount (incl. extra work) ₹749". Decline and revised-quote paths are covered by tests, not exercised in the browser.

## Remaining
Not committed.
