/*
 * Releasing a job after accepting it (release.ts / ReleaseRules.java).
 *  - booking_releases: every release, kept as history — the completion rate is counted from it.
 *  - bookings.urgent: released late and still waiting for a professional.
 *  - bookings.issue_*: an open on-site report ("customer not available", "can't do this job",
 *    "can't complete") waiting for the admin's decision.
 */

ALTER TABLE bookings
  ADD COLUMN urgent            boolean NOT NULL DEFAULT false,
  ADD COLUMN issue_kind        text CHECK (issue_kind IN ('customer_unavailable', 'cant_do', 'cant_complete')),
  ADD COLUMN issue_reason      text CHECK (issue_reason IN ('needs_part', 'bigger_problem', 'safety', 'other')),
  ADD COLUMN issue_note        text,
  ADD COLUMN issue_vendor_id   text,
  ADD COLUMN issue_vendor_name text,
  ADD COLUMN issue_at          timestamptz;

CREATE TABLE booking_releases (
  booking_id  text        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position    integer     NOT NULL,
  vendor_id   text        NOT NULL,
  vendor_name text        NOT NULL,
  reason      text        NOT NULL CHECK (reason IN ('unwell', 'vehicle_problem', 'previous_job_late', 'wrong_service', 'other')),
  note        text,
  late        boolean     NOT NULL,
  at          timestamptz NOT NULL,
  PRIMARY KEY (booking_id, position)
);
CREATE INDEX booking_releases_vendor_idx ON booking_releases (vendor_id);
