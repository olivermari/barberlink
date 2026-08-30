-- Phase 6: credit a barber's token ledger / balance exactly once per
-- booking, whenever it becomes both completed and paid — regardless of
-- which of those two happens second (cash settled after completion,
-- or online payment settled before the job even starts).

-- Guarantees at most one "earned" ledger row per booking; ON CONFLICT
-- DO NOTHING below relies on this to make the trigger idempotent.
create unique index token_ledger_earned_once
  on token_ledger (booking_id)
  where type = 'earned';

create or replace function public.credit_barber_on_payment()
returns trigger as $$
declare
  inserted_id uuid;
begin
  if new.status = 'completed' and new.payment_status = 'paid' then
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_credit_barber_after_update
  after update on bookings
  for each row execute function public.credit_barber_on_payment();
