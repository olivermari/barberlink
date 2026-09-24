-- Cash jobs settle on completion. The barber has the cash in hand when
-- the cut is done, so completing a cash job marks it paid and the
-- commission comes out of the wallet right away — instead of waiting on
-- "Mark cash received", which a barber could simply never press.
--
-- A barber whose wallet drops below ₱0 is taken offline until they top
-- up (going online already requires a balance of at least ₱0). Jobs
-- already in their queue still reach them; new bookings can't, since
-- 0007's dispatch trigger rejects unavailable barbers.

create or replace function public.bookings_stamp_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'pending' then new.pending_since := now();
      when 'accepted' then new.accepted_at := now();
      when 'on_the_way' then new.on_the_way_at := now();
      when 'in_service' then new.in_service_at := now();
      when 'completed' then
        new.completed_at := now();
        if new.payment_method = 'cod' then
          new.payment_status := 'paid';
        end if;
      when 'declined' then new.decline_reason := coalesce(new.decline_reason, 'barber');
      else null;
    end case;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- Same as 0012, plus the out-of-credit switch-off on cash commission.
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
        -- Both expressions read the pre-update balance, so the check is
        -- against the balance after this commission.
        update barber_profiles
        set token_balance = token_balance - new.platform_fee,
            is_available = case
              when token_balance - new.platform_fee < 0 then false
              else is_available
            end
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
