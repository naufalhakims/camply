-- Profiles: one row per auth user, holding only non-sensitive public fields.
--
-- Security model (three independent layers):
--   1. RLS decides which ROWS a client may touch.
--   2. Column-level GRANTs decide which COLUMNS a client may read/write.
--      Without this, `UPDATE profiles SET role='admin'` would be permitted for
--      the user's own row. RLS cannot express "this column is not yours".
--   3. CHECK constraints validate values that do get through.
--
-- Deliberately absent: email, phone, address, date of birth. Auth owns
-- credentials; nothing sensitive is duplicated here (AGENTS.md s6).

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url   text,
  bio          text check (char_length(bio) <= 500),
  role         text not null default 'traveler' check (role in ('traveler', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile for each auth user. `role` is server-writable only; clients have no grant on it.';

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Grants. Supabase grants ALL on new public tables to anon/authenticated by
-- default, so an explicit revoke is required before narrowing.
-- ---------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;

-- Everyone may read the four public fields. `role` is intentionally withheld:
-- clients must never branch on it, and admin powers are enforced server-side.
grant select (id, display_name, avatar_url, bio, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- A signed-in user may edit exactly three of their own columns.
grant update (display_name, avatar_url, bio)
  on public.profiles to authenticated;

-- No INSERT grant: rows are created solely by the on-signup trigger below.
-- No DELETE grant: rows disappear with the auth user via ON DELETE CASCADE.

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
create policy "profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- Pin search_path so a caller cannot shadow `now()` via a temp schema.
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create the profile row on signup.
--
-- Runs as SECURITY DEFINER so it bypasses RLS and the missing INSERT grant.
-- The client therefore cannot forge a profile row for another user, and every
-- user is guaranteed to have a profile (no "profile missing" branch in the UI).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- Fall back to the email local-part, then a placeholder. Never null:
    -- display_name is NOT NULL with a minimum length.
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), ''),
      nullif(left(split_part(coalesce(new.email, ''), '@', 1), 80), ''),
      'Traveler'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
