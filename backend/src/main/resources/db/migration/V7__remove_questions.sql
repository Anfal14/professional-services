/*
 * Questions and answers on a booking's quote thread are removed: nobody can ask the customer a
 * question in the app any more, so the stored messages, the "waiting for the customer" flag and
 * the timeline entries and notifications they produced all go.
 */

DROP TABLE IF EXISTS inspection_messages;

ALTER TABLE booking_inspections DROP COLUMN IF EXISTS awaiting_customer;

/* Their outbox rows go with them (ON DELETE CASCADE). */
DELETE FROM notifications WHERE kind IN ('clarification_requested', 'clarification_answered');

DELETE FROM booking_events WHERE kind IN ('clarification_requested', 'clarification_answered');

/* Timeline positions must stay 0, 1, 2 … with no gaps. Shift first so the renumbering can't collide. */
UPDATE booking_events SET position = position + 100000;
UPDATE booking_events e
   SET position = n.new_position
  FROM (SELECT id, row_number() OVER (PARTITION BY booking_id ORDER BY position) - 1 AS new_position FROM booking_events) n
 WHERE n.id = e.id;
