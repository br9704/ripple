-- ============================================================
-- 021 — Badge earning (S19.1)
--
-- Awarded server-side on report insert. Doing this client-side would make
-- badges trivially forgeable, and badges_earned is service_role-insert-only in
-- migration 010 precisely so they cannot be.
--
-- PRD §13.4 forbids gamifying sensitive categories. There is no badge for
-- volume of safety reports beyond the existing Safety Spotter, and none is tied
-- to injury or distress content.
-- ============================================================

CREATE OR REPLACE FUNCTION award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_total    INTEGER;
  v_category INTEGER;
  v_suburb   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM reports WHERE reporter_token = NEW.reporter_token;

  IF v_total >= 1 THEN
    INSERT INTO badges_earned (reporter_token, badge_slug)
    VALUES (NEW.reporter_token, 'first_report')
    ON CONFLICT (reporter_token, badge_slug) DO NOTHING;
  END IF;

  IF v_total >= 10 THEN
    INSERT INTO badges_earned (reporter_token, badge_slug)
    VALUES (NEW.reporter_token, '10_reports')
    ON CONFLICT (reporter_token, badge_slug) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_category
  FROM reports WHERE reporter_token = NEW.reporter_token AND category = NEW.category;

  IF v_category >= 5 AND NEW.category IN ('streetlight', 'tree', 'water') THEN
    INSERT INTO badges_earned (reporter_token, badge_slug)
    VALUES (NEW.reporter_token, 'safety_spotter')
    ON CONFLICT (reporter_token, badge_slug) DO NOTHING;
  END IF;

  IF v_category >= 5 AND NEW.category = 'accessibility' THEN
    INSERT INTO badges_earned (reporter_token, badge_slug)
    VALUES (NEW.reporter_token, 'accessibility_advocate')
    ON CONFLICT (reporter_token, badge_slug) DO NOTHING;
  END IF;

  IF NEW.suburb IS NOT NULL THEN
    SELECT COUNT(*) INTO v_suburb
    FROM reports WHERE reporter_token = NEW.reporter_token AND suburb = NEW.suburb;

    IF v_suburb >= 25 THEN
      INSERT INTO badges_earned (reporter_token, badge_slug)
      VALUES (NEW.reporter_token, 'neighbourhood_watch')
      ON CONFLICT (reporter_token, badge_slug) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_award_badges ON reports;
CREATE TRIGGER trg_award_badges
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION award_badges();

-- 'fix_confirmed' is awarded when a report reaches 'fixed', not on insert.
CREATE OR REPLACE FUNCTION award_fix_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'fixed' AND OLD.status IS DISTINCT FROM 'fixed' THEN
    INSERT INTO badges_earned (reporter_token, badge_slug)
    VALUES (NEW.reporter_token, 'fix_confirmed')
    ON CONFLICT (reporter_token, badge_slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_award_fix_badge ON reports;
CREATE TRIGGER trg_award_fix_badge
  AFTER UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION award_fix_badge();

-- ============================================================
-- Leaderboard — OPT-IN ONLY (PRD §6.8).
--
-- A leaderboard keyed on reporter_token would turn an anonymity token into a
-- public ranked identity, which PRD §13.1 forbids. Participation therefore
-- requires an explicit display name, and the token is never exposed.
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard_optin (
  reporter_token TEXT PRIMARY KEY,
  display_name   TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 24),
  suburb         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leaderboard_optin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaderboard_insert_own" ON leaderboard_optin
  FOR INSERT WITH CHECK (reporter_token = public.current_reporter_token());
CREATE POLICY "leaderboard_delete_own" ON leaderboard_optin
  FOR DELETE USING (reporter_token = public.current_reporter_token());
-- No public SELECT: the join below exposes display names only, never tokens.

CREATE OR REPLACE FUNCTION leaderboard(p_suburb TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (display_name TEXT, suburb TEXT, report_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.display_name,
         o.suburb,
         COUNT(r.id) AS report_count
  FROM leaderboard_optin o
  JOIN reports r ON r.reporter_token = o.reporter_token
  WHERE (p_suburb IS NULL OR o.suburb = p_suburb)
  GROUP BY o.display_name, o.suburb
  ORDER BY report_count DESC, o.display_name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

COMMENT ON FUNCTION leaderboard IS
  'Opt-in only. Returns chosen display names and counts; reporter_token is never exposed, because a ranked list keyed on it would convert an anonymity token into a public identity (PRD §13.1).';
