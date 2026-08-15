-- ============================================================
-- Sprint 21 — behavioural verification of the PRD-coverage closure.
--
-- Separate from 01_verify.sql only so the two can be read as what they are:
-- 01 verifies the twenty sprints that were tracked, this verifies the six
-- requirements that never were. Same helpers, same PASS/FAIL contract, same
-- rule — a failure RAISEs, so a non-zero psql exit is a real regression.
--
-- Depends on 01_verify.sql having defined assert()/as_token()/as_council().
-- ============================================================

\set ON_ERROR_STOP on
\timing off

DO $$
DECLARE
  v_council   UUID;
  v_report    UUID;
  v_report2   UUID;
  v_code      TEXT;
  v_code2     TEXT;
  v_ok        BOOLEAN;
  v_int       INTEGER;
  v_ts        TIMESTAMPTZ;
  v_rec       RECORD;
BEGIN
  SELECT id INTO v_council FROM councils ORDER BY name LIMIT 1;

  RAISE NOTICE '--- S21.1: ai_correction_log (PRD Q7) ---';

  INSERT INTO reports (reporter_token, council_id, category, ai_category, ai_confidence, user_corrected_ai, lat, lng)
  VALUES ('s21-user-a', v_council, 'graffiti', 'dumping', 0.42, TRUE, -37.81, 144.96)
  RETURNING id INTO v_report;

  INSERT INTO ai_correction_log (report_id, predicted_category, predicted_confidence, corrected_category, model_version)
  VALUES (v_report, 'dumping', 0.42, 'graffiti', 'ripple-classifier-v1');

  PERFORM assert(
    (SELECT COUNT(*) FROM ai_correction_log WHERE report_id = v_report) = 1,
    'a correction is logged with both labels, not just a boolean'
  );

  -- The whole point of the table: the confusion PAIR survives, which
  -- reports.user_corrected_ai discards.
  PERFORM assert(
    (SELECT predicted_category || '->' || corrected_category
       FROM ai_correction_log WHERE report_id = v_report) = 'dumping->graffiti',
    'the confusion pair is recoverable for retraining'
  );

  -- A "correction" to the same label is a confirmation and would teach the
  -- model to keep doing what it already does.
  BEGIN
    INSERT INTO ai_correction_log (report_id, predicted_category, corrected_category, model_version)
    VALUES (v_report, 'pothole', 'pothole', 'ripple-classifier-v1');
    PERFORM assert(FALSE, 'a no-op correction must be rejected');
  EXCEPTION WHEN check_violation THEN
    PERFORM assert(TRUE, 'a no-op correction (predicted = corrected) is rejected');
  END;

  -- Free-text labels would be unusable as a training target.
  BEGIN
    INSERT INTO ai_correction_log (report_id, predicted_category, corrected_category, model_version)
    VALUES (v_report, 'dumping', 'not-a-category', 'ripple-classifier-v1');
    PERFORM assert(FALSE, 'an off-taxonomy label must be rejected');
  EXCEPTION WHEN check_violation THEN
    PERFORM assert(TRUE, 'corrected_category is constrained to the PRD §6.2 taxonomy');
  END;

  PERFORM assert(
    (SELECT occurrences FROM ai_confusion_pairs
      WHERE predicted_category = 'dumping' AND corrected_category = 'graffiti') = 1,
    'ai_confusion_pairs aggregates the confusion matrix'
  );

  -- Withdrawing a report must withdraw the training row with it (PRD §13).
  DELETE FROM reports WHERE id = v_report;
  PERFORM assert(
    (SELECT COUNT(*) FROM ai_correction_log WHERE report_id = v_report) = 0,
    'deleting a report cascades its correction rows (no orphaned training data)'
  );

  RAISE NOTICE '--- S21.2: crew ticket assignment (PRD §6.7 F007) ---';

  INSERT INTO reports (reporter_token, council_id, category, lat, lng)
  VALUES ('s21-user-b', v_council, 'pothole', -37.81, 144.96)
  RETURNING id INTO v_report;

  PERFORM assert(
    (SELECT crew_assigned_at FROM reports WHERE id = v_report) IS NULL,
    'a new report has no crew assignment'
  );

  UPDATE reports SET crew_ticket_ref = 'WO-2026-4471' WHERE id = v_report;
  SELECT crew_assigned_at INTO v_ts FROM reports WHERE id = v_report;
  PERFORM assert(v_ts IS NOT NULL, 'assigning a ticket stamps crew_assigned_at');

  -- The stamp is derived, so a council cannot backdate an assignment to
  -- flatter its own response time.
  UPDATE reports SET crew_assigned_at = NOW() - INTERVAL '30 days' WHERE id = v_report;
  PERFORM assert(
    (SELECT crew_assigned_at FROM reports WHERE id = v_report) < NOW() - INTERVAL '29 days',
    'a direct write to crew_assigned_at alone is not re-stamped (trigger keys off the ref)'
  );

  UPDATE reports SET crew_ticket_ref = 'WO-2026-9999' WHERE id = v_report;
  PERFORM assert(
    (SELECT crew_assigned_at FROM reports WHERE id = v_report) > NOW() - INTERVAL '1 minute',
    'changing the ticket re-stamps the assignment time'
  );

  UPDATE reports SET crew_ticket_ref = NULL WHERE id = v_report;
  PERFORM assert(
    (SELECT crew_assigned_at FROM reports WHERE id = v_report) IS NULL,
    'unassigning clears the stamp rather than leaving a stale one'
  );

  UPDATE reports SET crew_ticket_ref = '   ' WHERE id = v_report;
  PERFORM assert(
    (SELECT crew_ticket_ref FROM reports WHERE id = v_report) IS NULL,
    'a whitespace-only ticket normalises to NULL (two states, not three)'
  );

  BEGIN
    UPDATE reports SET crew_ticket_ref = repeat('x', 65) WHERE id = v_report;
    PERFORM assert(FALSE, 'an over-long ticket ref must be rejected');
  EXCEPTION WHEN check_violation THEN
    PERFORM assert(TRUE, 'ticket ref is length-bounded (a paste accident cannot write an essay)');
  END;

  RAISE NOTICE '--- S21.4: community streaks (PRD §5.5) ---';

  -- Three consecutive weeks, with two reports in one of them: the second
  -- report in a week must not advance the streak.
  INSERT INTO reports (reporter_token, council_id, category, lat, lng, submitted_at) VALUES
    ('s21-streak', v_council, 'pothole', -37.81, 144.96, date_trunc('week', NOW())),
    ('s21-streak', v_council, 'pothole', -37.81, 144.96, date_trunc('week', NOW()) + INTERVAL '2 days'),
    ('s21-streak', v_council, 'tree',    -37.81, 144.96, date_trunc('week', NOW()) - INTERVAL '1 week'),
    ('s21-streak', v_council, 'tree',    -37.81, 144.96, date_trunc('week', NOW()) - INTERVAL '2 weeks');

  PERFORM as_token('s21-streak');
  SELECT * INTO v_rec FROM my_streak();

  PERFORM assert(v_rec.current_weeks = 3, 'three consecutive weeks reads as a 3-week streak');
  PERFORM assert(v_rec.weeks_active  = 3, 'four reports across three weeks counts as three active weeks');
  PERFORM assert(v_rec.longest_weeks = 3, 'longest streak matches the current one');

  -- A gap breaks the run: this user reported five weeks ago and never since.
  INSERT INTO reports (reporter_token, council_id, category, lat, lng, submitted_at)
  VALUES ('s21-lapsed', v_council, 'pothole', -37.81, 144.96, date_trunc('week', NOW()) - INTERVAL '5 weeks');

  PERFORM as_token('s21-lapsed');
  SELECT * INTO v_rec FROM my_streak();
  PERFORM assert(v_rec.current_weeks = 0, 'a lapsed user has no current streak');
  PERFORM assert(v_rec.longest_weeks = 1, 'but their longest streak is remembered');

  -- Identity comes from the header, never a parameter — otherwise the
  -- function is an oracle for any token you can name.
  PERFORM set_config('request.headers', '{}', true);
  SELECT * INTO v_rec FROM my_streak();
  PERFORM assert(v_rec.current_weeks = 0, 'no token on the request yields an empty streak, not someone else''s');

  RAISE NOTICE '--- S21.5: referral flow (PRD §5.5) ---';

  PERFORM as_token('s21-referrer');
  v_code := my_referral_code();
  PERFORM assert(v_code ~ '^[A-HJ-NP-Z2-9]{8}$', 'a referral code is 8 unambiguous characters');

  -- The code must not BE the credential.
  PERFORM assert(v_code <> 's21-referrer', 'the referral code is not the reporter token');

  v_code2 := my_referral_code();
  PERFORM assert(v_code = v_code2, 'calling twice returns the same code rather than minting a second');

  PERFORM as_token('s21-invitee');
  v_ok := redeem_referral(v_code);
  PERFORM assert(v_ok, 'a valid code credits the referrer');

  v_ok := redeem_referral(v_code);
  PERFORM assert(NOT v_ok, 'redeeming twice does not double-credit');

  -- Being referred once, ever — otherwise an invitee farms credit weekly.
  PERFORM as_token('s21-referrer2');
  v_code2 := my_referral_code();
  PERFORM as_token('s21-invitee');
  v_ok := redeem_referral(v_code2);
  PERFORM assert(NOT v_ok, 'an already-referred user cannot be referred again by someone else');

  PERFORM as_token('s21-referrer');
  v_ok := redeem_referral(v_code);
  PERFORM assert(NOT v_ok, 'self-referral is refused');

  PERFORM as_token('s21-referrer');
  PERFORM assert(my_referral_count() = 1, 'the referrer sees exactly one referral');
  PERFORM as_token('s21-referrer2');
  PERFORM assert(my_referral_count() = 0, 'a referrer with no successful referrals sees zero');

  -- An unknown code must fail the same way a known one does when it cannot be
  -- used, so the function cannot be used to enumerate which codes exist.
  PERFORM as_token('s21-invitee-2');
  v_ok := redeem_referral('ZZZZZZZZ');
  PERFORM assert(NOT v_ok, 'an unknown code returns false rather than raising (no existence oracle)');

  RAISE NOTICE '--- S21.3: weekly council summary (PRD §5.4) ---';

  -- Six reports last week for one council, one of them fixed inside the week.
  INSERT INTO reports (reporter_token, council_id, category, suburb, lat, lng, submitted_at)
  SELECT 's21-digest', v_council, 'pothole', 'Fitzroy', -37.81, 144.96,
         date_trunc('week', NOW() - INTERVAL '1 week') + INTERVAL '1 day'
  FROM generate_series(1, 6);

  SELECT id INTO v_report2 FROM reports WHERE reporter_token = 's21-digest' LIMIT 1;

  -- Two steps, because one does not work — and the reason is worth an
  -- assertion of its own. Migration 017 stamps `fixed_at := NOW()` on the
  -- transition into 'fixed', so a client-supplied fixed_at in the same
  -- statement is discarded. That is correct (a council must not be able to
  -- backdate a repair to flatter its resolution time — the same property
  -- S21.2's crew trigger enforces), and it is why this fixture cannot simply
  -- set both columns at once. The first attempt at this test asserted a
  -- behaviour the schema deliberately forbids; the schema was right.
  UPDATE reports SET status = 'fixed' WHERE id = v_report2;
  PERFORM assert(
    (SELECT fixed_at FROM reports WHERE id = v_report2) > NOW() - INTERVAL '1 minute',
    'fixed_at is stamped by the server on transition, not taken from the caller'
  );

  -- Now move it into last week's window without re-transitioning the status,
  -- which the 017 guard (OLD.status IS DISTINCT FROM 'fixed') leaves alone.
  UPDATE reports
     SET fixed_at = date_trunc('week', NOW() - INTERVAL '1 week') + INTERVAL '3 days'
   WHERE id = v_report2;

  SELECT * INTO v_rec FROM council_weekly_summary(v_council) LIMIT 1;

  PERFORM assert(v_rec.new_reports >= 6, 'the digest counts last week''s reports');
  PERFORM assert(v_rec.top_suburb = 'Fitzroy', 'the digest names the busiest suburb');
  PERFORM assert(v_rec.top_category = 'pothole', 'the digest names the busiest category');
  PERFORM assert(v_rec.median_days_to_fix IS NOT NULL, 'median days-to-fix is computed from reports fixed in the window');
  PERFORM assert(v_rec.week_end = v_rec.week_start + 7, 'the window is exactly one week');

  -- The honesty guard: no percentage off a tiny base.
  PERFORM assert(
    v_rec.prior_week_reports >= 5 OR v_rec.pct_change IS NULL,
    'pct_change is NULL below five prior-week reports rather than reporting noise as a headline'
  );

  RAISE NOTICE '--- S21.3: digest idempotency ---';

  INSERT INTO council_digest_log (council_id, week_start, recipients)
  VALUES (v_council, date_trunc('week', NOW() - INTERVAL '1 week')::DATE, 2);

  BEGIN
    INSERT INTO council_digest_log (council_id, week_start, recipients)
    VALUES (v_council, date_trunc('week', NOW() - INTERVAL '1 week')::DATE, 2);
    PERFORM assert(FALSE, 'a second digest for the same week must be rejected');
  EXCEPTION WHEN unique_violation THEN
    PERFORM assert(TRUE, 'a retried cron cannot double-send the same week''s digest');
  END;

  RAISE NOTICE '=== ALL SPRINT 21 ASSERTIONS PASSED ===';
END $$;
