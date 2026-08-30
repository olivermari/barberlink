-- Cash bookings hand the barber the full price in person, so the
-- platform's commission never reaches us the way it does for online
-- payments (where we already hold the money and owe the barber their
-- share). This migration flips crediting for cash jobs: instead of
-- crediting the barber's payout, it debits the platform's commission
-- from their balance — money they now owe us. A wallet top-up flow
-- lets them settle that debt using the same PayMongo-shaped payment
-- path built in Phase 6.

-- ========== wallet_topups ==========
create table wallet_topups (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barber_profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  provider text not null default 'paymongo',
  provider_payment_id text,
  method payment_method not null,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table wallet_topups enable row level security;

create policy "wallet_topups_select" on wallet_topups for select using (
  auth.uid() = barber_id or is_admin()
);
create policy "wallet_topups_insert" on wallet_topups for insert with check (
  auth.uid() = barber_id
);

-- ========== replace the booking-completion crediting trigger ==========
-- Widen the old "earned only" guard to also cover the new "adjustment"
-- rows this trigger writes for cash bookings, so a booking can only
-- ever be auto-credited/debited once no matter how many times its
-- status/payment_status are re-saved.
drop index token_ledger_earned_once;
create unique index token_ledger_auto_credit_once
  on token_ledger (booking_id)
  where type in ('earned', 'adjustment');

create or replace function public.credit_barber_on_payment()
returns trigger as $$
declare
  inserted_id uuid;
begin
  if new.status = 'completed' and new.payment_status = 'paid' then
    if new.payment_method = 'cod' then
      -- Barber already collected the full price in cash — they owe us
      -- our commission, not the other way around.
      insert into token_ledger (barber_id, booking_id, type, token_amount)
      values (new.barber_id, new.id, 'adjustment', -new.platform_fee)
      on conflict do nothing
      returning id into inserted_id;

      if inserted_id is not null then
        update barber_profiles
        set token_balance = token_balance - new.platform_fee
        where id = new.barber_id;
      end if;
    else
      -- Online payment: we already hold the money and owe the barber
      -- their share.
      insert into token_ledger (barber_id, booking_id, type, token_amount)
      values (new.barber_id, new.id, 'earned', new.barber_payout)
      on conflict do nothing
      returning id into inserted_id;

      if inserted_id is not null then
        update barber_profiles
        set token_balance = token_balance + new.barber_payout
        where id = new.barber_id;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ========== settle a wallet top-up once it's paid ==========
create or replace function public.credit_wallet_topup()
returns trigger as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into token_ledger (barber_id, booking_id, type, token_amount)
    values (new.barber_id, null, 'adjustment', new.amount);

    update barber_profiles
    set token_balance = token_balance + new.amount
    where id = new.barber_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger wallet_topups_credit_after_update
  after update on wallet_topups
  for each row execute function public.credit_wallet_topup();
