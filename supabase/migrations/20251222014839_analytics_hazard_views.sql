-- RoadSense PH — LIPAT v9
-- LGU Analytics Views (SCHEMA-SAFE, NO DOCKER)
-- Uses ONLY verified existing columns

-- 1) Hazards by severity
CREATE OR REPLACE VIEW analytics_hazards_by_severity AS
SELECT
  severity,
  COUNT(*) AS total
FROM public.hazards
GROUP BY severity
ORDER BY severity;

-- 2) Hazards by status
CREATE OR REPLACE VIEW analytics_hazards_by_status AS
SELECT
  status,
  COUNT(*) AS total
FROM public.hazards
GROUP BY status
ORDER BY status;

-- 3) Combined severity × status
CREATE OR REPLACE VIEW analytics_hazards_summary AS
SELECT
  severity,
  status,
  COUNT(*) AS total
FROM public.hazards
GROUP BY severity, status
ORDER BY severity, status;

-- 4) Recent hazards (classification only)
CREATE OR REPLACE VIEW analytics_recent_hazards AS
SELECT
  id,
  type,
  severity,
  status,
  created_at,
  updated_at
FROM public.hazards
ORDER BY updated_at DESC
LIMIT 100;
