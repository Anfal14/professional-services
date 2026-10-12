# Admin panel

**Where:** `apps/admin/src`. `useAdmin()` + shell/table components in `components/admin.tsx`.

- Email/password login; roles gate pages and actions via `can(admin, perm)`.
- Dashboard KPIs + charts (`@profecian/ui` Charts, data from `shared/analytics.ts`).
- Bookings list/detail (status, cancel, reassign); `assign` queue with `VendorPicker` (`suggestVendors`).
- Vendors: approve/reject, KYC doc verification, categories, performance. Users: block/unblock, history.
- Services: categories + problem types fully editable (`ServiceForms.tsx`: commission, pricing model, icon).
- Payments: transactions, commission, payouts/settlements, reports. Reviews moderation + complaints. Analytics: revenue trend, top services/vendors, city-wise, payment mix. Notifications log. Settings (GST, cities, reminders, reset demo).

## Global search and city filter (2026-10-10)
- **Global search** (`components/GlobalSearch.tsx`): search box in the top bar on wide screens, icon button on narrow ones, Ctrl/Cmd+K anywhere. Searches pages, bookings (code, customer, phone, city, vendor), vendors, users, services (categories + problem types) and cities — only the groups the admin's role can open, 5 results per group, ↑/↓ + Enter. Always platform-wide (ignores the city filter). Mounted only while open so it starts empty.
- **City filter** (`components/cityScope.tsx`): one shared filter (`CityScopeProvider` in the panel layout, remembered in AsyncStorage `@profecian/admin/city-filter/v1`). `scopeDb(db, city)` narrows bookings (address city), vendors (home city), customers (live or booked there), reviews/complaints (their booking's city) and payouts (vendor's city). Sections opt in with `<Page cityFilter>` and read data through `useScopedDb()` / `useScopedLookups()` (which also gives `allDb` and `city`): Dashboard, Bookings, Vendor assignment, Vendors, Users, Payments, Reviews, Analytics. Sidebar badges follow the filter. Not filtered: Services, Cities, Settings, Notifications and all detail pages (`[id]`), which must keep using `useDb()`/`useLookups()`.
- Deliberate exceptions: user booking totals and vendor wallet balances are computed from `allDb` so they stay whole-platform figures.
