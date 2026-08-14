-- ============================================================
-- 017 — Status change history + priority recompute
--
-- MASTERPLAN S13.2. Two problems solved together, because they share a trigger.
--
-- 1. status_history was only ever written by the submit-report Edge Function
--    (the initial 'reported' row). Nothing recorded subsequent changes, so the
--    status timeline in S11 would show a single entry forever no matter how
--    many times a council updated the report.
--
-- 2. Discovered while tracing Sprint 8: calculate_priority() is called ONLY
--    from update_upvote_count(), which fires on upvote insert/delete. So
--    priority_score recomputes on upvote churn and never otherwise — meaning
--    the `days_outstanding` term silently stops accruing on any report nobody
--    upvotes, and the `status_progress` penalty is never applied when a council
--    actually changes the status. Both are exactly the reports a council
--    dashboard sorts by. Fixed here for the status half; the age half needs a
--    schedule (see the note at the bottom).
-- ============================================================

-- ------------------------------------------------------------
-- calculate_priority overload taking an explicit status.
--
-- Necessary because the trigger below is BEFORE UPDATE, where the table still
-- holds the OLD row: the single-argument calculate_priority(id) re-reads from
-- `reports` and would therefore compute the score from the status we are in the
-- middle of replacing, silently leaving the status_progress penalty unapplied.
--
-- Caught by supabase/test/01_verify.sql running against a real Postgres. It was
-- invisible to inspection and would have been invisible in production too — the
-- score would simply have been wrong, and wrong in the direction that keeps
-- resolved reports ranked as urgent on the council dashboard.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_priority(p_report_id UUID, p_status TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_upvote_count     INTEGER;
  v_category         TEXT;
  v_submitted_at     TIMESTAMPTZ;
  v_severity_weight  NUMERIC;
  v_days_outstanding NUMERIC;
  v_status_progress  NUMERIC;
BEGIN
  SELECT upvote_count, category, submitted_at
  INTO v_upvote_count, v_category, v_submitted_at
  FROM reports WHERE id = p_report_id;

  v_severity_weight := CASE v_category
    WHEN 'streetlight' THEN 3 WHEN 'tree' THEN 3
    WHEN 'accessibility' THEN 2.5
    WHEN 'pothole' THEN 2 WHEN 'signage' THEN 2
    WHEN 'water' THEN 2 WHEN 'footpath' THEN 2
    ELSE 1
  END;

  v_days_outstanding := EXTRACT(EPOCH FROM (NOW() - v_submitted_at)) / 86400.0;

  v_status_progress := CASE p_status
    WHEN 'acknowledged' THEN 1
    WHEN 'in_progress' THEN 2
    WHEN 'fixed' THEN 3
    WHEN 'declined' THEN 2
    WHEN 'wont_fix' THEN 2
    ELSE 0
  END;

  RETURN ROUND(
    (v_upvote_count * 2) + (v_severity_weight * 10)
    + (v_days_outstanding * 0.5) - (v_status_progress * 20), 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO status_history (report_id, from_status, to_status, changed_by, council_note)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      -- The Edge Function runs as service_role; anything else reaching here is
      -- a community-driven change (e.g. the S15 fix confirmation flow).
      CASE WHEN auth.role() = 'service_role' THEN 'council' ELSE 'community' END,
      NEW.council_note
    );

    NEW.status_updated_at := NOW();

    IF NEW.status = 'fixed' AND OLD.status IS DISTINCT FROM 'fixed' THEN
      NEW.fixed_at := NOW();
    END IF;

    -- Recompute with the INCOMING status. Passing NEW.status explicitly is
    -- required: in a BEFORE UPDATE the row in `reports` still carries the old
    -- status, so the single-argument form would score the transition we are
    -- replacing rather than the one we are making.
    NEW.priority_score := calculate_priority(NEW.id, NEW.status);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_status_change ON reports;

-- BEFORE UPDATE so the assignments to NEW.* are persisted by this same write,
-- rather than requiring a second UPDATE.
CREATE TRIGGER trg_record_status_change
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION record_status_change();

-- ============================================================
-- Age-driven priority drift
--
-- calculate_priority()'s days_outstanding term still only re-evaluates when
-- something else writes the row. A report nobody upvotes and no council touches
-- keeps the priority_score it had on day one, so the age penalty that is
-- supposed to float neglected reports upward never fires — which defeats the
-- point of the term.
--
-- This function recomputes every open report and is intended to be scheduled
-- daily. Scheduling needs pg_cron (a dashboard toggle) or an external trigger,
-- both of which are owner-gated → OG1. Defining it here means the fix is ready
-- the moment the backend exists.
-- ============================================================
CREATE OR REPLACE FUNCTION recompute_open_priorities()
RETURNS INTEGER AS $$
DECLARE
  updated INTEGER;
BEGIN
  WITH touched AS (
    UPDATE reports
    SET priority_score = calculate_priority(id)
    WHERE status NOT IN ('fixed', 'declined', 'wont_fix')
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated FROM touched;

  RETURN updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recompute_open_priorities IS
  'Daily maintenance: refresh priority_score so the days_outstanding term keeps accruing on reports nobody upvotes. Schedule via pg_cron once the project is provisioned (OG1).';
