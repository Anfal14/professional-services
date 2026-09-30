# Context Index

## System context
| File | Covers |
| --- | --- |
| `MEMORY.md` | Summary, demo accounts, constraints, repo state |
| `ARCHITECTURE.md` | Monorepo layout, mock backend, data flow, routes |
| `DECISIONS.md` | Decisions to preserve |
| `INSTRUCTIONS.md` | Operating rules (imported by `CLAUDE.md`) |

No `DATABASE.md`/`API.md`: the data model is `packages/shared/src/types.ts`, the API surface is `packages/shared/src/mock.ts`.

## Features
| Feature | Context file | Status |
| --- | --- | --- |
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
