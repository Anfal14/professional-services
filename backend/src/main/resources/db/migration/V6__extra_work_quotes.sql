/*
 * A quote thread on a booking is now one of two kinds (QuoteKind in types.ts):
 *  - not_sure: the customer chose "Other / Not sure" — inspection visit, then a quote that replaces the fee;
 *  - extra_work: a normal booking where the professional found more work on site — a quote added
 *    on top of the booked work (fee 0).
 */

ALTER TABLE booking_inspections
  ADD COLUMN kind text NOT NULL DEFAULT 'not_sure' CHECK (kind IN ('not_sure', 'extra_work'));
