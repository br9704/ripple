-- Migration 005: Upvotes table
-- Source: PRD Section 8.5

CREATE TABLE upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  reporter_token TEXT NOT NULL,           -- anon identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, reporter_token)       -- one upvote per person per report
);

CREATE INDEX idx_upvotes_report ON upvotes(report_id);
CREATE INDEX idx_upvotes_token ON upvotes(reporter_token);
