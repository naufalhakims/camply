-- RLS / authorization tests for profiles and trips.
--
-- Run with:  npx supabase test db
-- Requires Docker Desktop running (Supabase starts a local Postgres in a container).
--
-- These assert the AGENTS.md s10 checklist against the real policies and the real
-- column grants -- not against a description of them. Everything runs inside one
-- transaction that is rolled back, so the local database is left untouched.
--
-- Impersonation technique: `set local role <role>` switches identity for the rest
-- of the transaction, and `reset role` returns to the session user (postgres).
-- `reset role` needs no role membership, which is why every identity switch below
-- is written as `reset role; set local role postgres; set local role ...` -- going straight
-- from one non-superuser role to another would fail.
--
-- IMPORTANT: auth.uid() reads the per-claim GUC `request.jwt.claim.sub`, NOT the
-- `request.jwt.claims` JSON blob. Setting the wrong one leaves auth.uid() NULL,
-- which makes every "cannot access" assertion pass for the WRONG reason (nothing
-- matches because there is no identity at all). Always set `request.jwt.claim.sub`.
--
-- Note: set_config('role', ...) is deliberately NOT used. It is rejected inside a
-- SECURITY DEFINER function ("cannot set parameter role within security-definer
-- function"), and doing it inline works but reads worse than SET LOCAL ROLE.

begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
-- Qualify pgTAP functions because the linked test runner's connection search
-- path can differ from the Supabase API's configured extra_search_path.
-- Supabase CLI connects as cli_login_postgres, which intentionally lacks USAGE
-- on extensions. Grant that temporary permission inside this test transaction;
-- rollback at the end removes it. The local postgres role already has access.
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

select extensions.plan(30);

-- ---------------------------------------------------------------------------
-- Fixtures, created while still connected as the superuser.
--
-- alice and bob each own a trip; carol owns nothing. Fixed ids so assertions can
-- reference them directly.
-- Note: `confirmed_at` is generated from the email/phone confirmation columns,
-- so fixtures must set the writable `email_confirmed_at` column instead.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@example.com', now(), '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@example.com', now(),
   '{"display_name":"Bob From Metadata"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carol@example.com', now(), '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- 1-3. The on-signup trigger created one profile per user, with a usable name.
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.profiles
    where id in ('11111111-1111-1111-1111-111111111111',
                 '22222222-2222-2222-2222-222222222222',
                 '33333333-3333-3333-3333-333333333333')),
  3,
  'signup trigger created a profile for every new auth user'
);

