-- Lets a queued customer see how many bookings are ahead of them for
-- their barber, without exposing other customers' booking rows through
-- bookings_select RLS — same reasoning as barbers_busy_status() in
-- 0007_booking_dispatch.sql. Deliberately returns a count, not a rank:
-- bookings_promote_queue() promotes by haversine distance at the moment
-- a slot frees up, not insertion order, so a fixed "you're 2nd" position
-- would be false precision — the barber's location keeps moving.
create or replace function public.queue_depth(target_booking_id uuid)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from bookings b
  where b.barber_id = (select barber_id from bookings where id = target_booking_id)
  and b.status = 'queued';
$$;

grant execute on function public.queue_depth(uuid) to authenticated;
