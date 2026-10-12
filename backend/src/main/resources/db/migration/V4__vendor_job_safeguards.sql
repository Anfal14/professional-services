/*
 * Safeguards on the professional's job workflow (job.ts / VendorJobRules.java):
 *  - a 4-digit start code, created on arrival, that the customer reads out to start the service;
 *  - "after" photos, at least one of which is needed to complete (booking_proof_photos = "before").
 */

ALTER TABLE bookings
  ADD COLUMN start_code          text CHECK (start_code IS NULL OR start_code ~ '^[0-9]{4}$'),
  ADD COLUMN start_code_attempts integer NOT NULL DEFAULT 0;

-- Professionals who have already arrived are waiting for a code too.
UPDATE bookings SET start_code = lpad(floor(random() * 10000)::int::text, 4, '0') WHERE status = 'arrived';

CREATE TABLE booking_after_photos (
  booking_id text    NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position   integer NOT NULL,
  file_ref   text    NOT NULL,
  PRIMARY KEY (booking_id, position)
);

-- "Only one job in progress per professional" is checked on every start.
CREATE INDEX bookings_vendor_in_progress_idx ON bookings (vendor_id) WHERE status = 'in_progress';
