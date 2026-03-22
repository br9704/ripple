-- Migration 003: Reports table (core table)
-- Source: PRD Section 8.3

-- Enable extensions required for spatial index
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_token TEXT NOT NULL,           -- anon UUID from localStorage, never an identity
  council_id UUID REFERENCES councils(id),
  category TEXT NOT NULL CHECK (category IN (
    'pothole', 'streetlight', 'graffiti', 'signage',
    'accessibility', 'dumping', 'water', 'tree', 'footpath', 'other'
  )),
  -- AI Classification
  ai_category TEXT,                       -- what AI predicted (may differ from final category)
  ai_confidence NUMERIC(4,3),            -- 0-1
  user_corrected_ai BOOLEAN DEFAULT FALSE,
  -- Location
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,                           -- reverse geocoded street address
  suburb TEXT,
  postcode TEXT,
  -- Content
  note TEXT CHECK (char_length(note) <= 140),
  -- Status
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported', 'acknowledged', 'in_progress', 'fixed', 'declined', 'wont_fix'
  )),
  council_note TEXT,                      -- council's public note on status change
  priority_score NUMERIC(8,2) DEFAULT 0,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status_updated_at TIMESTAMPTZ,
  fixed_at TIMESTAMPTZ,
  CONSTRAINT valid_coordinates CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

-- Indexes
CREATE INDEX idx_reports_council ON reports(council_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_location ON reports USING GIST(ll_to_earth(lat, lng));
CREATE INDEX idx_reports_submitted ON reports(submitted_at DESC);
CREATE INDEX idx_reports_priority ON reports(priority_score DESC);
CREATE INDEX idx_reports_suburb ON reports(suburb);
