# Booking Flow

## Purpose
Collect booking details, create a booking, show confirmation with WhatsApp acknowledgement.

## Status
Completed (on-device storage only).

## Relevant Files (`QuickJob/src/`)
- `app/book/[id].tsx` — form: name, phone (+91), address (multiline), landmark (optional), issue `SelectField`, `DateSelector`, `TimeSlotSelector`, submit. Desktop two-column with summary card.
- `app/success.tsx` — animated check, details, `WhatsAppPreview`, "Send confirmation to WhatsApp".
- `components/form/*` — `FieldShell`, `TextField`, `SelectField`, `DateSelector`, `TimeSlotSelector`.
- `components/WhatsAppPreview.tsx`.
- `utils/validation.ts` — `validateBooking`, `normalizePhone`, `isValidPhone`.
- `utils/format.ts` — `upcomingDays`, `TIME_SLOTS`, `isSlotAvailable`, `scheduledAt`, `formatDate`, `formatAddress`, `formatPrice`.
- `utils/whatsapp.ts` — `buildAcknowledgement`, `whatsappUrl`, `openWhatsApp`.
- `services/bookingsApi.ts`, `context/BookingsContext.tsx`.

## Architecture
Form state local; errors computed on submit, then live after first submit. Changing date clears a slot that becomes unavailable. `addBooking` → `bookingsApi.createBooking` → navigate `router.replace('/success?id=…')`.

## Data Model
`Booking = BookingInput + { id ('QJ' + base36), status, price (issue price or service startingPrice), createdAt }`. Stored as array under AsyncStorage `@quickjob/bookings/v1`, newest first.

## API
None. WhatsApp: `https://wa.me/<APP_CONFIG.whatsappNumber>?text=…`.

## Constraints
- `bookingsApi.ts` is the single persistence boundary.
- Keep validation rules in `utils/validation.ts` (also reused by Contact form).

## Known Issues
No server-side validation or dedup; WhatsApp message is user-initiated, not auto-sent.

## Future Work
Backend API + WhatsApp Business API; OTP phone verification.

## Last Important Change
2026-09-25 — initial build.
