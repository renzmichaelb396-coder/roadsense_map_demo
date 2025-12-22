-- RoadSense PH — LIPAT v9
-- Last-Write-Wins (LWW) conflict guard for hazards
-- Client timestamps are source of truth

ALTER TABLE public.hazards
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS hazards_updated_at_idx
  ON public.hazards (updated_at);

CREATE OR REPLACE FUNCTION public.hazards_lww_guard()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.updated_at <= OLD.updated_at THEN
      RETURN OLD;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hazards_lww ON public.hazards;

CREATE TRIGGER trg_hazards_lww
BEFORE UPDATE ON public.hazards
FOR EACH ROW
EXECUTE FUNCTION public.hazards_lww_guard();
