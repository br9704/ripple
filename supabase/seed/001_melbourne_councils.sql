-- Seed: Melbourne Councils — 5 inner-city councils for pilot
-- Source: PRD Q1 — City of Melbourne, City of Yarra, Moreland/Merri-bek, Darebin, Port Phillip

-- ============================================================
-- Councils
-- ============================================================

INSERT INTO councils (id, slug, name, state, contact_email, dashboard_enabled)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'city-of-melbourne',
    'City of Melbourne',
    'VIC',
    'info@melbourne.vic.gov.au',
    FALSE
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'city-of-yarra',
    'City of Yarra',
    'VIC',
    'info@yarracity.vic.gov.au',
    FALSE
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'merri-bek',
    'Merri-bek City Council',
    'VIC',
    'merri-bek@merri-bek.vic.gov.au',
    FALSE
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'city-of-darebin',
    'City of Darebin',
    'VIC',
    'mailbox@darebin.vic.gov.au',
    FALSE
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'city-of-port-phillip',
    'City of Port Phillip',
    'VIC',
    'assist@portphillip.vic.gov.au',
    FALSE
  );

-- ============================================================
-- Council Boundaries (placeholder polygons)
-- Real GeoJSON boundaries will be sourced from ABS Mesh Block data
-- These are approximate bounding boxes for development purposes only
-- ============================================================

INSERT INTO council_boundaries (council_id, polygon, source)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    '{
      "type": "MultiPolygon",
      "coordinates": [[[[144.9400, -37.7950], [144.9850, -37.7950], [144.9850, -37.8300], [144.9400, -37.8300], [144.9400, -37.7950]]]]
    }'::jsonb,
    'placeholder'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    '{
      "type": "MultiPolygon",
      "coordinates": [[[[144.9700, -37.7850], [145.0100, -37.7850], [145.0100, -37.8200], [144.9700, -37.8200], [144.9700, -37.7850]]]]
    }'::jsonb,
    'placeholder'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    '{
      "type": "MultiPolygon",
      "coordinates": [[[[144.9400, -37.7300], [144.9800, -37.7300], [144.9800, -37.7800], [144.9400, -37.7800], [144.9400, -37.7300]]]]
    }'::jsonb,
    'placeholder'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    '{
      "type": "MultiPolygon",
      "coordinates": [[[[144.9700, -37.7200], [145.0300, -37.7200], [145.0300, -37.7800], [144.9700, -37.7800], [144.9700, -37.7200]]]]
    }'::jsonb,
    'placeholder'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    '{
      "type": "MultiPolygon",
      "coordinates": [[[[144.9400, -37.8300], [144.9800, -37.8300], [144.9800, -37.8800], [144.9400, -37.8800], [144.9400, -37.8300]]]]
    }'::jsonb,
    'placeholder'
  );
