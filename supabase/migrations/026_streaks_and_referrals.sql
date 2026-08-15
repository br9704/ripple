-- ============================================================
-- 026 — Community streaks and referral flow (S21.4, S21.5)
--
-- Source: PRD §5.5, the Phase 4 scope line — "Badges, neighbourhood
-- leaderboard, community streaks, 'Fixed!' celebrations, referral flow,
-- multi-city expansion." Badges shipped (021), leaderboard shipped (S19),
-- multi-city shipped (022). Streaks and the referral flow were never built and
-- never tracked. Sprint 20's own goal line names the referral flow and none of
-- S20.1–S20.4 delivers it.
--
-- ============================================================
-- DESIGN NOTE — why a referral code is not the reporter token
-- ============================================================
-- The obvious implementation of "invite a friend" is a link containing the
-- referrer's id. Here the only id is `reporter_token`, which is a *bearer
-- credential*: migration 015 scopes every anonymous write by comparing it to
-- the `x-reporter-token` header. Putting it in a shareable URL would publish
-- the credential to every group chat it lands in.
--
-- So a referral code is a separate, deliberately useless-on-its-own value:
-- knowing someone's code lets you credit them with a referral and nothing
-- else. The code→token mapping is never readable by the client, in either
-- direction. This is the same reasoning that made S19.4's leaderboard return
-- no token column.
--
-- Designing this is what surfaced S21.9: while checking that no other surface
-- leaked tokens, `SELECT reporter_token FROM reports` turned out to return
-- every one of them. Migration 025 fixes that; this migration is written as if
-- it already holds, and depends on it.
-- ============================================================

-- ── Referral codes ───────────────────────────────────────────
CREATE TABLE referral_codes (
  code           TEXT PRIMARY KEY,
  reporter_token TEXT NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unambiguous when read aloud or typed from a screenshot: the generator
  -- below excludes the four characters that actually collide in an uppercase
  -- monospace face — I, O, 0, 1. Length 8 over a 32-symbol alphabet is 40
  -- bits, which is not a secret but is far past guessing at civic scale.
  --
  -- CORRECTED 15 Aug 2026: this comment previously claimed the alphabet also
  -- excluded L and totalled 30 symbols / ~39 bits. The pattern below spans
  -- J–N, so L is and always was included, and the generator string has 32
  -- characters. Caught by the client agent building against this constraint,
  -- which noticed the prose and the regex disagreed — a client that had
  -- trusted the comment would have rejected one valid invite code in eight.
  -- L is kept rather than removed: uppercase L and 1 are plainly distinct in
  -- the monospace face this code is rendered in, and tightening the constraint
  -- now would invalidate codes already minted.
  CONSTRAINT referral_code_shape CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$')
);

CREATE TABLE referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_token TEXT NOT NULL,
  invitee_token  TEXT NOT NULL,
  referred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A person can be referred once, ever. Without this the invitee could
  -- redeem a new code every week and manufacture credit for a friend.
  CONSTRAINT one_referral_per_invitee UNIQUE (invitee_token),
  -- Self-referral is the first thing anyone tries.
  CONSTRAINT no_self_referral CHECK (referrer_token <> invitee_token)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_token);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals      ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies on either table: RLS with no policy denies all
-- access to anon. Every legitimate operation goes through the SECURITY
-- DEFINER functions below, which is what keeps the code→token mapping
-- one-way. Reading `referral_codes` directly would be a token dictionary.

-- ── Code generation ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INTEGER;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::INT, 1);
    END LOOP;
    -- Collision is ~1 in 10^11 at this scale; the loop costs nothing and
    -- removes the need to reason about it at all.
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Returns the caller's code, minting one on first call.
--
-- SECURITY DEFINER with a pinned search_path: it must read a table the caller
-- cannot read. It takes NO argument — the identity comes from the request
-- header via current_reporter_token(). An argument would turn this into an
-- oracle that maps any token to its code.
CREATE OR REPLACE FUNCTION my_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token TEXT := public.current_reporter_token();
  v_code  TEXT;
BEGIN
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'no reporter token on request';
  END IF;

  SELECT code INTO v_code FROM referral_codes WHERE reporter_token = v_token;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  v_code := generate_referral_code();
  INSERT INTO referral_codes (code, reporter_token)
  VALUES (v_code, v_token)
  -- Two concurrent calls from the same user must not produce two codes; the
  -- UNIQUE on reporter_token makes the loser a no-op and the re-read below
  -- returns the winner's code.
  ON CONFLICT (reporter_token) DO NOTHING;

  SELECT code INTO v_code FROM referral_codes WHERE reporter_token = v_token;
  RETURN v_code;