select extensions.is(
  (select display_name from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'),
  'alice',
  'display_name falls back to the email local-part when metadata is absent'
);

select extensions.is(
  (select role from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'),
  'traveler',
  'new users default to the traveler role'
);

-- Two trips owned by alice: one published (world-readable), one draft (private).
insert into public.trips (id, organizer_id, slug, title, destination,
                          starts_at, ends_at, price, capacity, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'rinjani-summit', 'Rinjani Summit Trek', 'Lombok',
   now() + interval '30 days', now() + interval '33 days', 2500000.00, 12, 'published'),
  ('aaaaaaaa-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'secret-draft', 'Unannounced Draft Trip', 'Flores',
   now() + interval '60 days', now() + interval '63 days', 3000000.00, 8, 'draft');

-- ===========================================================================
-- profiles: own-row access only
-- ===========================================================================

-- Become alice.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Guard: prove the impersonation actually took effect. Without this, a silently
-- NULL auth.uid() would make the "cannot" assertions below pass vacuously.
select extensions.is(
  (select auth.uid()),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'impersonation works: auth.uid() resolves to alice'
);

-- 5. Alice may edit her own display_name.
select extensions.lives_ok(
  $$ update public.profiles set display_name = 'Alice A'
      where id = '11111111-1111-1111-1111-111111111111' $$,
  'traveler can update their own display_name'
);

-- 6. THE privilege-escalation test. `role` has no UPDATE grant, so this must fail
--    with insufficient_privilege (42501) even though RLS would allow the row.
--    RLS alone would NOT stop this -- the column grant is what stops it.
select extensions.throws_ok(
  $$ update public.profiles set role = 'admin'
      where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'traveler CANNOT promote themselves to admin via a profile update'
);

-- 7. Nor may alice touch bob's row. RLS filters that row out of her USING clause,
--    so the update quietly matches nothing rather than raising. Test 8 asserts
--    the no-effect invariant directly.
select extensions.lives_ok(
  $$ update public.profiles set display_name = 'Hijacked'
      where id = '22222222-2222-2222-2222-222222222222' $$,
  'traveler update against another traveler''s profile is filtered by RLS, not an error'
);

-- 8. Bob's row is intact. (Metadata outranks the email fallback, hence the value.)
reset role;
set local role postgres;
select extensions.is(
  (select display_name from public.profiles
    where id = '22222222-2222-2222-2222-222222222222'),
  'Bob From Metadata',
  'another traveler''s profile is unchanged by the attempted update'
);

-- Become alice again.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 9. Alice cannot insert a profile row at all (no INSERT grant).
select extensions.throws_ok(
  $$ insert into public.profiles (id, display_name)
     values ('44444444-4444-4444-4444-444444444444', 'Mallory') $$,
  '42501',
  null,
  'traveler cannot insert a profile row directly'
);

-- 10. The `role` column is not even readable by a client.
select extensions.throws_ok(
  $$ select role from public.profiles $$,
  '42501',
  null,
  'clients have no SELECT privilege on profiles.role'
);

-- ===========================================================================
-- trips: published-only for the public, ownership for organizers
-- ===========================================================================

-- 11. Anonymous visitors see the published trip.
reset role;
set local role postgres;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select extensions.is(
  (select count(*)::int from public.trips
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'anonymous user can read a published trip'
);

-- 12. ...but never the draft.
select extensions.is(
  (select count(*)::int from public.trips
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  0,
  'anonymous user CANNOT read a draft trip'
);

-- 13. A different signed-in user also cannot see the draft.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select count(*)::int from public.trips
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  0,
  'another user CANNOT read someone else''s draft trip'
);

-- 14. The owner sees their own draft. This is the test that exposed the NULL
--     auth.uid() bug: it is the only one that requires a working identity.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select count(*)::int from public.trips
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  1,
  'organizer CAN read their own draft trip'
);

-- 15. Bob cannot edit alice's trip. RLS filters her row out of his USING clause,
--     so the update matches nothing. Test 16 asserts the trip is unchanged.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.lives_ok(
  $$ update public.trips set title = 'Stolen', price = 1.00
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'organizer update against another organizer''s trip is filtered by RLS, not an error'
);

-- 16. Alice's trip is intact.
reset role;
set local role postgres;
select extensions.is(
  (select title from public.trips
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Rinjani Summit Trek',
  'another organizer''s trip is unchanged by the attempted update'
);

-- 17. Nor may bob delete it.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.lives_ok(
  $$ delete from public.trips
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'organizer delete against another organizer''s trip is filtered by RLS, not an error'
);

-- 18. The trip still exists, so neither the update nor the delete bit.
reset role;
set local role postgres;
select extensions.is(
  (select count(*)::int from public.trips
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'another organizer''s trip still exists after attempted update and delete'
);

-- 19. Bob cannot create a trip owned by alice. WITH CHECK rejects the row.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.throws_ok(
  $$ insert into public.trips
       (organizer_id, slug, title, destination, starts_at, ends_at, price, capacity)
     values ('11111111-1111-1111-1111-111111111111', 'spoofed', 'Spoofed Trip',
             'Nowhere', now() + interval '10 days', now() + interval '12 days',
             100.00, 4) $$,
  '42501',
  null,
  'user CANNOT create a trip owned by someone else'
);

-- 20. Nor can bob reassign his own trip to alice (organizer_id is not updatable).
reset role;
set local role postgres;
insert into public.trips (id, organizer_id, slug, title, destination,
                          starts_at, ends_at, price, capacity, status)
values ('bbbbbbbb-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'bobs-trip', 'Bob''s Trip', 'Bali',
        now() + interval '20 days', now() + interval '22 days', 500000.00, 6, 'draft');

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.throws_ok(
  $$ update public.trips
        set organizer_id = '11111111-1111-1111-1111-111111111111'
      where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'organizer CANNOT reassign trip ownership to another user'
);

-- ===========================================================================
-- bookings: atomic capacity holds, price snapshots, and traveler privacy
-- ===========================================================================

-- Alice reserves two seats on her published Rinjani trip. Price/currency must
-- be calculated from the database trip row, not client-supplied values.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select total_amount from public.reserve_trip_seats(
    'aaaaaaaa-0000-0000-0000-000000000001', 2)),
  5000000.00::numeric,
  'reservation total is computed from trusted trip price times quantity'
);

select extensions.is(
  (select status from public.bookings
    where traveler_id = '11111111-1111-1111-1111-111111111111'
      and trip_id = 'aaaaaaaa-0000-0000-0000-000000000001'
      and status = 'pending_payment'),
  'pending_payment',
  'new reservation starts pending payment'
);

-- Bob cannot see Alice's private booking, even though he can read the trip.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select count(*)::int from public.bookings
    where traveler_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'traveler CANNOT read another traveler''s booking'
);

select extensions.throws_ok(
  $$ update public.bookings set status = 'confirmed'
      where traveler_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'traveler cannot write booking/payment status directly'
);

-- Reusing the same active booking slot fails, and an additional reservation
-- that exceeds capacity is rejected inside the database function.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.throws_ok(
  $$ select public.reserve_trip_seats('aaaaaaaa-0000-0000-0000-000000000001', 1) $$,
  '23505', null,
  'traveler cannot create a second active booking for the same trip'
);

reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.throws_ok(
  $$ select public.reserve_trip_seats('aaaaaaaa-0000-0000-0000-000000000001', 11) $$,
  'P0001', null,
  'database rejects a reservation that would exceed trip capacity'
);

-- Alice cancels her own pending hold; the slot can then be reserved again.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select status from public.cancel_pending_booking(
    (select id from public.bookings
      where traveler_id = '11111111-1111-1111-1111-111111111111'
        and trip_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        and status = 'pending_payment'))),
  'cancelled',
  'traveler can cancel their own pending reservation'
);

select extensions.is(
  (select status from public.reserve_trip_seats(
    'aaaaaaaa-0000-0000-0000-000000000001', 2)),
  'pending_payment',
  'cancelling a hold releases its active booking slot'
);

-- Bob takes ten seats while Alice holds two. Alice cannot see Bob's booking
-- row under RLS; the capacity trigger must nevertheless count it securely.
reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select quantity from public.reserve_trip_seats(
    'aaaaaaaa-0000-0000-0000-000000000001', 10)),
  10,
  'another traveler can reserve remaining seats'
);

reset role;
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.throws_ok(
  $$ update public.trips set capacity = 3
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'P0001', null,
  'organizer cannot lower capacity below another traveler''s hidden booking'
);

select * from extensions.finish();
rollback;
