-- ============================================================
-- 022 — Multi-city support (S20.3)
--
-- Councils belong to a city; reports inherit theirs. Isolation is by filtering
-- rather than separate databases: a Melbourne user and a Sydney user share the
-- deployment, the schema and the search index, and see different data.
--
-- Separate-database-per-city would multiply the operational surface by the
-- number of cities for a product with one city and no users. Postgres filters
-- on an indexed column; the day that stops being enough is the day to revisit.
-- ============================================================

CREATE TABLE IF NOT EXISTS cities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  state      TEXT NOT NULL,
  country    TEXT NOT NULL DEFAULT 'AU',
  -- Default map view for this city.
  centre_lat DOUBLE PRECISION NOT NULL,
  centre_lng DOUBLE PRECISION NOT NULL,
  default_zoom INTEGER NOT NULL DEFAULT 13,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities_select_all" ON cities FOR SELECT USING (true);

INSERT INTO cities (slug, name, state, centre_lat, centre_lng)
VALUES ('melbourne', 'Melbourne', 'VIC', -37.8136, 144.9631)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE councils
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id);

UPDATE councils SET city_id = (SELECT id FROM cities WHERE slug = 'melbourne')
WHERE city_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_councils_city ON councils(city_id);

-- Denormalised onto reports so the map can filter without a join on every
-- query. Kept in step by trigger rather than trusting the client.
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id);

CREATE INDEX IF NOT EXISTS idx_reports_city ON reports(city_id);

UPDATE reports r
SET city_id = c.city_id
FROM councils c
WHERE r.council_id = c.id AND r.city_id IS NULL;

CREATE OR REPLACE FUNCTION set_report_city()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.city_id IS NULL AND NEW.council_id IS NOT NULL THEN
    SELECT city_id INTO NEW.city_id FROM councils WHERE id = NEW.council_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_report_city ON reports;
CREATE TRIGGER trg_set_report_city
  BEFORE INSERT OR UPDATE OF council_id ON reports
  FOR EACH ROW EXECUTE FUNCTION set_report_city();

COMMENT ON COLUMN reports.city_id IS
  'Denormalised from councils so map queries filter without a join. Maintained by trg_set_report_city, never by the client.';
