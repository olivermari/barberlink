-- Customer redesign (wireframes C1–C8): review tags, tips, a dispatch
-- status RPC that also reports queue depth, and live barber positions.

-- ========== review tags (C6) ==========
alter table reviews
  add column if not exists tags text[] not null default '{}'
  constraint reviews_tags_allowed check (
    tags <@ array['on_time', 'clean_setup', 'great_cut', 'friendly']::text[]
  );

-- ========== tips (C6) ==========
-- Tips always go through GCash: a cash tip after the barber has left
-- can't happen in person. 100% goes to the barber — no commission.
alter type token_ledger_type add value if not exists 'tip';

create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  customer_id uuid not null references profiles(id),
  barber_id uuid not null references barber_profiles(id),
  amount numeric not null check (amount > 0 and amount <= 5000),
  provider text not null default 'paymongo',
  provider_payment_id text,
  method payment_method not null default 'gcash',
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- At most one settled tip per booking; failed or abandoned attempts can
-- be retried.
create unique index if not exists tips_one_paid_per_booking
  on tips (booking_id) where status = 'paid';

alter table tips enable row level security;

create policy "tips_select" on tips for select using (
  auth.uid() = customer_id or auth.uid() = barber_id or is_admin()
);

-- A customer can only open a *pending* tip on their own completed
-- booking, for the barber who did it. There is deliberately no update
-- policy: only the payment webhook (service role) can mark a tip paid,
-- so a customer can't credit a barber with money the platform never
-- received. (wallet_topups got this wrong in 0013 — see Phase 2.)
create policy "tips_insert" on tips for insert with check (
  auth.uid() = customer_id
  and status = 'pending'
  and exists (
    select 1 from bookings b
    where b.id = tips.booking_id
      and b.customer_id = auth.uid()
      and b.barber_id = tips.barber_id
      and b.status = 'completed'
  )
);

-- Credit the barber exactly once, on the transition to paid. The
-- literal 'tip' is only resolved when the trigger runs, after this
-- migration (and the enum value above) has committed.
create or replace function public.credit_tip()
returns trigger as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into token_ledger (barber_id, booking_id, type, token_amount)
    values (new.barber_id, new.booking_id, 'tip', new.amount);

    update barber_profiles
    set token_balance = token_balance + new.amount
    where id = new.barber_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tips_credit_after_update on tips;
create trigger tips_credit_after_update
  after update on tips
  for each row execute function public.credit_tip();

-- ========== dispatch status with queue depth (C2 / C7) ==========
-- Same reasoning as barbers_busy_status() in 0007: customers need to
-- know who's free and how long each queue is without bookings RLS
-- exposing other customers' rows. Returns counts only.
create or replace function public.barbers_dispatch_status(target_barber_ids uuid[])
returns table(barber_id uuid, is_busy boolean, queued_count int)
language sql
security definer
set search_path = public
as $$
  select bp.id,
    exists (
      select 1 from bookings b
      where b.barber_id = bp.id
        and b.status in ('pending', 'accepted', 'on_the_way', 'in_service')
    ),
    (
      select count(*)::int from bookings b
      where b.barber_id = bp.id and b.status = 'queued'
    )
  from barber_profiles bp
  where bp.id = any(target_barber_ids);
$$;

grant execute on function public.barbers_dispatch_status(uuid[]) to authenticated;

-- ========== live barber position (C4 / C8) ==========
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'barber_profiles'
  ) then
    alter publication supabase_realtime add table barber_profiles;
  end if;
end $$;
