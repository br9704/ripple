-- ============================================================
-- 023 — ai_correction_log (S21.1)
--
-- Source: PRD §16 Q7, which is a *resolved* decision, not an open question:
--   "Should AI classification corrections be used to retrain the model?
--    Yes — log corrections in `ai_correction_log` table. Use for periodic
--    fine-tuning."
--
-- Nothing had ever been built for it. `reports` carries three columns that
-- almost do the job (`ai_category`, `ai_confidence`, `user_corrected_ai`) and
-- that near-miss is why the gap survived twenty sprints: a boolean saying the
-- model was wrong looks like the feature until you try to train on it.
--
-- The distinction that matters: `reports.user_corrected_ai` records *that* the
-- prediction was rejected. Retraining needs *what it was rejected in favour
-- of* — the confusion pair. "Model said `dumping`, human said `graffiti`, at
-- 0.42 confidence" is a training example. "Model was wrong" is not.
--
-- ── Why this is a separate table and not more columns on `reports` ──
-- A report has one final category but can be corrected more than once before
-- submit, and the model version that made the prediction changes underneath
-- both. Columns would keep only the last correction and would silently rewrite
-- history every time the model is swapped. A log is append-only by nature,
-- which is the shape the retraining consumer (OG2) actually wants.
--
-- ── Privacy (PRD §13.1, §13.2) ──
-- There is deliberately NO reporter_token here. The retraining signal is
-- (image class → correct class); who submitted it is irrelevant to that and
-- storing it would create a per-user record of what people photograph, which
-- is precisely the surveillance shape PRD §13.6 rules out. The report_id FK is
-- kept because the photo lives there and the fine-tune needs the image — but
-- ON DELETE CASCADE means a deleted report takes its training row with it,
-- rather than leaving an orphaned record of a decision the user withdrew.
-- ============================================================

CREATE TABLE ai_correction_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id            UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  -- What the model said. NOT NULL: a correction with no prediction to correct
  -- is not a correction, and admitting a NULL here would let a malformed write
  -- pollute the training set with an unlabelled example.
  predicted_category   TEXT NOT NULL,
  predicted_confidence NUMERIC(4,3),

  -- What the human said instead. Constrained to the PRD §6.2 category set —
  -- the same list migration 003 enforces on reports.category. A free-text
  -- label would be unusable as a training target.
  corrected_category   TEXT NOT NULL CHECK (corrected_category IN (
    'pothole', 'streetlight', 'graffiti', 'signage',
    'accessibility', 'dumping', 'water', 'tree', 'footpath', 'other'
  )),

  -- Which model produced the prediction. Without this the log is unusable the
  -- first time the model is swapped (S7.2 made the model URL versioned exactly
  -- so it could be), because corrections against two different models would be
  -- indistinguishable and averaging them would train on noise.
  model_version        TEXT NOT NULL,

  corrected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A "correction" where both labels agree is a confirmation, not a
  -- correction, and would teach the model to keep doing what it already does.
  CONSTRAINT correction_actually_corrects CHECK (predicted_category <> corrected_category)
);

-- The only two queries this table has: "give me the training set for model X"
-- and "which classes does the model confuse?".
CREATE INDEX idx_ai_correction_log_model   ON ai_correction_log(model_version, corrected_at DESC);
CREATE INDEX idx_ai_correction_log_pair    ON ai_correction_log(predicted_category, corrected_category);
CREATE INDEX idx_ai_correction_log_report  ON ai_correction_log(report_id);

ALTER TABLE ai_correction_log ENABLE ROW LEVEL SECURITY;

-- No public policy of any kind, which in RLS means: the anon key can neither
-- read nor write this table. Writes come from the submit-report Edge Function
-- under the service role (which bypasses RLS by design), and reads are an
-- offline training job, not a product surface.
--
-- Stated explicitly because "no policy" and "policy missing by accident" look
-- identical in a schema dump, and migration 015 exists because of exactly that
-- ambiguity going the other way.
COMMENT ON TABLE ai_correction_log IS
  'PRD §16 Q7. Append-only confusion pairs for periodic fine-tuning (OG2). No reporter_token by design — the training signal is image→class, and attaching identity would create a record of what individuals photograph. RLS on with no policies: service_role only.';

COMMENT ON COLUMN ai_correction_log.model_version IS
  'The versioned model filename that made the prediction. Corrections against different models must never be pooled.';

-- ── Convenience view for the fine-tune job (OG2) ──
-- The confusion matrix, which is the first thing anyone looks at before
-- retraining and the thing that tells you whether retraining is even the right
-- fix — two classes that are genuinely ambiguous to a human photographer
-- (signage vs graffiti on a sign) need a UI change, not more epochs.
CREATE OR REPLACE VIEW ai_confusion_pairs AS
  SELECT
    model_version,
    predicted_category,
    corrected_category,
    COUNT(*)                              AS occurrences,
    ROUND(AVG(predicted_confidence), 3)   AS avg_confidence_when_wrong,
    MAX(corrected_at)                     AS last_seen
  FROM ai_correction_log
  GROUP BY model_version, predicted_category, corrected_category
  ORDER BY occurrences DESC;

COMMENT ON VIEW ai_confusion_pairs IS
  'Confusion matrix over logged corrections. High occurrences at high avg_confidence_when_wrong is the dangerous quadrant: the model is confidently wrong, which no amount of confidence-thresholding in the UI will fix.';
