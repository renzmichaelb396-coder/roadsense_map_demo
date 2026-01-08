-- FINAL GOALSS FIX:
-- Allow anon + authenticated users to UPDATE (resolve) and DELETE hazards

ALTER TABLE public.hazards ENABLE ROW LEVEL SECURITY;

-- UPDATE (resolve)
DROP POLICY IF EXISTS "allow public update hazards" ON public.hazards;
CREATE POLICY "allow public update hazards"
ON public.hazards
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE
DROP POLICY IF EXISTS "allow public delete hazards" ON public.hazards;
CREATE POLICY "allow public delete hazards"
ON public.hazards
FOR DELETE
TO anon, authenticated
USING (true);
