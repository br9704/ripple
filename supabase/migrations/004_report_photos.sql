-- Migration 004: Report Photos table
-- Source: PRD Section 8.4

CREATE TABLE report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,             -- Supabase Storage path
  public_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'original' CHECK (photo_type IN ('original', 'additional', 'fixed_confirmation')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_photos_report ON report_photos(report_id);
