# Admin panel

**Where:** `apps/admin/src`. `useAdmin()` + shell/table components in `components/admin.tsx`.

- Email/password login; roles gate pages and actions via `can(admin, perm)`.
- Dashboard KPIs + charts (`@profecian/ui` Charts, data from `shared/analytics.ts`).
- Bookings list/detail (status, cancel, reassign); `assign` queue with `VendorPicker` (`suggestVendors`).
- Vendors: approve/reject, KYC doc verification, categories, performance. Users: block/unblock, history.
- Services: categories + problem types fully editable (`ServiceForms.tsx`: commission, pricing model, icon).
- Payments: transactions, commission, payouts/settlements, reports. Reviews moderation + complaints. Analytics: revenue trend, top services/vendors, city-wise, payment mix. Notifications log. Settings (GST, cities, reminders, reset demo).
