-- ============================================================
-- 024 — Crew ticket assignment (S21.2)
--
-- Source: PRD §6.7 F007 — "Assign to crew (Phase 3): link report to internal
-- crew ticket number." Phase 3 (Sprints 17–18) was closed without it.
--
-- ── What this is and is not ──
-- It is a *reference* field, not an integration. PRD §14 explicitly lists
-- "Automated crew dispatch" as out of scope because it "requires council ERP
-- access", and Phase 5 is where the Pathway/TechOne API work lives. What a
-- coordinator needs today is the one thing that closes the loop between the
-- two systems they already use: the ticket number they typed into their own
-- back-office, written next to the report it came from, so the next person to
-- open the dashboard can find it.
--
-- The temptation is to model crews as a table with members and shifts. That
-- would be inventing a workforce-management product inside a reporting one,
-- against a PRD that asked for a text field. The ticket ref stays opaque
-- precisely because every council's format differs and we do not get to
-- dictate it.
-- ============================================================

ALTER TABLE reports
  ADD COLUMN crew_ticket_ref  TEXT,
  ADD COLUMN crew_assigned_at TIMESTAMPTZ;

-- Bounded so a paste accident cannot write an essay into a reference field,
-- and non-blank so the column has exactly two meaningful states (assigned /
-- not assigned) rather than three (assigned / not assigned / assigned to '').
ALTER TABLE reports
  ADD CONSTRAINT crew_ticket_ref_sane
  CHECK (crew_ticket_ref IS NULL OR char_length(btrim(crew_ticket_ref)) BETWEEN 1 AND 64);

-- The timestamp is derived, never client-supplied: a council could otherwise
-- backdate an assignment to make a response time look better than it was, and
-- resolution time is the metric this product exists to make visible.
CREATE OR REPLACE FUNCTION stamp_crew_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.crew_ticket_ref IS DISTINCT FROM OLD.crew_ticket_ref THEN
    NEW.crew_assigned_at := CASE
      WHEN NEW.crew_ticket_ref IS NULL THEN NULL   -- unassigned: clear the stamp
      ELSE NOW()
    END;
    NEW.crew_ticket_ref := NULLIF(btrim(NEW.crew_ticket_ref), '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stamp_crew_assignment ON reports;
CREATE TRIGGER trg_stamp_crew_assignment
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION stamp_crew_assignment();

-- Partial index: the only query is "show me this council's assigned reports",
-- and the vast majority of rows have no ticket. Indexing the NULLs would be
-- most of the index for none of the lookups.
CREATE INDEX idx_reports_crew_ticket
  ON reports(council_id, crew_assigned_at DESC)
  WHERE crew_ticket_ref IS NOT NULL;

COMMENT ON COLUMN reports.crew_ticket_ref IS
  'PRD §6.7 F007. Opaque reference to the council''s own back-office ticket. Deliberately unvalidated in format — every council numbers differently, and rejecting a real ticket number because it did not match our regex would push staff back to email.';

COMMENT ON COLUMN reports.crew_assigned_at IS
  'Set by trigger, never by the client. A council must not be able to backdate an assignment: resolution time is the number this product exists to expose.';

-- ── Who may write it ──
-- Nothing new is needed. Migration 020's reports_update_council policy already
-- scopes UPDATE to the caller's own council, and the anon role has no UPDATE
-- policy on reports at all. Recorded here because "no policy added" should be
-- a stated conclusion rather than something a later reader has to infer —
-- migration 015 exists because an unstated assumption went the other way.
