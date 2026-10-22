-- Bookings: a traveler may hold one active booking per trip, with multiple seats.
--
-- A reservation is created only through reserve_trip_seats(), which locks the
-- trip row before checking capacity. This serializes concurrent reservations
-- for the same trip and prevents a browser-side capacity race.

create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  traveler_id   uuid not null references public.profiles (id) on delete cascade,
  trip_id       uuid not null references public.trips (id) on delete restrict,
  quantity      integer not null check (quantity > 0),
  total_amount  numeric(14, 2) not null check (total_amount >= 0),
  currency      char(3) not null check (currency = upper(currency)),
  status        text not null default 'pending_payment'
                  check (status in ('pending_payment', 'confirmed', 'cancelled', 'expired')),
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.bookings is
  'Traveler reservations. Price and currency are snapshots; clients cannot write booking rows directly.';
comment on column public.bookings.total_amount is
  'Trip price multiplied by quantity at reservation time; later trip price changes do not alter this amount.';
comment on column public.bookings.expires_at is
  'Pending reservation expiry. Expired pending rows no longer consume capacity.';

-- Historical rows remain. A traveler may start a new booking after cancellation
-- or expiry, but can never hold two pending/confirmed bookings for the same trip.
create unique index bookings_one_active_per_traveler_trip_idx
  on public.bookings (traveler_id, trip_id)
  where status in ('pending_payment', 'confirmed');

create index bookings_traveler_created_idx
  on public.bookings (traveler_id, created_at desc);
create index bookings_trip_capacity_idx
  on public.bookings (trip_id, status, expires_at);

alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;

create policy "travelers read their own bookings"
  on public.bookings for select
  to authenticated
  using (traveler_id = (select auth.uid()));

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- Do not let an organizer lower capacity beneath existing confirmed seats or
-- unexpired pending reservations.
create or replace function public.prevent_capacity_below_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  occupied_seats bigint;
begin
  if new.capacity < old.capacity then
    select coalesce(sum(b.quantity), 0)
      into occupied_seats
      from public.bookings as b
     where b.trip_id = old.id
       and (b.status = 'confirmed'
         or (b.status = 'pending_payment' and b.expires_at > now()));

    if new.capacity < occupied_seats then
      raise exception 'Capacity cannot be lower than reserved seats';
    end if;
  end if;
  return new;
end;
$$;

create trigger trips_capacity_guard
  before update of capacity on public.trips
  for each row execute function public.prevent_capacity_below_bookings();

-- All prices, identities, statuses, and capacity checks come from trusted
-- database state. The trip row lock serializes seat reservations per trip.
create or replace function public.reserve_trip_seats(p_trip_id uuid, p_quantity integer)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_trip public.trips%rowtype;
  occupied_seats bigint;
  new_booking public.bookings%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in is required';
  end if;
  if p_trip_id is null or p_quantity is null or p_quantity < 1 then
    raise exception 'Choose a valid trip and seat quantity';
  end if;

  select * into selected_trip
    from public.trips
   where id = p_trip_id
   for update;

  if not found or selected_trip.status <> 'published' then
    raise exception 'Trip is not available';
  end if;
  if selected_trip.starts_at <= now() then
    raise exception 'Trip has already started';
  end if;

  -- Expire this trip's stale holds before counting capacity. Their history is
  -- retained, while the partial unique index releases the active-booking slot.
  update public.bookings
     set status = 'expired'
   where trip_id = selected_trip.id
     and status = 'pending_payment'
     and expires_at <= now();

  select coalesce(sum(quantity), 0)
    into occupied_seats
    from public.bookings
   where trip_id = selected_trip.id
     and (status = 'confirmed'
       or (status = 'pending_payment' and expires_at > now()));

  if occupied_seats + p_quantity > selected_trip.capacity then
    raise exception 'Not enough seats remain';
  end if;

  insert into public.bookings
    (traveler_id, trip_id, quantity, total_amount, currency, status, expires_at)
  values
    (current_user_id, selected_trip.id, p_quantity,
     selected_trip.price * p_quantity, selected_trip.currency,
     'pending_payment', now() + interval '15 minutes')
  returning * into new_booking;

  return new_booking;
end;
$$;

-- A traveler may release only their own pending hold. Confirmed bookings need
-- a payment/refund policy, so client cancellation of those is intentionally not
-- enabled in this milestone.
create or replace function public.cancel_pending_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  changed_booking public.bookings%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in is required';
  end if;

  update public.bookings
     set status = 'cancelled'
   where id = p_booking_id
     and traveler_id = current_user_id
     and status = 'pending_payment'
     and expires_at > now()
  returning * into changed_booking;

  if not found then
    raise exception 'Pending booking not found or no longer cancellable';
  end if;
  return changed_booking;
end;
$$;

revoke all on function public.reserve_trip_seats(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_trip_seats(uuid, integer) to authenticated;
revoke all on function public.cancel_pending_booking(uuid) from public, anon, authenticated;
grant execute on function public.cancel_pending_booking(uuid) to authenticated;

-- Public availability is a display hint only; reserve_trip_seats() rechecks it
-- under a row lock before accepting a booking.
create or replace function public.get_trip_seats_remaining(p_trip_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when t.status = 'published' then
      greatest(t.capacity - coalesce((
        select sum(b.quantity)::integer
          from public.bookings as b
         where b.trip_id = t.id
           and (b.status = 'confirmed'
             or (b.status = 'pending_payment' and b.expires_at > now()))
      ), 0), 0)
    else null
  end
    from public.trips as t
   where t.id = p_trip_id;
$$;

revoke all on function public.get_trip_seats_remaining(uuid) from public, anon, authenticated;
grant execute on function public.get_trip_seats_remaining(uuid) to anon, authenticated;
