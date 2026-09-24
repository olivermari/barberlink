-- bookings_update (0001) has no with_check at all, so either party on a
-- booking can currently change ANY column on their own row — e.g. a
-- customer editing price/platform_fee/barber_payout, or jumping their
-- own booking straight to 'completed' to trigger the cash-commission
-- debit against an innocent barber who never did the job. RLS's
-- with_check can't fix this: it only sees the row *after* BEFORE
-- triggers (bookings_stamp_status) have already applied their own
-- legitimate derived changes, so it can't tell a trusted trigger's
-- write apart from a client's. A BEFORE UPDATE trigger can, since it
-- runs first and sees only what the client actually requested — same
-- approach as barber_profiles_guard (0017/0020).
--
-- payment_status is deliberately left alone here: the simulated-payment
-- fallback in app/api/payments/create/route.ts legitimately sets it
-- from the customer's own session (no SUPABASE_SERVICE_ROLE_KEY is
-- configured in this project yet), and there's no way to tell that
-- apart from a forged write at the database layer. Closing that hole
-- needs the service-role key set up and that route moved onto it —
-- a real decision, not something to silently change here.
create or replace function public.bookings_guard()
returns trigger as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    -- Set once at booking time; nobody has a legitimate reason to
    -- change these afterward.
    if new.price is distinct from old.price
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
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists bookings_guard_before_update on bookings;
create trigger bookings_guard_before_update
  before update on bookings
  for each row execute function public.bookings_guard();
