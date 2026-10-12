# Context Index

## System context
| File | Covers |
| --- | --- |
| `MEMORY.md` | Summary, demo accounts, constraints, repo state |
| `ARCHITECTURE.md` | Monorepo layout, mock backend, data flow, routes |
| `DECISIONS.md` | Decisions to preserve |
| `INSTRUCTIONS.md` | Operating rules (imported by `CLAUDE.md`) |

Data model: `packages/shared/src/types.ts` (TS) and `backend/src/main/resources/db/migration/` (SQL: V1 schema, V2 multi-city). API: `packages/shared/src/mock.ts` / `http.ts` (client) and Swagger at /swagger-ui.html (server).

## Features
| Feature | Context file | Status |
| --- | --- | --- |
| Spring Boot backend + HTTP client | `features/backend.md` | Done — tests green, e2e verified |
| Job release after accepting (early/late release, on-site reports, completion rate, urgent queue) | `features/job-release.md` | Done |
| Vendor job safeguards (start code, after photo, slide + undo, one job in progress) | `features/vendor-job-safeguards.md` | Done |
| Multi-city (city status, radius, localities, per-city services, admin Cities page) | `features/multi-city.md` | Done |
| Shared domain + mock backend + UI kit + themes | `features/platform-shared.md` | Done (mock) |
| Customer journey (OTP/profile, cart, addresses, booking, tracking, pay, review, invoice, notifications) | `features/platform-customer.md` | Done (mock) |
| Vendor app (OTP, KYC onboarding, jobs workflow, earnings, profile) | `features/platform-vendor.md` | Done (mock) |
| Admin panel (roles, KPIs, users, vendors, services, bookings/assign, payments, reviews, analytics) | `features/platform-admin.md` | Done (mock) |
| Home & discovery (customer) | `features/discovery.md` | Done |
| Booking form (customer) | `features/booking.md` | Partly superseded — see platform-customer |
| My Bookings (customer) | `features/my-bookings.md` | Superseded — see platform-customer |
| Auth (customer) | `features/auth.md` | Superseded — see platform-customer |
| Location picker | `features/location.md` | Superseded — see platform-customer |
| Shell & design system (customer) | `features/ui-shell.md` | Done |
| About & Contact | `features/info-pages.md` | Done |

Older feature files use paths relative to the former `QuickJob/`; that folder is now `apps/customer/`.

## Change records
`changes/` — read only when the task needs history.
