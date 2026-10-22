-- Signup may choose traveler or organizer. The value comes from untrusted
-- auth metadata, so map only the explicit organizer value; every other value,
-- including admin, becomes traveler. Existing profiles are not changed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), ''),
      nullif(left(split_part(coalesce(new.email, ''), '@', 1), 80), ''),
      'Traveler'
    ),
    case
      when new.raw_user_meta_data ->> 'signup_role' = 'organizer' then 'organizer'
      else 'traveler'
    end
  );
  return new;
end;
$$;
