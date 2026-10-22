-- Only traveler accounts may create, cancel, or pay for bookings, or act as
-- participants in the in-trip game. Organizers retain their separate
-- moderation privileges for rooms attached to trips they own.

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
  if (select public.current_app_role()) is distinct from 'traveler' then
    raise exception 'Only travelers can book trips';
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
  if (select public.current_app_role()) is distinct from 'traveler' then
    raise exception 'Only travelers can manage bookings';
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

create or replace function public.complete_mock_payment(p_booking_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_booking public.bookings%rowtype;
  payment_record public.payments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in is required';
  end if;
  if (select public.current_app_role()) is distinct from 'traveler' then
    raise exception 'Only travelers can pay for bookings';
  end if;
  if p_booking_id is null then
    raise exception 'Booking is not available';
  end if;

  select *
    into selected_booking
    from public.bookings
   where id = p_booking_id
   for update;

  if not found or selected_booking.traveler_id <> current_user_id then
    raise exception 'Booking is not available';
  end if;

  if selected_booking.status = 'confirmed' then
    select *
      into payment_record
      from public.payments
     where booking_id = selected_booking.id;
    if found then
      return payment_record;
    end if;
    raise exception 'Booking has no mock payment receipt';
  end if;

  if selected_booking.status <> 'pending_payment'
     or selected_booking.expires_at <= now() then
    raise exception 'Booking is no longer payable';
  end if;

  update public.bookings
     set status = 'confirmed'
   where id = selected_booking.id;

  insert into public.payments
    (booking_id, provider, provider_reference, amount, currency, status)
  values
    (selected_booking.id,
     'mock',
     'mock:' || selected_booking.id::text,
     selected_booking.total_amount,
     selected_booking.currency,
     'succeeded')
  returning * into payment_record;

  return payment_record;
end;
$$;

create or replace function public.trip_game_is_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.current_app_role()) = 'traveler'
     and exists (
       select 1
         from public.trip_game_rooms as room
         join public.bookings as booking on booking.trip_id = room.trip_id
        where room.id = p_room_id
          and booking.traveler_id = (select auth.uid())
          and booking.status = 'confirmed'
     );
$$;

create or replace function public.submit_trip_game_response(p_room_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_response_id uuid;
  cleaned_body text := trim(coalesce(p_body, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;
  if (select public.current_app_role()) is distinct from 'traveler' then
    raise exception 'Only travelers can participate in the trip game';
  end if;
  if char_length(cleaned_body) not between 1 and 500 then
    raise exception 'Response must be between 1 and 500 characters';
  end if;
  if not public.trip_game_is_member(p_room_id) then
    raise exception 'A confirmed trip booking is required';
  end if;
  if not exists (
    select 1 from public.trip_game_rooms as room
     where room.id = p_room_id and room.status = 'open'
  ) then
    raise exception 'Game room is closed or unavailable';
  end if;

  insert into public.trip_game_responses (room_id, author_id, body)
  values (p_room_id, auth.uid(), cleaned_body)
  returning id into new_response_id;
  return new_response_id;
end;
$$;
