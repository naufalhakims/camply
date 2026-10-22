-- Mock payment records and an atomic, owner-scoped demo checkout.
-- This deliberately records no real charge and must be replaced by a verified
-- provider flow before production use.

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null unique references public.bookings (id) on delete restrict,
  provider           text not null default 'mock' check (provider = 'mock'),
  provider_reference text not null unique,
  amount             numeric(14, 2) not null check (amount >= 0),
  currency           char(3) not null check (currency = upper(currency)),
  status             text not null check (status = 'succeeded'),
  created_at         timestamptz not null default now()
);

comment on table public.payments is
  'Demo-only mock payment receipts. No money is collected; replace with provider-verified records before production.';
comment on column public.payments.provider_reference is
  'Deterministic mock reference derived by the database from the booking id.';

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

create policy "travelers read payments for their own bookings"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1
        from public.bookings as b
       where b.id = payments.booking_id
         and b.traveler_id = (select auth.uid())
    )
  );

-- This RPC is an explicit portfolio demo. It does not accept a price or user
-- id from the browser; it locks the booking, checks ownership/expiry, reads the
-- stored amount, then confirms and records the mock receipt in one transaction.
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

  -- Retrying after a successful response returns the same receipt.
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

revoke all on function public.complete_mock_payment(uuid) from public, anon, authenticated;
grant execute on function public.complete_mock_payment(uuid) to authenticated;
