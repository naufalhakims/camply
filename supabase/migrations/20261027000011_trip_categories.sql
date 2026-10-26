-- A small controlled taxonomy for trip discovery.
-- Existing trips are classified as "other" until their organizer chooses one.

alter table public.trips
  add column category text not null default 'other'
    constraint trips_category_check
    check (category in ('nature', 'beach', 'city', 'culture', 'adventure', 'other'));

comment on column public.trips.category is
  'Organizer-selected discovery category; legacy rows default to other to avoid inventing classifications.';

create index trips_published_category_start_idx
  on public.trips (category, starts_at)
  where status = 'published';

grant insert (category) on public.trips to authenticated;
grant update (category) on public.trips to authenticated;
