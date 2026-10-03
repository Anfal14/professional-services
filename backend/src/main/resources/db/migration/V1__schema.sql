-- Profecian schema. Mirrors packages/shared/src/types.ts; ids are text so they match the apps and the seed.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

/* ───────────── Settings ───────────── */

CREATE TABLE platform_settings (
  id                     smallint PRIMARY KEY CHECK (id = 1),
  tax_rate               numeric(6,4) NOT NULL,
  default_commission_rate numeric(6,4) NOT NULL,
  default_inspection_fee integer      NOT NULL,
  whatsapp_number        text         NOT NULL,
  support_phone          text         NOT NULL,
  updated_at             timestamptz  NOT NULL DEFAULT now(),
  version                bigint       NOT NULL DEFAULT 0
);

CREATE TABLE platform_cities (
  name       text PRIMARY KEY,
  position   integer NOT NULL,
  lat        double precision,
  lng        double precision
);

/* ───────────── Catalogue ───────────── */

CREATE TABLE service_categories (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  tagline         text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  icon            text NOT NULL,
  image           text NOT NULL DEFAULT '',
  tint            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  popular         boolean NOT NULL DEFAULT false,
  commission_rate numeric(6,4) NOT NULL,
  inspection_fee  integer,
  sort_order      integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  version         bigint NOT NULL DEFAULT 0
);

CREATE TABLE category_includes (
  category_id text    NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  text        text    NOT NULL,
  PRIMARY KEY (category_id, position)
);

CREATE TABLE problem_types (
  id            text PRIMARY KEY,
  category_id   text NOT NULL REFERENCES service_categories(id),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  icon          text NOT NULL,
  price         numeric(12,2) NOT NULL CHECK (price >= 0),
  pricing_model text NOT NULL CHECK (pricing_model IN ('fixed','starting_at','inspection')),
  duration_mins integer NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,
  version       bigint NOT NULL DEFAULT 0
);
CREATE INDEX problem_types_category_idx ON problem_types (category_id);

/* ───────────── People ───────────── */

CREATE TABLE customers (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  phone      text NOT NULL UNIQUE,
  email      text,
  city       text NOT NULL,
  blocked    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  version    bigint NOT NULL DEFAULT 0
);

CREATE TABLE customer_addresses (
  id          text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       text NOT NULL CHECK (label IN ('Home','Work','Other')),
  line        text NOT NULL,
  landmark    text,
  city        text NOT NULL,
  pincode     text,
  lat         double precision,
  lng         double precision,
  location    geography(Point, 4326) GENERATED ALWAYS AS (
                CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
                     ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography END) STORED,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_addresses_customer_idx ON customer_addresses (customer_id);

CREATE TABLE vendors (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  phone            text NOT NULL UNIQUE,
  email            text,
  photo            text,
  city             text NOT NULL,
  status           text NOT NULL CHECK (status IN ('pending','approved','rejected','suspended')),
  available        boolean NOT NULL DEFAULT false,
  rating           numeric(2,1) NOT NULL DEFAULT 0,
  rating_count     integer NOT NULL DEFAULT 0,
  jobs_completed   integer NOT NULL DEFAULT 0,
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,
  location         geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  kyc_submitted_at timestamptz,
  rejection_reason text,
  version          bigint NOT NULL DEFAULT 0
);
CREATE INDEX vendors_status_idx ON vendors (status);
CREATE INDEX vendors_location_idx ON vendors USING gist (location);

CREATE TABLE vendor_categories (
  vendor_id   text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  category_id text NOT NULL REFERENCES service_categories(id),
  PRIMARY KEY (vendor_id, position)
);
CREATE INDEX vendor_categories_category_idx ON vendor_categories (category_id);

CREATE TABLE vendor_service_areas (
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  position  integer NOT NULL,
  area      text NOT NULL,
  PRIMARY KEY (vendor_id, position)
);

CREATE TABLE vendor_working_hours (
  vendor_id  text PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time   text NOT NULL,
  -- 0 = Sunday … 6 = Saturday
  days       text NOT NULL
);

CREATE TABLE vendor_kyc_documents (
  vendor_id   text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('aadhaar','pan','driving_license','selfie','bank_proof')),
  number      text,
  image_key   text,
  status      text NOT NULL CHECK (status IN ('missing','pending','verified','rejected')),
  note        text,
  uploaded_at timestamptz,
  PRIMARY KEY (vendor_id, type)
);

