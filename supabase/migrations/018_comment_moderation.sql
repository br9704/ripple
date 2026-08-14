-- ============================================================
-- 018 — Comment flagging and auto-hide
--
-- MASTERPLAN S14.4/S14.5. Flagging cannot be a plain client-side UPDATE:
-- `flag_count` is the input to the auto-hide rule, so letting anonymous callers
-- write it directly would let one person set it to 5 and silence any comment
-- they disliked. RLS in migration 010 grants comments UPDATE only to
-- service_role, so this SECURITY DEFINER function is the sanctioned path.
--
-- One flag per token per comment is enforced by a dedicated table rather than
-- trusting the client, because "I already flagged this" is exactly the check a
-- determined user would bypass.
-- ============================================================

CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, reporter_token)
);

CREATE INDEX IF NOT EXISTS idx_comment_flags_comment ON comment_flags(comment_id);

ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

-- No SELECT policy at all: who flagged what is nobody's business but the
-- moderator's, and exposing it would enable retaliation.
CREATE POLICY "comment_flags_insert_own" ON comment_flags
  FOR INSERT WITH CHECK (reporter_token = public.current_reporter_token());

-- ============================================================
-- flag_comment — record a flag, recount, auto-hide at the threshold.
-- ============================================================
CREATE OR REPLACE FUNCTION flag_comment(p_comment_id UUID)
RETURNS TABLE (flag_count INTEGER, hidden BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_count INTEGER;
BEGIN
  v_token := public.current_reporter_token();
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Missing reporter token';
  END IF;

  -- Idempotent: flagging twice is a no-op rather than an error, because the
  -- user's intent ("this is bad") is already recorded.
  INSERT INTO comment_flags (comment_id, reporter_token)
  VALUES (p_comment_id, v_token)
  ON CONFLICT (comment_id, reporter_token) DO NOTHING;

  SELECT COUNT(*) INTO v_count FROM comment_flags WHERE comment_id = p_comment_id;

  UPDATE comments c
  SET flag_count = v_count,
      -- 5 is COMMENT_FLAG_HIDE_THRESHOLD in src/constants/config.ts.
      -- Council comments are exempt: a brigade must not be able to hide an
      -- official "we've scheduled this for repair on 14 April".
      hidden = (v_count >= 5 AND c.is_council = FALSE)
  WHERE c.id = p_comment_id;

  RETURN QUERY
    SELECT c.flag_count, c.hidden FROM comments c WHERE c.id = p_comment_id;
END;
$$;

COMMENT ON FUNCTION flag_comment IS
  'Records one flag per reporter_token per comment and auto-hides at 5. SECURITY DEFINER because comments.UPDATE is service_role-only; flag_count must not be client-writable.';
