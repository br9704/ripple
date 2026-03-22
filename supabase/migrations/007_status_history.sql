-- Migration 007: Status History table
-- Source: PRD Section 8.7

CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,                        -- 'council' | 'community' | 'system'
  council_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_report ON status_history(report_id);
CREATE INDEX idx_status_history_created ON status_history(created_at DESC);
