-- Explicit application roles. A user can never assign their own role through
-- the public API; role changes require a trusted Supabase administrator.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('traveler', 'organizer', 'admin'));

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
    from public.profiles as p
   where p.id = (select auth.uid());
$$;

revoke all on function public.current_app_role() from public, anon, authenticated;
grant execute on function public.current_app_role() to authenticated;

-- A traveler may own/read profile data but cannot manage trips. Organizers
-- manage only their own trips; admins may review/manage all trip rows.
drop policy "users create trips they own" on public.trips;
create policy "organizers create trips they own"
  on public.trips for insert
  to authenticated
  with check (
    organizer_id = (select auth.uid())
    and (select public.current_app_role()) in ('organizer', 'admin')
  );

drop policy "organizers update their own trips" on public.trips;
create policy "organizers update their own trips"
  on public.trips for update
  to authenticated
  using (
    organizer_id = (select auth.uid())
    and (select public.current_app_role()) in ('organizer', 'admin')
  )
  with check (
    organizer_id = (select auth.uid())
    and (select public.current_app_role()) in ('organizer', 'admin')
  );

create policy "admins manage all trips"
  on public.trips for all
  to authenticated
  using ((select public.current_app_role()) = 'admin')
  with check ((select public.current_app_role()) = 'admin');

drop policy "organizers delete their own trips" on public.trips;
create policy "organizers delete their own trips"
  on public.trips for delete
  to authenticated
  using (
    organizer_id = (select auth.uid())
    and (select public.current_app_role()) in ('organizer', 'admin')
  );

create policy "admins read all trips"
  on public.trips for select
  to authenticated
  using ((select public.current_app_role()) = 'admin');

-- Organizers can see only booking/payment operations for trips they own.
-- Admins can inspect all booking and payment rows for support/review.
create policy "organizers read bookings for owned trips"
  on public.bookings for select
  to authenticated
  using (
    (select public.current_app_role()) = 'organizer'
    and exists (
      select 1 from public.trips as t
       where t.id = bookings.trip_id
         and t.organizer_id = (select auth.uid())
    )
  );

create policy "admins read all bookings"
  on public.bookings for select
  to authenticated
  using ((select public.current_app_role()) = 'admin');

create policy "organizers read payments for owned trips"
  on public.payments for select
  to authenticated
  using (
    (select public.current_app_role()) = 'organizer'
    and exists (
      select 1
        from public.bookings as b
        join public.trips as t on t.id = b.trip_id
       where b.id = payments.booking_id
         and t.organizer_id = (select auth.uid())
    )
  );

create policy "admins read all payments"
  on public.payments for select
  to authenticated
  using ((select public.current_app_role()) = 'admin');
