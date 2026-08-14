-- ============================================================
-- Supabase-compatible shim for local migration verification.
--
-- NOT a migration. Never applied to a real project — Supabase provides all of
-- this natively. Its only job is to let `supabase/migrations/*.sql` run
-- unmodified against a plain Postgres so we can prove they actually apply,
-- that the triggers fire, and that the RLS policies do what their names claim.
--
-- Until now none of that had ever been executed anywhere: MASTERPLAN S2.14
-- asserted the migrations were applied to a remote project whose ref no longer
-- resolves, so "the SQL is correct" was an assumption, not a finding.
-- ============================================================

-- ── Roles Supabase defines for us ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- ── auth schema ──
CREATE SCHEMA IF NOT EXISTS auth;

-- Supabase derives these from the request JWT. Locally we drive them from
-- session GUCs so a test can impersonate an anonymous visitor, a council
-- coordinator, or the service role.
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.jwt() ->> 'role',
    current_setting('role', true),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- ── Realtime publication (migration 014 adds `reports` to it) ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- ── storage schema ──
-- Supabase Storage owns these tables. Migration 013 inserts a bucket row, so a
-- minimal stand-in is enough to prove that migration is syntactically valid and
-- idempotent.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  public             BOOLEAN DEFAULT FALSE,
  file_size_limit    BIGINT,
  allowed_mime_types TEXT[],
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id  TEXT REFERENCES storage.buckets(id),
  name       TEXT,
  owner      UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
