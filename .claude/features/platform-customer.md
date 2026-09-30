# Customer app

**Where:** `apps/customer/src`. Hook `useCustomer()` in `src/backend.ts`.

- **Auth:** `/login` (OtpLogin + Google demo) → new numbers go to `/profile-setup`. `AuthContext` adapts the customer record; provider stored at `@profecian/customer/auth-provider`. Guarded screens redirect to `/login?next=`.
- **Home:** categories, search, popular services, Recent bookings; catalogue from DB via `useCatalog()`.
- **Cart:** service page problems are multi-select checkboxes (`IssueCard`) toggling `CartContext` (`@profecian/customer/cart/v1`). Navbar `CartButton` (badge) replaced the bookings shortcut (Bookings stays in bottom nav + avatar menu). `/cart` groups by service (`groupCart` in `data/services.ts`), picks one date/slot, address (`LocationSheet checkout`), contact → one `createBooking({problemTypeIds})` per service → `/success?id=&more=`.
- **Location:** `LocationContext` selection = city | current (expo-location) | saved address id (`@profecian/location/v2`). `LocationHeader` two-line top bar (mobile replaces the logo). `LocationSheet` (use current location, add/edit/delete addresses via `AddressSheet`, city fallback). `/settings` = theme + addresses.
- **Manage:** `/bookings` tabs Upcoming/History/Cancelled; `/booking/[id]` live tracker (compact < 520px), "Simulate next update" demo, professional card, reschedule/cancel sheets (`canCustomerModify`), PaySheet (UPI/card/netbanking/wallet or cash, failure toggle), ReviewCard (rating/text/photos), complaint sheet, timeline.
- **2026-09-30:** service page has `ServiceReviews` + fixed promises; dates via chips + `CalendarSheet` (60 days); footer web-only (menu has Settings/About/Contact); booking page shows total Inc. GST only; support = phone call.
- **Invoice:** `/invoice/[id]` (paid only), CGST/SGST split, print on web.
- **Notifications:** `/notifications`, unread badge in the `NavAvatar` menu. **Account:** edit profile, saved addresses.
