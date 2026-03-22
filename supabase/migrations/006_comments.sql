-- Migration 006: Comments table
-- Source: PRD Section 8.6

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  reporter_token TEXT NOT NULL,
  is_council BOOLEAN DEFAULT FALSE,       -- council staff comment
  is_pinned BOOLEAN DEFAULT FALSE,        -- council can pin their comments
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  flag_count INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT FALSE,           -- auto-hidden at 5 flags
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_report ON comments(report_id);
