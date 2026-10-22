-- Allow an authenticated user to assign their own id when creating a trip.
-- The existing RLS WITH CHECK policy still enforces organizer_id = auth.uid().
grant insert (organizer_id) on public.trips to authenticated;
