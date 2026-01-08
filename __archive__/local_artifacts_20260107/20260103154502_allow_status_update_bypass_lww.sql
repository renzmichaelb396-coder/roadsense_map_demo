-- Allow hazard RESOLVE to bypass LWW conflict guard
-- Status changes are authoritative LGU actions

CREATE OR REPLACE FUNCTION public.hazards_lww_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Always allow status-only updates
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Original LWW logic (preserve conflict protection)
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
