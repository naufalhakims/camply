-- Anonymous prompt rooms for confirmed trip participants.
-- Response authorship and report authorship are never granted to client roles.

create table public.trip_game_rooms (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null unique references public.trips (id) on delete cascade,
  prompt       text not null check (char_length(trim(prompt)) between 10 and 500),
  status       text not null default 'open' check (status in ('open', 'completed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table public.trip_game_responses (
  id                 uuid primary key default gen_random_uuid(),
  room_id            uuid not null references public.trip_game_rooms (id) on delete cascade,
  author_id          uuid not null references public.profiles (id) on delete cascade,
  body               text not null check (char_length(trim(body)) between 1 and 500),
  moderation_status  text not null default 'visible'
                       check (moderation_status in ('visible', 'hidden')),
  created_at         timestamptz not null default now(),
  unique (room_id, author_id)
);

create table public.trip_game_reports (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.trip_game_responses (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null check (char_length(trim(reason)) between 5 and 400),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  unique (response_id, reporter_id)
);

create index trip_game_responses_room_created_idx
  on public.trip_game_responses (room_id, created_at desc);
create index trip_game_reports_response_status_idx
  on public.trip_game_reports (response_id, status, created_at desc);

alter table public.trip_game_rooms enable row level security;
alter table public.trip_game_responses enable row level security;
alter table public.trip_game_reports enable row level security;

revoke all on public.trip_game_rooms, public.trip_game_responses, public.trip_game_reports
  from anon, authenticated;

grant select on public.trip_game_rooms to authenticated;
grant insert (trip_id, prompt) on public.trip_game_rooms to authenticated;
grant update (status) on public.trip_game_rooms to authenticated;

-- These are the only response fields exposed through PostgREST. author_id is
-- intentionally omitted; even trip organizers moderate the anonymous content.
grant select (id, room_id, body, moderation_status, created_at)
  on public.trip_game_responses to authenticated;
grant update (moderation_status) on public.trip_game_responses to authenticated;

-- Report identity is private too. Moderators see the report reason and state,
-- not the identity of the reporter.
grant select (id, response_id, reason, status, created_at, reviewed_at)
  on public.trip_game_reports to authenticated;
grant update (status) on public.trip_game_reports to authenticated;

create or replace function public.trip_game_is_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.trip_game_rooms as room
      join public.bookings as booking on booking.trip_id = room.trip_id
     where room.id = p_room_id
       and booking.traveler_id = (select auth.uid())
       and booking.status = 'confirmed'
  );
$$;

create or replace function public.trip_game_can_moderate(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.current_app_role()) = 'admin'
      or exists (
        select 1
          from public.trip_game_rooms as room
          join public.trips as trip on trip.id = room.trip_id
         where room.id = p_room_id
           and trip.organizer_id = (select auth.uid())
           and (select public.current_app_role()) = 'organizer'
      );
$$;

revoke all on function public.trip_game_is_member(uuid) from public, anon, authenticated;
grant execute on function public.trip_game_is_member(uuid) to authenticated;
revoke all on function public.trip_game_can_moderate(uuid) from public, anon, authenticated;
grant execute on function public.trip_game_can_moderate(uuid) to authenticated;

create policy "eligible participants and trip moderators read rooms"
  on public.trip_game_rooms for select
  to authenticated
  using (
    (select public.trip_game_is_member(id))
    or (select public.trip_game_can_moderate(id))
  );

create policy "organizers create rooms for owned trips"
  on public.trip_game_rooms for insert
  to authenticated
  with check (
    status = 'open'
    and exists (
      select 1
        from public.trips as trip
       where trip.id = trip_id
         and (
           (trip.organizer_id = (select auth.uid())
             and (select public.current_app_role()) = 'organizer')
           or (select public.current_app_role()) = 'admin'
         )
         and trip.status = 'published'
    )
  );

-- Room completion is a one-way transition, so clients cannot reopen a finished game.
create policy "trip moderators complete open rooms"
  on public.trip_game_rooms for update
  to authenticated
  using (status = 'open' and (select public.trip_game_can_moderate(id)))
  with check (status = 'completed' and (select public.trip_game_can_moderate(id)));

create trigger trip_game_rooms_set_updated_at
  before update on public.trip_game_rooms
  for each row execute function public.set_updated_at();

create or replace function public.set_trip_game_room_completed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'open' and new.status = 'completed' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger trip_game_rooms_set_completed_at
  before update of status on public.trip_game_rooms
  for each row
  when (old.status = 'open' and new.status = 'completed')
  execute function public.set_trip_game_room_completed();

create policy "members see visible anonymous responses and moderators see all"
  on public.trip_game_responses for select
  to authenticated
  using (
    (moderation_status = 'visible' and (select public.trip_game_is_member(room_id)))
    or (select public.trip_game_can_moderate(room_id))
  );

create policy "trip moderators change response visibility"
  on public.trip_game_responses for update
  to authenticated
  using ((select public.trip_game_can_moderate(room_id)))
  with check ((select public.trip_game_can_moderate(room_id)));

create policy "reporters and trip moderators read reports"
  on public.trip_game_reports for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or exists (
      select 1
        from public.trip_game_responses as response
       where response.id = response_id
         and (select public.trip_game_can_moderate(response.room_id))
    )
  );

create policy "trip moderators review open reports"
  on public.trip_game_reports for update
  to authenticated
  using (
    status = 'open'
    and exists (
      select 1
        from public.trip_game_responses as response
       where response.id = response_id
         and (select public.trip_game_can_moderate(response.room_id))
    )
  )
  with check (
    status in ('resolved', 'dismissed')
    and exists (
      select 1
        from public.trip_game_responses as response
       where response.id = response_id
         and (select public.trip_game_can_moderate(response.room_id))
    )
  );

create or replace function public.set_trip_game_report_reviewed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger trip_game_reports_set_reviewed
  before update of status on public.trip_game_reports
  for each row execute function public.set_trip_game_report_reviewed();

revoke all on function public.set_trip_game_report_reviewed() from public, anon, authenticated;
revoke all on function public.set_trip_game_room_completed() from public, anon, authenticated;

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

create or replace function public.trip_game_my_response_id(p_room_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select response.id
    from public.trip_game_responses as response
   where response.room_id = p_room_id
     and response.author_id = (select auth.uid())
     and (select public.trip_game_is_member(p_room_id));
$$;

create or replace function public.report_trip_game_response(p_response_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  response_room_id uuid;
  response_author_id uuid;
  report_id uuid;
  cleaned_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;
  if char_length(cleaned_reason) not between 5 and 400 then
    raise exception 'Report reason must be between 5 and 400 characters';
  end if;

  select response.room_id, response.author_id
    into response_room_id, response_author_id
    from public.trip_game_responses as response
   where response.id = p_response_id
     and response.moderation_status = 'visible';

  if not found or not public.trip_game_is_member(response_room_id) then
    raise exception 'Response is unavailable';
  end if;
  if response_author_id = auth.uid() then
    raise exception 'You cannot report your own response';
  end if;

  insert into public.trip_game_reports (response_id, reporter_id, reason)
  values (p_response_id, auth.uid(), cleaned_reason)
  returning id into report_id;
  return report_id;
end;
$$;

revoke all on function public.submit_trip_game_response(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_trip_game_response(uuid, text) to authenticated;
revoke all on function public.trip_game_my_response_id(uuid) from public, anon, authenticated;
grant execute on function public.trip_game_my_response_id(uuid) to authenticated;
revoke all on function public.report_trip_game_response(uuid, text) from public, anon, authenticated;
grant execute on function public.report_trip_game_response(uuid, text) to authenticated;

comment on table public.trip_game_rooms is
  'One anonymous prompt room per trip. Only users with a confirmed booking can participate.';
comment on column public.trip_game_responses.author_id is
  'Private authorship key. Never grant SELECT to client roles; only security-definer functions use it.';
comment on column public.trip_game_reports.reporter_id is
  'Private reporter identity. Moderators see report content without reporter identity.';
