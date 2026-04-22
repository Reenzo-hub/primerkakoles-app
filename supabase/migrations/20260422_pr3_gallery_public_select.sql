-- PR 3: fix gallery SELECT policy so authenticated users also see public gallery.
-- The original policy was limited to the `anon` role; logged-in users (authenticated
-- role) were silently getting zero rows.

drop policy if exists "gallery public read" on public.generations;
drop policy if exists "generations public select" on public.generations;

create policy "generations public select" on public.generations
  for select using (true);
