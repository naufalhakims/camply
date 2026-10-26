-- Trips stop being publicly discoverable once their start time has passed.
-- The separate organizer-owned and admin policies still allow those users to
-- access their operational/archive records.

drop policy if exists "published trips are publicly readable" on public.trips;

create policy "upcoming published trips are publicly readable"
  on public.trips for select
  to anon, authenticated
  using (status = 'published' and starts_at > now());