END;
$$;

-- Redeems someone else's code for the calling user.
--
-- Returns TRUE only when a new referral was actually recorded, so the UI can
-- tell "thanks, credited" from "you have already been referred" without
-- learning anything about whose code it was.
CREATE OR REPLACE FUNCTION redeem_referral(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitee  TEXT := public.current_reporter_token();
  v_referrer TEXT;
BEGIN
  IF v_invitee IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT reporter_token INTO v_referrer
  FROM referral_codes
  WHERE code = upper(btrim(p_code));

  -- Unknown code, or the user's own code. Both return FALSE rather than
  -- raising: a distinct error for "no such code" would let anyone probe which
  -- codes exist, and existence maps one-to-one onto users.
  IF v_referrer IS NULL OR v_referrer = v_invitee THEN
    RETURN FALSE;
  END IF;

  INSERT INTO referrals (referrer_token, invitee_token)
  VALUES (v_referrer, v_invitee)
  ON CONFLICT (invitee_token) DO NOTHING;

  RETURN FOUND;
END;
$$;

-- How many people the caller has brought in. Own count only, by construction.
CREATE OR REPLACE FUNCTION my_referral_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::INTEGER
  FROM referrals
  WHERE referrer_token = public.current_reporter_token();
$$;

REVOKE ALL ON FUNCTION generate_referral_code() FROM PUBLIC;

-- ============================================================
-- DESIGN NOTE — why streaks are weekly and count weeks, not reports
-- ============================================================
-- A daily streak would be the wrong incentive for this product. Nobody
-- encounters a pothole daily, so a daily streak rewards *inventing* reports,
-- and a fabricated report costs a council a real truck roll. Weekly matches
-- the actual cadence of noticing something broken on your own street.
--
-- The unit is "distinct weeks with at least one report", never report volume,
-- for the same reason: submitting fifty reports on a Monday must not advance a
-- streak further than submitting one. That removes the only way to game it
-- that also produces junk in the council's queue.
--
-- PRD §13.4 forbids gamifying sensitive categories, which migration 021
-- honours by refusing to award badges for volume of safety reports. Streaks
-- are category-blind on purpose: a category-weighted streak would be exactly
-- the "report more accidents to keep your streak" incentive §13.4 rules out.
-- Counting weeks rather than severity keeps the mechanic indifferent to what
-- was reported.
-- ============================================================

CREATE OR REPLACE FUNCTION my_streak()
RETURNS TABLE (
  current_weeks  INTEGER,
  longest_weeks  INTEGER,
  weeks_active   INTEGER,
  last_report_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token TEXT := public.current_reporter_token();
BEGIN
  IF v_token IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  RETURN QUERY
  WITH weeks AS (
    -- One row per week the user reported in, regardless of how many times.
    SELECT DISTINCT date_trunc('week', submitted_at) AS wk
    FROM reports
    WHERE reporter_token = v_token
  ),
  -- Classic gaps-and-islands: subtracting the row number (in weeks) from the
  -- week itself gives a constant per unbroken run, so runs group by it.
  runs AS (
    SELECT wk,
           wk - (ROW_NUMBER() OVER (ORDER BY wk) * INTERVAL '1 week') AS grp
    FROM weeks
  ),
  lengths AS (
    SELECT grp, COUNT(*)::INTEGER AS len, MAX(wk) AS ends_at
    FROM runs
    GROUP BY grp
  )
  SELECT
    COALESCE((
      -- The current streak is the run touching this week or last week. Last
      -- week counts so the streak does not appear to break every Monday
      -- morning before the user has had a chance to report.
      SELECT len FROM lengths
      WHERE ends_at >= date_trunc('week', NOW()) - INTERVAL '1 week'
      ORDER BY ends_at DESC LIMIT 1
    ), 0),
    COALESCE((SELECT MAX(len) FROM lengths), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM weeks), 0),
    (SELECT MAX(submitted_at) FROM reports WHERE reporter_token = v_token);
END;
$$;

COMMENT ON FUNCTION my_streak() IS
  'PRD §5.5 community streaks. Consecutive weeks with at least one report, for the calling token only. Weekly not daily, and weeks not reports, so the mechanic cannot be advanced by inventing work for a council.';

COMMENT ON TABLE referral_codes IS
  'PRD §5.5 referral flow. A shareable code that is NOT the reporter_token — the token is a bearer credential (migration 015) and must never appear in a URL. RLS on with no policies: reachable only through my_referral_code()/redeem_referral().';

COMMENT ON TABLE referrals IS
  'One row per referred user, at most one per invitee ever. No policies: counts come from my_referral_count().';
