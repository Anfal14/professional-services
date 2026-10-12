/*
 * City-based pricing: a price level per city (% of the base price), an optional city commission
 * rate, and exact prices for single problem types in single cities. Mirrors types.ts / cities.ts.
 */

ALTER TABLE platform_cities
  ADD COLUMN price_level     integer      NOT NULL DEFAULT 100 CHECK (price_level BETWEEN 50 AND 300),
  ADD COLUMN commission_rate numeric(6,4) CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 0.6));

CREATE TABLE problem_type_city_prices (
  problem_type_id text          NOT NULL REFERENCES problem_types(id) ON DELETE CASCADE,
  city_name       text          NOT NULL REFERENCES platform_cities(name) ON DELETE CASCADE,
  price           numeric(12,2) NOT NULL CHECK (price >= 0),
  PRIMARY KEY (problem_type_id, city_name)
);
