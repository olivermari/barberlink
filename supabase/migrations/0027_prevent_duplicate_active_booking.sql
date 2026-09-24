-- Nothing stopped a customer with an active booking from creating a
-- second one — Quick Match again, a double-tap, two tabs open. Two
-- barbers could end up dispatched to the same customer. Extends the
-- existing dispatch-on-insert trigger (0017) rather than adding a
-- second BEFORE INSERT trigger, so there's no ordering question between
-- the two.
create or replace function public.bookings_dispatch_on_insert()
returns trigger as $$
declare
  barber record;
  is_busy boolean;
  has_active boolean;
begin
  select exists (
    select 1 from bookings
    where customer_id = new.customer_id
    and status in ('pending', 'queued', 'accepted', 'on_the_way', 'in_service')
  ) into has_active;

  if has_active then
    raise exception 'You already have an active booking — finish or cancel it before booking again.';
  end if;

  select verification_status, is_available
  into barber
  from barber_profiles
  where id = new.barber_id;

  if barber is null or barber.verification_status <> 'verified' or not barber.is_available then
    raise exception 'This barber is not currently accepting bookings.';
  end if;

  select exists (
    select 1 from bookings
    where barber_id = new.barber_id
    and status in ('pending', 'accepted', 'on_the_way', 'in_service')
  ) into is_busy;

  new.status := case when is_busy then 'queued' else 'pending' end;
  new.pending_since := case when is_busy then null else now() end;
  new.decline_reason := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
