-- GOALSS FIX: align hazards.status with app values (REPORTED / RESOLVED)

ALTER TABLE public.hazards
DROP CONSTRAINT IF EXISTS hazards_status_check;

ALTER TABLE public.hazards
ADD CONSTRAINT hazards_status_check
CHECK (status IN ('REPORTED', 'RESOLVED'));
