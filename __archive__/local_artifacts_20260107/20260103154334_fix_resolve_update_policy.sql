-- FINAL FIX: allow resolving hazards (UPDATE status only)

ALTER TABLE public.hazards ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting update policies
DROP POLICY IF EXISTS "allow public update hazards" ON public.hazards;
DROP POLICY IF EXISTS "allow authenticated update hazards" ON public.hazards;

-- Explicit UPDATE policy for resolve flow
CREATE POLICY "allow public resolve hazards"
ON public.hazards
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  status IN ('REPORTED', 'RESOLVED')
);