CREATE TABLE vendor_bank_accounts (
  vendor_id           text PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  holder_name         text NOT NULL,
  account_last4       text NOT NULL,
  -- Full account number, encrypted at rest (null for seeded demo vendors).
  account_number_enc  text,
  ifsc                text NOT NULL,
  bank_name           text NOT NULL,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  role          text NOT NULL CHECK (role IN ('super_admin','operations','finance','support')),
  password_hash text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

/* ───────────── Bookings ───────────── */

CREATE TABLE bookings (
  id               text PRIMARY KEY,
  code             text NOT NULL UNIQUE,
  customer_id      text NOT NULL REFERENCES customers(id),
  customer_name    text NOT NULL,
  customer_phone   text NOT NULL,
  category_id      text NOT NULL REFERENCES service_categories(id),
  problem_type_id  text REFERENCES problem_types(id),
  date             date NOT NULL,
  slot             text NOT NULL,
  -- Address snapshot at booking time (the saved address may change later).
  address_id       text,
  address_label    text NOT NULL,
  address_line     text NOT NULL,
  address_landmark text,
  address_city     text NOT NULL,
  address_pincode  text,
  address_lat      double precision,
  address_lng      double precision,
  address_location geography(Point, 4326) GENERATED ALWAYS AS (
                     CASE WHEN address_lat IS NULL OR address_lng IS NULL THEN NULL
                          ELSE ST_SetSRID(ST_MakePoint(address_lng, address_lat), 4326)::geography END) STORED,
  notes            text,
  status           text NOT NULL CHECK (status IN ('pending_assignment','assigned','accepted','on_the_way','arrived','in_progress','completed','cancelled')),
  vendor_id        text REFERENCES vendors(id),
  service_amount   numeric(12,2) NOT NULL,
  tax              numeric(12,2) NOT NULL,
  total            numeric(12,2) NOT NULL,
  commission_rate  numeric(6,4)  NOT NULL,
  commission       numeric(12,2) NOT NULL,
  vendor_payout    numeric(12,2) NOT NULL,
  payment_method   text CHECK (payment_method IN ('upi','card','netbanking','wallet','cash')),
  payment_status   text NOT NULL CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  paid_at          timestamptz,
  txn_id           text,
  failure_reason   text,
  cancel_reason    text,
  review_id        text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          bigint NOT NULL DEFAULT 0
);
CREATE INDEX bookings_customer_idx ON bookings (customer_id, created_at DESC);
CREATE INDEX bookings_vendor_date_idx ON bookings (vendor_id, date);
CREATE INDEX bookings_status_idx ON bookings (status);
CREATE INDEX bookings_date_idx ON bookings (date);
CREATE INDEX bookings_category_idx ON bookings (category_id);
CREATE INDEX bookings_created_idx ON bookings (created_at);

CREATE TABLE booking_items (
  booking_id      text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  problem_type_id text NOT NULL REFERENCES problem_types(id),
  name            text NOT NULL,
  price           numeric(12,2) NOT NULL,
  PRIMARY KEY (booking_id, position)
);
CREATE INDEX booking_items_problem_idx ON booking_items (problem_type_id);

CREATE TABLE booking_events (
  id         bigserial PRIMARY KEY,
  booking_id text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position   integer NOT NULL,
  kind       text NOT NULL,
  at         timestamptz NOT NULL,
  by_role    text NOT NULL CHECK (by_role IN ('customer','vendor','admin','system')),
  note       text,
  UNIQUE (booking_id, position)
);

CREATE TABLE booking_proof_photos (
  booking_id text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position   integer NOT NULL,
  file_ref   text NOT NULL,
  PRIMARY KEY (booking_id, position)
);

/* "Other / Not sure" requests (1:1 with a booking). */
CREATE TABLE booking_inspections (
  booking_id         text PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  description        text NOT NULL,
  fee                integer NOT NULL,
  status             text NOT NULL CHECK (status IN ('pending','quoted','approved','declined','no_work_needed')),
  awaiting_customer  boolean NOT NULL DEFAULT false,
  no_work_note       text,
  quote_amount       numeric(12,2),
  quote_note         text,
  quote_vendor_id    text REFERENCES vendors(id),
  quote_created_at   timestamptz,
  quote_responded_at timestamptz,
  quote_responded_by text CHECK (quote_responded_by IN ('customer','admin'))
);

CREATE TABLE inspection_photos (
  booking_id text NOT NULL REFERENCES booking_inspections(booking_id) ON DELETE CASCADE,
  position   integer NOT NULL,
  file_ref   text NOT NULL,
  PRIMARY KEY (booking_id, position)
);

CREATE TABLE inspection_quote_lines (
  booking_id  text NOT NULL REFERENCES booking_inspections(booking_id) ON DELETE CASCADE,
  position    integer NOT NULL,
  description text NOT NULL,
  amount      numeric(12,2) NOT NULL,
  PRIMARY KEY (booking_id, position)
);

CREATE TABLE inspection_messages (
  id          text PRIMARY KEY,
  booking_id  text NOT NULL REFERENCES booking_inspections(booking_id) ON DELETE CASCADE,
  position    integer NOT NULL,
  from_role   text NOT NULL CHECK (from_role IN ('customer','vendor','admin')),
  author_name text NOT NULL,
  text        text NOT NULL,
  at          timestamptz NOT NULL
);
CREATE INDEX inspection_messages_booking_idx ON inspection_messages (booking_id, position);

/* ───────────── Reviews & complaints ───────────── */

CREATE TABLE reviews (
  id            text PRIMARY KEY,
  booking_id    text NOT NULL UNIQUE REFERENCES bookings(id),
  customer_id   text NOT NULL REFERENCES customers(id),
  customer_name text NOT NULL,
  vendor_id     text NOT NULL REFERENCES vendors(id),
  category_id   text NOT NULL REFERENCES service_categories(id),
  rating        integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text          text NOT NULL DEFAULT '',
  status        text NOT NULL CHECK (status IN ('published','hidden','flagged')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_vendor_idx ON reviews (vendor_id, status);
CREATE INDEX reviews_category_idx ON reviews (category_id, status);

CREATE TABLE review_images (
  review_id text NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  position  integer NOT NULL,
  file_ref  text NOT NULL,
  PRIMARY KEY (review_id, position)
);

CREATE TABLE complaints (
  id          text PRIMARY KEY,
  booking_id  text NOT NULL REFERENCES bookings(id),
  customer_id text NOT NULL REFERENCES customers(id),
  vendor_id   text REFERENCES vendors(id),
  subject     text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL CHECK (status IN ('open','in_progress','resolved')),
  resolution  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX complaints_status_idx ON complaints (status);

/* ───────────── Money ───────────── */

CREATE TABLE payouts (
  id         text PRIMARY KEY,
  vendor_id  text NOT NULL REFERENCES vendors(id),
  amount     numeric(12,2) NOT NULL,
  status     text NOT NULL CHECK (status IN ('pending','processing','settled','failed')),
  utr        text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  version    bigint NOT NULL DEFAULT 0
);
CREATE INDEX payouts_vendor_idx ON payouts (vendor_id, created_at DESC);

CREATE TABLE payout_bookings (
  payout_id  text NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  position   integer NOT NULL,
  booking_id text NOT NULL REFERENCES bookings(id),
  PRIMARY KEY (payout_id, position)
);
CREATE INDEX payout_bookings_booking_idx ON payout_bookings (booking_id);

/* Commission / earning / settlement records for the admin payments page. */
CREATE TABLE ledger_entries (
  id         bigserial PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('customer_payment','platform_commission','vendor_earning','cash_commission_due','payout_settled')),
  booking_id text REFERENCES bookings(id),
  vendor_id  text REFERENCES vendors(id),
  payout_id  text REFERENCES payouts(id),
  amount     numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_vendor_idx ON ledger_entries (vendor_id, created_at);
CREATE INDEX ledger_entries_booking_idx ON ledger_entries (booking_id);

CREATE TABLE payment_attempts (
  id              text PRIMARY KEY,
  booking_id      text NOT NULL REFERENCES bookings(id),
  provider        text NOT NULL,
  method          text NOT NULL,
  amount          numeric(12,2) NOT NULL,
  status          text NOT NULL CHECK (status IN ('created','succeeded','failed')),
  provider_ref    text,
  failure_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_attempts_booking_idx ON payment_attempts (booking_id);
CREATE UNIQUE INDEX payment_attempts_provider_ref_idx ON payment_attempts (provider, provider_ref) WHERE provider_ref IS NOT NULL;

/* Replays of the same client request (Idempotency-Key header) return the first response. */
CREATE TABLE idempotency_keys (
  key           text NOT NULL,
  principal     text NOT NULL,
  request_hash  text NOT NULL,
  status_code   integer,
  response_body text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (principal, key)
);

CREATE TABLE webhook_events (
  provider    text NOT NULL,
  event_id    text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

/* ───────────── Notifications ───────────── */

CREATE TABLE notifications (
  id           text PRIMARY KEY,
  audience     text NOT NULL CHECK (audience IN ('customer','vendor','admin')),
  recipient_id text NOT NULL,
  kind         text NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  channels     text NOT NULL,
  booking_id   text REFERENCES bookings(id) ON DELETE SET NULL,
  whatsapp_url text,
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_idx ON notifications (audience, recipient_id, created_at DESC);

/* Transactional outbox: rows are written with the business change and delivered by a scheduled worker. */
CREATE TABLE outbox (
  id              bigserial PRIMARY KEY,
  notification_id text REFERENCES notifications(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('push','whatsapp','sms')),
  destination     text NOT NULL,
  payload         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','dead')),
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);
CREATE INDEX outbox_due_idx ON outbox (next_attempt_at) WHERE status = 'pending';

CREATE TABLE push_tokens (
  token      text PRIMARY KEY,
  audience   text NOT NULL,
  owner_id   text NOT NULL,
  platform   text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_owner_idx ON push_tokens (audience, owner_id);

/* ───────────── Auth & files ───────────── */

CREATE TABLE refresh_tokens (
  id         text PRIMARY KEY,
  role       text NOT NULL CHECK (role IN ('customer','vendor','admin')),
  subject_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_subject_idx ON refresh_tokens (role, subject_id);

CREATE TABLE stored_files (
  key          text PRIMARY KEY,
  owner_role   text NOT NULL,
  owner_id     text NOT NULL,
  content_type text NOT NULL,
  size_bytes   bigint NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
