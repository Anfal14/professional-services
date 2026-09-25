# QuickJob

On-demand home services app (AC repair, electrician, plumber, cleaning, painting, carpentry, pest control, appliance repair) for **Web, Android and iOS**, built with Expo SDK 57, Expo Router and TypeScript.

## Run it

```bash
npm install
npm run web        # browser
npm run android    # Android emulator / Expo Go
npm run ios        # iOS simulator (macOS) / Expo Go
```

Quality checks:

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

Production web build: `npm run build:web` (outputs `dist/`). Native store builds: `npx eas-cli@latest build`.

## Screens (`src/app`)

| Route | Screen |
| --- | --- |
| `/` | Hero with search and trust badges, stats, service grid, how it works, testimonials, WhatsApp CTA |
| `/services?q=` | All services with live search |
| `/service/[id]` | Service details, selectable issue cards with prices, sticky "Book Now" |
| `/book/[id]?issue=` | Booking form: name, contact, address, landmark (optional), issue dropdown, date, time slot |
| `/success?id=` | Animated confirmation with a WhatsApp acknowledgement preview and a "Send to WhatsApp" button |
| `/bookings` | My Bookings with status badges (Confirmed, In Progress, Completed, Cancelled), filters and cancel |
| `/about`, `/contact` | Company story and values; contact channels, WhatsApp contact form, FAQ |

## Project structure

```
src/
  app/          routes (Expo Router)
  components/   reusable UI: Navbar, BottomNav, Screen, Button, ServiceCard, IssueCard,
                StatusBadge, SearchBar, TrustBadges, Grid, FadeIn, PressableScale, form/*
  context/      BookingsContext (app-wide booking state)
  services/     bookingsApi.ts: persistence layer (swap for real HTTP calls)
  data/         service catalogue, issues, prices, images
  theme/        colours, typography, spacing, radii, shadows
  utils/        formatting, validation, WhatsApp helpers
  config.ts     business details (WhatsApp number, phone, email, address)
```

## Before going live

- **Business details:** set your WhatsApp Business number, phone, email and address in `src/config.ts`. The current values are placeholders.
- **Backend:** bookings are stored on the device (AsyncStorage). To store them on a server, change the three functions in `src/services/bookingsApi.ts`. Nothing else in the app needs to change.
- **Booking status:** on the device, a booking shows as *In Progress* once its time slot starts and *Completed* two hours later. With a backend, the server should set these statuses instead.
- **WhatsApp:** the success screen opens `wa.me` with the booking details already filled in. To have the confirmation message sent to the customer automatically, connect the WhatsApp Business API on your backend.
- **Images** are free-licence photos from Unsplash, loaded from `images.unsplash.com`. To serve them yourself, download them into `assets/` and update `src/data/services.ts`.
