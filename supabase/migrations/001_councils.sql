-- Migration 001: Councils table
-- Source: PRD Section 8.1

CREATE TABLE councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'city-of-melbourne'
  name TEXT NOT NULL,                     -- 'City of Melbourne'
  state TEXT NOT NULL DEFAULT 'VIC',
  contact_email TEXT,                     -- dashboard notification email
  dashboard_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
