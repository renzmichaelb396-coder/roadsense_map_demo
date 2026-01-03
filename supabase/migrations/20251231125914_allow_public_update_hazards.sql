-- Allow public (anon) clients to UPDATE hazards (resolve/delete are UPDATE operations)
-- This is MVP-permissive. Tighten later by source/city/etc if needed.

-- Drop conflicting older policies (safe if they don’t exist)
drop policy if exists "allow public update hazards" on public.hazards;
drop policy if exists "public update hazards" on public.hazards;
drop policy if exists "update hazards" on public.hazards;

-- Recreate permissive UPDATE policy
create policy "allow public update hazards"
on public.hazards
as permissive
for update
to public
using (true)
with check (true);
