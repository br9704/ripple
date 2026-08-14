-- ============================================================
-- RLS enforcement, executed as the anon role.
--
-- This is the file that proves migration 015 actually fixed something. The
-- August audit found two policies named `_own` but written `USING (true)`:
-- any anonymous caller could delete anyone's upvote, and every stored
-- notification email was world-readable with nothing but the public anon key.
--
-- Asserting that from reading SQL is not proof. These tests run as `anon` with
-- RLS enforced and try the attacks directly.
-- ============================================================

\set ON_ERROR_STOP on

-- Seed data must be created as the owner, before dropping privileges.
INSERT INTO reports (id, reporter_token, category, lat, lng, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'victim-token', 'pothole', -37.81, 144.96, 'reported')
ON CONFLICT (id) DO NOTHING;

INSERT INTO upvotes (id, report_id, reporter_token)
VALUES ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'victim-token')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_notifications (id, reporter_token, notification_type, email, is_active)
VALUES ('33333333-3333-3333-3333-333333333333', 'victim-token', 'email',
        'victim@example.com', TRUE)
ON CONFLICT (id) DO NOTHING;

-- The table owner bypasses RLS, so drop to a role that does not.
SET ROLE anon;

-- Impersonate an ATTACKER: a different anonymous device.
SELECT set_config('request.headers',
                  '{"x-reporter-token":"attacker-token"}', false) AS _;

DO $$
DECLARE
  v_visible  INTEGER;
  v_deleted  INTEGER;
BEGIN
  RAISE NOTICE '--- running as: % ---', current_user;

  -- ── S2.16 defect 1: anyone could delete any upvote ──
  DELETE FROM upvotes WHERE id = '22222222-2222-2222-2222-222222222222';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RAISE EXCEPTION 'FAIL  attacker deleted another token''s upvote (% row(s))', v_deleted;
  END IF;
  RAISE NOTICE '  PASS  attacker CANNOT delete another token''s upvote';

  -- ── The upvote must still be there ──
  -- NONE restores session_user (the table owner), which bypasses RLS.
  -- Named superusers differ per install, so do not hardcode 'postgres'.
  SET LOCAL ROLE NONE;
  SELECT COUNT(*) INTO v_visible FROM upvotes
   WHERE id = '22222222-2222-2222-2222-222222222222';
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  victim upvote was destroyed';
  END IF;
  RAISE NOTICE '  PASS  victim upvote survives (upvote_count cannot be griefed down)';
  SET LOCAL ROLE anon;

  -- ── S2.16 defect 2: every notification email was world-readable ──
  SELECT COUNT(*) INTO v_visible FROM user_notifications;
  IF v_visible > 0 THEN
    RAISE EXCEPTION 'FAIL  attacker read % notification row(s) — email leak', v_visible;
  END IF;
  RAISE NOTICE '  PASS  attacker CANNOT read another token''s notification email';

  -- ── The enabling hole: upvotes SELECT used to publish reporter_token ──
  SELECT COUNT(*) INTO v_visible FROM upvotes;
  IF v_visible > 0 THEN
    RAISE EXCEPTION 'FAIL  attacker enumerated % upvote row(s), harvesting tokens', v_visible;
  END IF;
  RAISE NOTICE '  PASS  attacker CANNOT enumerate upvotes to harvest reporter_tokens';

  -- ── Reports stay publicly readable: this is a public map ──
  SELECT COUNT(*) INTO v_visible FROM reports;
  IF v_visible < 1 THEN
    RAISE EXCEPTION 'FAIL  public report read broke — the map would be empty';
  END IF;
  RAISE NOTICE '  PASS  reports remain publicly readable (the map still works)';

  -- ── Anonymous submission must still work: PRD §6.1 ──
  INSERT INTO reports (reporter_token, category, lat, lng, status)
  VALUES ('attacker-token', 'graffiti', -37.82, 144.97, 'reported');
  RAISE NOTICE '  PASS  anonymous users can still submit reports';

  -- ── Comment authorship cannot be forged (migration 015) ──
  BEGIN
    INSERT INTO comments (report_id, reporter_token, body)
    VALUES ('11111111-1111-1111-1111-111111111111', 'victim-token', 'forged as the victim');
    RAISE EXCEPTION 'FAIL  attacker posted a comment as another token';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '  PASS  attacker CANNOT post a comment as another token';
  END;

  -- ── Council impersonation cannot be self-granted ──
  BEGIN
    INSERT INTO comments (report_id, reporter_token, body, is_council)
    VALUES ('11111111-1111-1111-1111-111111111111', 'attacker-token', 'Official notice', TRUE);
    RAISE EXCEPTION 'FAIL  attacker posted a comment flagged as council';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '  PASS  attacker CANNOT post as the council';
  END;

  -- ── Own-row access must still work, or the fix broke the feature ──
  PERFORM set_config('request.headers', '{"x-reporter-token":"victim-token"}', true);
  SELECT COUNT(*) INTO v_visible FROM upvotes;
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  victim cannot see their OWN upvote (% rows) — feature broken', v_visible;
  END IF;
  RAISE NOTICE '  PASS  a user CAN still see their own upvote ("have I upvoted this?")';

  SELECT COUNT(*) INTO v_visible FROM user_notifications;
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  victim cannot read their own notification row';
  END IF;
  RAISE NOTICE '  PASS  a user CAN still read their own notification settings';

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL RLS ASSERTIONS PASSED ===';
END $$;

RESET ROLE;
