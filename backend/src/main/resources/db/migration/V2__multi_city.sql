/*
 * Multi-city: each city gets a launch status, a service radius around its centre, its localities
 * (vendor service areas) and the categories it doesn't offer yet. Mirrors `City` in types.ts.
 */

ALTER TABLE platform_cities
  ADD COLUMN state     text    NOT NULL DEFAULT '',
  ADD COLUMN status    text    NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'coming_soon', 'paused')),
  ADD COLUMN radius_km integer NOT NULL DEFAULT 25 CHECK (radius_km BETWEEN 1 AND 200);

CREATE TABLE platform_city_areas (
  city_name text    NOT NULL REFERENCES platform_cities(name) ON DELETE CASCADE,
  position  integer NOT NULL,
  area      text    NOT NULL,
  PRIMARY KEY (city_name, position)
);

CREATE TABLE platform_city_disabled_categories (
  city_name   text NOT NULL REFERENCES platform_cities(name) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (city_name, category_id)
);

-- Vendor matching now only considers vendors based in the booking's city.
CREATE INDEX vendors_city_idx ON vendors (lower(city));
