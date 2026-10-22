-- Trips: a bookable trip owned by exactly one organizer.
--
-- Ownership is the authorization primitive. There is deliberately NO `organizer`
-- role: any authenticated user who creates a trip owns it. This removes an
-- entire class of role-assignment bugs and matches AGENTS.md s4, where
-- "organizer" describes a relationship, not a permission level.
--
-- Money is numeric(12,2), never float. Every amount carries a currency code.

create table public.trips (
  id                    uuid primary key default gen_random_uuid(),
  organizer_id          uuid not null references public.profiles (id) on delete cascade,

  slug                  text not null unique
                          check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                 text not null check (char_length(title) between 3 and 140),
  description           text check (char_length(description) <= 5000),
  destination           text not null check (char_length(destination) between 2 and 120),

  starts_at             timestamptz not null,
  ends_at               timestamptz not null,

  price                 numeric(12, 2) not null check (price >= 0),
  currency              char(3) not null default 'IDR' check (currency = upper(currency)),
  capacity              integer not null check (capacity > 0),

  status                text not null default 'draft'
                          check (status in ('draft', 'published', 'cancelled')),

  cover_image_url       text,
  cover_image_public_id text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint trips_dates_ordered check (ends_at > starts_at)
);

comment on table public.trips is
  'Bookable trips. organizer_id is the sole ownership/authorization key.';
comment on column public.trips.currency is
  'ISO-4217 alpha-3, upper case. Stored with every amount; never assume IDR.';
comment on column public.trips.cover_image_public_id is
  'Cloudinary public_id, kept so the asset can be deleted/replaced later.';

-- Public listing queries: filter by status, order by start date.
create index trips_status_starts_at_idx on public.trips (status, starts_at);
-- Organizer dashboard: "my trips".
create index trips_organizer_id_idx on public.trips (organizer_id);

alter table public.trips enable row level security;

-- ---------------------------------------------------------------------------
-- Grants. Supabase grants ALL on new public tables to anon/authenticated by
-- default, so revoke first, then hand back only what each role needs.
-- ---------------------------------------------------------------------------
revoke all on public.trips from anon, authenticated;

grant select on public.trips to anon, authenticated;

-- Writable columns for an organizer. Notably ABSENT: id, organizer_id,
-- created_at, updated_at.
--   * organizer_id is not updatable, so a trip can never be reassigned to
--     another owner by a client — ownership transfer would need a deliberate
--     server-side operation.
grant insert (slug, title, description, destination, starts_at, ends_at,
              price, currency, capacity, status, cover_image_url,
              cover_image_public_id)
  on public.trips to authenticated;

grant update (slug, title, description, destination, starts_at, ends_at,
              price, currency, capacity, status, cover_image_url,
              cover_image_public_id)
  on public.trips to authenticated;

grant delete on public.trips to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
-- Anonymous and signed-in users see published trips only.
create policy "published trips are publicly readable"
  on public.trips for select
  to anon, authenticated
  using (status = 'published');

-- An organizer sees all of their own trips, including drafts and cancellations.
-- Permissive policies OR together, so this widens the policy above for owners.
create policy "organizers read their own trips"
  on public.trips for select
  to authenticated
  using (organizer_id = (select auth.uid()));

-- WITH CHECK is the critical half: without it a user could insert a trip
-- owned by somebody else.
create policy "users create trips they own"
  on public.trips for insert
  to authenticated
  with check (organizer_id = (select auth.uid()));

-- USING gates which rows are reachable; WITH CHECK gates the resulting row,
-- so a trip cannot be edited into someone else's ownership.
create policy "organizers update their own trips"
  on public.trips for update
  to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "organizers delete their own trips"
  on public.trips for delete
  to authenticated
  using (organizer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- updated_at, via the shared helper defined in the profiles migration
-- ---------------------------------------------------------------------------
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();
