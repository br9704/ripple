-- Migration 002: Council Boundaries table
-- Source: PRD Section 8.2

CREATE TABLE council_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id UUID REFERENCES councils(id),
  polygon JSONB NOT NULL,                 -- GeoJSON MultiPolygon
  source TEXT DEFAULT 'ABS',              -- data source
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_council_boundaries_council ON council_boundaries(council_id);
