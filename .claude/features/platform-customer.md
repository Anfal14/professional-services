# Customer app

**Where:** `apps/customer/src`. Hook `useCustomer()` in `src/backend.ts`.

- **Auth:** `/login` (OtpLogin + Google demo) → new numbers go to `/profile-setup`. `AuthContext` adapts the customer record; provider stored at `@profecian/customer/auth-provider`. Guarded screens redirect to `/login?next=`.
- **Home:** categories, search, popular services, Recent bookings; catalogue from DB via `useCatalog()`.
- **Book:** `/book/[id]` prefilled from profile/saved address, service + GST summary → `createBooking` → `/success` (WhatsApp ack from the notification).
- **Manage:** `/bookings` tabs Upcoming/History/Cancelled; `/booking/[id]` live tracker (compact < 520px), "Simulate next update" demo, professional card, reschedule/cancel sheets (`canCustomerModify`), PaySheet (UPI/card/netbanking/wallet or cash, failure toggle), ReviewCard (rating/text/photos), complaint sheet, timeline.
- **Invoice:** `/invoice/[id]` (paid only), CGST/SGST split, print on web.
- **Notifications:** `/notifications`, unread badge in the `NavAvatar` menu. **Account:** edit profile, saved addresses.
