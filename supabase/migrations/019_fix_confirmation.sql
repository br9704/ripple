-- ============================================================
-- 019 — Fix confirmation support
--
-- MASTERPLAN S15. Two columns the confirm-fix Edge Function depends on and
-- which no earlier migration defines.
-- ============================================================

-- Which anonymous device submitted a confirmation photo. Needed to enforce one
-- confirmation per person: without it, a single user could photograph the same
-- patched pothole three times and trip the council suggestion on their own.
ALTER TABLE report_photos
  ADD COLUMN IF NOT EXISTS uploaded_by_token TEXT;

CREATE INDEX IF NOT EXISTS idx_report_photos_confirmations
  ON report_photos(report_id, photo_type);

-- Community consensus is evidence, not authority. PRD §6.5 reserves the 'fixed'
-- status for the council, so 3+ confirmations raise a flag on the dashboard
-- rather than closing the report automatically.
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS community_suggests_fixed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reports_suggests_fixed
  ON reports(community_suggests_fixed)
  WHERE community_suggests_fixed = TRUE;

COMMENT ON COLUMN reports.community_suggests_fixed IS
  'Set when 3+ community confirmation photos exist. A prompt for the council, never an automatic status change.';
