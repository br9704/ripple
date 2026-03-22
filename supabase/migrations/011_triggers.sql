-- Migration 011: Trigger functions and triggers
-- Source: PRD Section 8.5 (upvote trigger), PRD Section 6.4 (priority score formula)

-- ============================================================
-- calculate_priority() — PRD priority score formula
-- ============================================================
-- priority_score = (upvote_count * 2)
--               + (severity_weight * 10)
--               + (days_outstanding * 0.5)
--               - (status_progress * 20)
--
-- Severity weights by category:
--   safety (streetlight, tree) = 3
--   accessibility = 2.5
--   infrastructure (pothole, signage, water, footpath) = 2
--   environmental (graffiti, dumping, other) = 1

CREATE OR REPLACE FUNCTION calculate_priority(p_report_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_upvote_count INTEGER;
  v_category TEXT;
  v_status TEXT;
  v_submitted_at TIMESTAMPTZ;
  v_severity_weight NUMERIC;
  v_days_outstanding NUMERIC;
  v_status_progress NUMERIC;
  v_priority NUMERIC;
BEGIN
  SELECT upvote_count, category, status, submitted_at
  INTO v_upvote_count, v_category, v_status, v_submitted_at
  FROM reports
  WHERE id = p_report_id;

  -- Map category to severity weight
  v_severity_weight := CASE v_category
    WHEN 'streetlight' THEN 3
    WHEN 'tree' THEN 3
    WHEN 'accessibility' THEN 2.5
    WHEN 'pothole' THEN 2
    WHEN 'signage' THEN 2
    WHEN 'water' THEN 2
    WHEN 'footpath' THEN 2
    WHEN 'graffiti' THEN 1
    WHEN 'dumping' THEN 1
    WHEN 'other' THEN 1
    ELSE 1
  END;

  -- Days since submission
  v_days_outstanding := EXTRACT(EPOCH FROM (NOW() - v_submitted_at)) / 86400.0;

  -- Status progress offset
  v_status_progress := CASE v_status
    WHEN 'acknowledged' THEN 1    -- -20
    WHEN 'in_progress' THEN 2     -- -40
    WHEN 'fixed' THEN 3           -- -60
    WHEN 'declined' THEN 2        -- -40
    WHEN 'wont_fix' THEN 2        -- -40
    ELSE 0                        -- reported: no offset
  END;

  -- Calculate priority score
  v_priority := (v_upvote_count * 2)
              + (v_severity_weight * 10)
              + (v_days_outstanding * 0.5)
              - (v_status_progress * 20);

  RETURN ROUND(v_priority, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- update_upvote_count() — triggered on upvote insert/delete
-- ============================================================
-- Source: PRD Section 8.5

CREATE OR REPLACE FUNCTION update_upvote_count()
RETURNS TRIGGER AS $$
DECLARE
  v_report_id UUID;
BEGIN
  -- Handle both INSERT and DELETE
  IF TG_OP = 'DELETE' THEN
    v_report_id := OLD.report_id;
  ELSE
    v_report_id := NEW.report_id;
  END IF;

  UPDATE reports SET
    upvote_count = (SELECT COUNT(*) FROM upvotes WHERE report_id = v_report_id),
    priority_score = calculate_priority(v_report_id)
  WHERE id = v_report_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on upvotes table
CREATE TRIGGER trigger_update_upvote_count
  AFTER INSERT OR DELETE ON upvotes
  FOR EACH ROW
  EXECUTE FUNCTION update_upvote_count();
