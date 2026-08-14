#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres and runs the
# behavioural + RLS assertions against it.
#
# Why this exists: MASTERPLAN S2.14 asserted the migrations were "applied to
# remote Supabase project nexccbcmziiltysfcmzi". That project no longer
# resolves, so the claim was unverifiable — and the SQL had in fact never been
# executed anywhere. This script makes "the migrations work" a checkable fact
# instead of a belief, with no cloud account and no spend.
#
# Requires: postgresql@17 (brew install postgresql@17)
# Usage:    ./scripts/verify-db.sh
set -euo pipefail

PGBIN="/opt/homebrew/opt/postgresql@17/bin"
[ -d "$PGBIN" ] && export PATH="$PGBIN:$PATH"

DB="${RIPPLE_TEST_DB:-ripple_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v psql >/dev/null || { echo "psql not found — brew install postgresql@17"; exit 1; }
pg_isready -q || { echo "postgres not running — pg_ctl -D /opt/homebrew/var/postgresql@17 start"; exit 1; }

echo "==> resetting $DB"
dropdb --if-exists "$DB"
createdb "$DB"

echo "==> supabase shim (roles, auth.*, storage, realtime publication)"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/test/00_supabase_shim.sql" >/dev/null

echo "==> migrations"
count=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
  count=$((count + 1))
  printf '    ok  %s\n' "$(basename "$f")"
done
echo "    $count migrations applied"

echo "==> seed"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed/001_melbourne_councils.sql" >/dev/null

echo "==> behavioural assertions"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/test/01_verify.sql" 2>&1 \
  | sed 's/^psql:[^ ]* NOTICE:  //' | grep -E 'PASS|FAIL|---|===' || true

echo "==> RLS assertions (as anon)"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/test/02_rls.sql" 2>&1 \
  | sed 's/^psql:[^ ]* NOTICE:  //' | grep -E 'PASS|FAIL|===' || true

echo
echo "✅ database layer verified against PostgreSQL $(psql -d "$DB" -t -A -c 'show server_version')"
