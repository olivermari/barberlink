-- Same-day on-demand redesign, part 2: request timestamp instead of
-- future scheduling, a haversine helper, dispatch-on-insert and
-- queue-promotion triggers, and a busy-status RPC for Quick Match.

-- ========== requested_at ==========
alter table bookings rename column scheduled_at to requested_at;
alter table bookings alter column requested_at set default now();

-- ========== haversine distance (km) ==========
create or replace function public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision as $$
  select 2 * 6371 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$ language sql immutable;

-- ========== dispatch on insert: verify eligibility, queue if busy ==========
create or replace function public.bookings_dispatch_on_insert()
returns trigger as $$
declare
  barber record;
  is_busy boolean;
begin
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
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_dispatch_before_insert
  before insert on bookings
  for each row execute function public.bookings_dispatch_on_insert();

-- ========== promote nearest queued booking when a barber frees up ==========
create or replace function public.bookings_promote_queue()
returns trigger as $$
declare
  barber_loc record;
  next_booking_id uuid;
begin
  select current_lat, current_lng into barber_loc
  from barber_profiles where id = new.barber_id;

  select id into next_booking_id
  from bookings
  where barber_id = new.barber_id
  and status = 'queued'
  order by public.haversine_km(
    barber_loc.current_lat, barber_loc.current_lng,
    address_lat, address_lng
  ) asc
  limit 1;

  if next_booking_id is not null then
    update bookings set status = 'pending' where id = next_booking_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_promote_queue_after_update
  after update on bookings
  for each row
  when (
    old.status in ('pending', 'accepted', 'on_the_way', 'in_service')
    and new.status in ('declined', 'cancelled', 'completed')
  )
  execute function public.bookings_promote_queue();

-- ========== busy-status check for Quick Match (bypasses per-row RLS) ==========
create or replace function public.barbers_busy_status(target_barber_ids uuid[])
returns table(barber_id uuid, is_busy boolean)
language sql
security definer
set search_path = public
as $$
  select bp.id as barber_id,
    exists (
      select 1 from bookings b
      where b.barber_id = bp.id
      and b.status in ('pending', 'accepted', 'on_the_way', 'in_service')
    ) as is_busy
  from barber_profiles bp
  where bp.id = any(target_barber_ids);
$$;

grant execute on function public.barbers_busy_status(uuid[]) to authenticated;

-- ========== surcharge setting ==========
insert into platform_settings (key, value) values
  ('choose_barber_surcharge', '50')
on conflict (key) do nothing;
