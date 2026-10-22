-- Business-rule tests: only traveler-role users may book, pay, cancel pending
-- bookings, and participate in trip-game responses.
-- Run using the project's Supabase database test workflow.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
set local role postgres;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'cli_login_postgres') then
    grant usage on schema extensions to cli_login_postgres;
  end if;
end
$$;
reset role;
set local role postgres;

select extensions.plan(6);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('11111111-aaaa-aaaa-aaaa-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'traveler-rules@example.com', now(), '{}'),
  ('22222222-aaaa-aaaa-aaaa-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'organizer-rules@example.com', now(), '{"signup_role":"organizer"}');

insert into public.trips (id, organizer_id, slug, title, destination,
                          starts_at, ends_at, price, capacity, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '22222222-aaaa-aaaa-aaaa-222222222222',
   'traveler-only-game', 'Traveler Only Game', 'Yogyakarta',
   now() + interval '30 days', now() + interval '32 days', 100000.00, 10, 'published'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   '22222222-aaaa-aaaa-aaaa-222222222222',
   'traveler-only-booking', 'Traveler Only Booking', 'Bandung',
   now() + interval '40 days', now() + interval '42 days', 100000.00, 10, 'published');

insert into public.trip_game_rooms (trip_id, prompt)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Apa hal kecil yang ingin kamu kenang?');

insert into public.bookings (traveler_id, trip_id, quantity, total_amount, currency, status, expires_at)
values
  ('22222222-aaaa-aaaa-aaaa-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   1, 100000.00, 'IDR', 'confirmed', now() + interval '1 day'),
  ('11111111-aaaa-aaaa-aaaa-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   1, 100000.00, 'IDR', 'confirmed', now() + interval '1 day'),
  ('22222222-aaaa-aaaa-aaaa-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   1, 100000.00, 'IDR', 'pending_payment', now() + interval '1 day');

-- Organizer calls are rejected even when they own the trip or booking.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-aaaa-aaaa-aaaa-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.throws_ok(
  $$ select public.reserve_trip_seats('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1) $$,
  'P0001', 'Only travelers can book trips',
  'organizers cannot create bookings for their own trips'
);
select extensions.throws_ok(
  $$ select public.cancel_pending_booking((
       select id from public.bookings
        where traveler_id = auth.uid()
          and trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
     )) $$,
  'P0001', 'Only travelers can manage bookings',
  'organizers cannot cancel bookings through the traveler flow'
);
select extensions.throws_ok(
  $$ select public.complete_mock_payment((
       select id from public.bookings
        where traveler_id = auth.uid()
          and trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
     )) $$,
  'P0001', 'Only travelers can pay for bookings',
  'organizers cannot pay for bookings'
);
select extensions.throws_ok(
  $$ select public.submit_trip_game_response(
       (select id from public.trip_game_rooms
         where trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
       'Organizer response') $$,
  'P0001', 'Only travelers can participate in the trip game',
  'organizers cannot submit a game response despite a confirmed booking'
);
reset role;
set local role postgres;

-- Traveler role retains the booking and participant happy paths.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-aaaa-aaaa-aaaa-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.lives_ok(
  $$ select public.reserve_trip_seats('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1) $$,
  'travelers can reserve available seats'
);
select extensions.lives_ok(
  $$ select public.submit_trip_game_response(
       (select id from public.trip_game_rooms
         where trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
       'Traveler response') $$,
  'travelers with confirmed bookings can submit a game response'
);

select * from extensions.finish(true);
rollback;
