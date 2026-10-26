-- The travel fee (₱ per km from the barber to the customer's pin) is paid on
-- top of the price and kept by the barber in full — the platform commission
-- is taken on the service price and chosen-barber fee only. It is charged
-- from the first km: the free distance drops from 3 km to 0.
--
-- Each booking records its own fee so receipts can show it as its own line
-- (price already includes it), and the guard locks it after creation like the
-- other money columns.
alter table public.bookings
  add column if not exists travel_fee numeric not null default 0 check (travel_fee >= 0);

update public.platform_settings set value = '0' where key = 'distance_free_km';

create or replace function public.bookings_guard()
returns trigger as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.price is distinct from old.price
      or new.travel_fee is distinct from old.travel_fee
      or new.platform_fee is distinct from old.platform_fee
      or new.barber_payout is distinct from old.barber_payout
      or new.payment_method is distinct from old.payment_method
      or new.customer_id is distinct from old.customer_id
      or new.barber_id is distinct from old.barber_id
      or new.service_id is distinct from old.service_id
      or new.address_lat is distinct from old.address_lat
      or new.address_lng is distinct from old.address_lng
      or new.address_text is distinct from old.address_text then
      raise exception 'That can only be set when the booking is created.';
    end if;

    if new.status is distinct from old.status then
      if auth.uid() = old.customer_id then
        if not (
          old.status in ('pending', 'queued', 'accepted', 'on_the_way')
          and new.status = 'cancelled'
        ) then
          raise exception 'Customers can only cancel an active booking.';
        end if;
      elsif auth.uid() = old.barber_id then
        if not (
          (old.status = 'pending' and new.status in ('accepted', 'declined'))
          or (old.status = 'accepted' and new.status = 'on_the_way')
          or (old.status = 'on_the_way' and new.status = 'in_service')
          or (old.status = 'in_service' and new.status = 'completed')
        ) then
          raise exception 'That status change is not allowed.';
        end if;
      end if;
    end if;

    if new.payment_status is distinct from old.payment_status then
      if not (
        auth.uid() = old.barber_id
        and old.payment_method = 'cod'
        and old.status = 'completed'
        and old.payment_status = 'pending'
        and new.payment_status = 'paid'
      ) then
        raise exception 'Payments are settled by the platform.';
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;
