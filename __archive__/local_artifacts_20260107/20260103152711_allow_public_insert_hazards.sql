-- Restore GOALSS behavior: allow anon/public clients to INSERT hazards again.
-- This removes any user_id "must not be null" constraints and adds explicit INSERT policies.

-- 1) Make user_id nullable (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hazards' AND column_name='user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.hazards ALTER COLUMN user_id DROP NOT NULL';
  END IF;
END $$;

-- 2) Drop any CHECK constraints that reference user_id (defensive; name may vary)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname, oid
    FROM pg_constraint
    WHERE conrelid = 'public.hazards'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%user_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.hazards DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 3) RLS policies: allow INSERT for anon + authenticated
ALTER TABLE public.hazards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow public insert hazards" ON public.hazards;
CREATE POLICY "allow public insert hazards"
ON public.hazards
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "allow authenticated insert hazards" ON public.hazards;
CREATE POLICY "allow authenticated insert hazards"
ON public.hazards
FOR INSERT
TO authenticated
WITH CHECK (true);
