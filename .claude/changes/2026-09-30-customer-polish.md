# 2026-09-30 — Customer app polish

## Request
Remove arrival time from service banner; replace "Every booking includes" with four fixed promises; calendar for later dates; reviews per service; hide footer in the app; fix check icon overlapping the time slot; booking page shows total "(Inc. GST)" without GST breakdown (bill keeps it); reschedule keeps the last selection; remove WhatsApp card from confirmation; "Need help" uses call instead of WhatsApp.

## Implementation
- `packages/ui/src/Calendar.tsx` (new): `CalendarSheet` month grid (today → +60 days, days without free slots disabled), `CalendarChip`, `hasOpenSlots`; `DateSlotPicker` moved here from widgets (calendar chip, keeps slot if still free on the new date). `dayOption()` added to shared + customer format utils.
- Customer `DateSelector`: chips + "More dates" calendar on every platform (native datetimepicker removed from deps/plugins). `FormCard` `onIconPress` — cart's Visit date icon opens the calendar.
- Service page: no ETA pill, `PROMISES` list, new `ServiceReviews` (average, 5→1 breakdown, latest 3 + show all, photos, first name + initial).
- `Screen`: footer only on web. `NavAvatar` menu opens for signed-out users too and carries Settings / About / Contact.
- Booking detail: problem names + "Total (Inc. GST)"; Need help → Call support; reschedule preselects the current slot, Confirm disabled until changed. Bookings list / success / cart action bar say Inc. GST; cart bill keeps the breakdown. Success page: WhatsApp card removed. Home help CTA → call.

## Verification
typecheck + lint clean; exports customer web+android, admin web, vendor web. Browser: service page (reviews, promises, no ETA), cart calendar (icon + chip, 15 Oct chip), slot check, booking payment card, reschedule preselection. expo-doctor flags 3 newer Expo patch releases (not upgraded).
