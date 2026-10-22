-- RLS and business-rule tests for anonymous trip-game rooms.
-- Run without Docker using: npx supabase db query --linked --file supabase/tests/trip_game.test.sql

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

select extensions.plan(22);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.com', now(), '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.com', now(), '{"signup_role":"organizer"}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carol@example.com', now(), '{}'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dave@example.com', now(), '{}'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'erin@example.com', now(), '{"signup_role":"organizer"}');

insert into public.trips (id, organizer_id, slug, title, destination,
                          starts_at, ends_at, price, capacity, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000003',
   '22222222-2222-2222-2222-222222222222',
   'anonymous-game-test', 'Anonymous Game Test', 'Yogyakarta',
   now() + interval '30 days', now() + interval '32 days', 100000.00, 10, 'published'),
  ('aaaaaaaa-0000-0000-0000-000000000004',
   '55555555-5555-5555-5555-555555555555',
   'other-organizer-game-test', 'Other Organizer Game Test', 'Bandung',
   now() + interval '40 days', now() + interval '42 days', 100000.00, 10, 'published');

insert into public.bookings (traveler_id, trip_id, quantity, total_amount, currency, status, expires_at)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   1, 100000.00, 'IDR', 'confirmed', now() + interval '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000003',
   1, 100000.00, 'IDR', 'confirmed', now() + interval '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000003',
   1, 100000.00, 'IDR', 'pending_payment', now() + interval '1 day');

-- Owner creates the room.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.trip_game_rooms (trip_id, prompt)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'Apa cerita kecil yang paling ingin kamu bawa pulang?');
reset role;
set local role postgres;

-- Alice and Carol submit independently; author ids remain inaccessible to clients.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.alice_response_id',
  public.submit_trip_game_response(
    (select id from public.trip_game_rooms where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
    'Aku ingin mengingat suara hujan di tenda.'
  )::text, true);

select extensions.is(
  (select count(*)::int from public.trip_game_rooms
    where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  1,
  'confirmed participant can read the room'
);
select extensions.is(
  (select prompt from public.trip_game_rooms
    where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'Apa cerita kecil yang paling ingin kamu bawa pulang?',
  'participants can read the organizer prompt'
);
select extensions.is(
  public.trip_game_my_response_id(
    (select id from public.trip_game_rooms where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003')
  )::text,
  current_setting('test.alice_response_id'),
  'participant can identify only their own response'
);
select extensions.throws_ok(
  $$ select author_id from public.trip_game_responses $$,
  '42501', null,
  'participants cannot read response author ids'
);
select extensions.throws_ok(
  $$ insert into public.trip_game_responses (room_id, author_id, body)
     values ((select id from public.trip_game_rooms limit 1), auth.uid(), 'Forged response') $$,
  '42501', null,
  'participants cannot bypass response submission function'
);
select extensions.throws_ok(
  $$ select public.submit_trip_game_response(
       (select id from public.trip_game_rooms limit 1), 'Second response') $$,
  '23505', null,
  'a participant may submit only one response per room'
);
select extensions.throws_ok(
  $$ select public.report_trip_game_response(
       current_setting('test.alice_response_id')::uuid, 'This is my own response') $$,
  'P0001', 'You cannot report your own response',
  'participants cannot report their own response'
);

reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.carol_response_id',
  public.submit_trip_game_response(
    (select id from public.trip_game_rooms where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
    'Aku akan membawa pulang foto langit pagi.'
  )::text, true);
reset role;
set local role postgres;

-- Alice reports Carol's response; duplicates are rejected.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.report_id',
  public.report_trip_game_response(
    current_setting('test.carol_response_id')::uuid,
    'This response contains harmful details.'
  )::text, true);
select extensions.throws_ok(
  $$ select public.report_trip_game_response(
       current_setting('test.carol_response_id')::uuid,
       'This response contains harmful details.') $$,
  '23505', null,
  'a participant cannot submit duplicate reports for one response'
);
select extensions.throws_ok(
  $$ select reporter_id from public.trip_game_reports $$,
  '42501', null,
  'participants and moderators cannot read report authors'
);
reset role;
set local role postgres;

-- A pending booking is not eligible.
set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.is(
  (select count(*)::int from public.trip_game_rooms),
  0,
  'pending booking does not grant room access'
);
reset role;
set local role postgres;

-- A different organizer cannot see or create a room for Bob's trip.
set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.is(
  (select count(*)::int from public.trip_game_rooms),
  0,
  'organizer cannot read another organizer room'
);
select extensions.throws_ok(
  $$ insert into public.trip_game_rooms (trip_id, prompt)
     values ('aaaaaaaa-0000-0000-0000-000000000003', 'Another organizer prompt') $$,
  '42501', null,
  'organizer cannot create a room for another organizer trip'
);
reset role;
set local role postgres;

-- Organizer Bob can moderate anonymous content without learning authorship.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.is(
  (select count(*)::int from public.trip_game_reports
    where id = current_setting('test.report_id')::uuid and status = 'open'),
  1,
  'trip organizer can review a participant report'
);
select extensions.lives_ok(
  $$ update public.trip_game_responses set moderation_status = 'hidden'
       where id = current_setting('test.carol_response_id')::uuid $$,
  'trip organizer can hide an anonymous response'
);
select extensions.throws_ok(
  $$ select author_id from public.trip_game_responses $$,
  '42501', null,
  'trip organizer cannot read response author ids'
);
select extensions.lives_ok(
  $$ update public.trip_game_reports set status = 'resolved'
       where id = current_setting('test.report_id')::uuid $$,
  'trip organizer can resolve a report'
);
reset role;
set local role postgres;
select extensions.is(
  (select reviewed_by from public.trip_game_reports
    where id = current_setting('test.report_id')::uuid),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'report review audit stores the moderator identity'
);

-- Hidden response is removed from member visibility but retained for moderation.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.is(
  (select count(*)::int from public.trip_game_responses
    where id = current_setting('test.carol_response_id')::uuid),
  0,
  'participants cannot see a hidden response'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.is(
  (select count(*)::int from public.trip_game_responses
    where id = current_setting('test.carol_response_id')::uuid),
  1,
  'moderator can still inspect a hidden response'
);
select extensions.lives_ok(
  $$ update public.trip_game_rooms set status = 'completed'
       where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  'trip organizer can complete the game room'
);
reset role;
set local role postgres;
select extensions.ok(
  (select completed_at is not null from public.trip_game_rooms
    where trip_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'room completion is timestamped'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select extensions.throws_ok(
  $$ select public.submit_trip_game_response(
       (select id from public.trip_game_rooms limit 1), 'A late response') $$,
  'P0001', 'Game room is closed or unavailable',
  'completed room rejects new responses'
);

select * from extensions.finish(true);
rollback;
