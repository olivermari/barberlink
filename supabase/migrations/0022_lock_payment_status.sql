-- 0021 left payment_status writable because the simulated-payment path
-- settled it from the customer's own session. That path now settles
-- with the service role (and never runs in production), so a customer
-- or barber has no legitimate reason to set it — only the webhook
-- (service role), admins, and 0018's cash-settles-on-completion trigger
-- (fires after this guard, so the guard never sees its change).
--
-- One exception: a barber marking a cash job paid by hand, for
-- completed jobs from before 0018 (MarkPaidButton).
create or replace function public.bookings_guard()
returns trigger as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
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
