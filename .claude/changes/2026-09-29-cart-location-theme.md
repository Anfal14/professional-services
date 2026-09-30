# 2026-09-29 — Cart, address-based location, themes

## Request
Customer: cart (icon in navbar instead of bookings; service problems multi-select into cart); location as current-location picker or given address, multiple addresses, full address in a two-line top bar like Zomato. Whole repo: dark blue theme option and dark mode in settings.

## Implementation
- **Theme:** `packages/ui/src/theme.ts` rewritten (accent × scheme palettes, live tokens, `applyTheme`, `createStyles`, `tintTile`, `accentShade`); new `ThemeProvider.tsx`. Codemod converted every `StyleSheet.create` to `createStyles`; hardcoded colours → tokens (`navBg`, `inputBg`, `inputErrorBg`, `selectedBg`, `accentTint`, `inverse`, `night`). Button palettes became functions. Settings UI: customer `/settings` (avatar menu, account, footer), vendor Profile tab, admin top-bar theme button + Settings page. `userInterfaceStyle: automatic` in all app.json.
- **Shared:** `Booking.items`, `bookingProblemNames/Label`, `createBooking({problemTypeIds})`, `customer.deleteAddress`, `nearestCity`. Vendor/admin show all problems.
- **Customer:** CartContext, CartButton, `/cart`, service page rewrite, success page handles several bookings; LocationContext/locationApi rewrite, LocationHeader, LocationSheet, AddressSheet; removed `/book/[id]`, LocationPill, BookingsButton, BookingForm validation. Added `expo-location` (+ plugin permission text).

## Verification
typecheck + lint clean (all apps); expo-doctor 21/21 (customer); exports: customer web+android, admin web, vendor web. Browser: multi-select → cart (2 services) → add Work address → place 2 bookings → success; theme switch purple/dark blue, light/dark/system persists; admin + vendor dark mode; geolocation denied message and simulated success (Pune).

## Known limits
Theme switch remounts (open sheets close). Web location shows coordinates (no reverse geocoding). Brief light flash while fonts load in dark mode.
