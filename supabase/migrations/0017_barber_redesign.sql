-- Barber redesign (wireframes B1–B6): request timeouts (auto-decline),
-- status timestamps for the job checklist, and two write-permission
-- holes that let a barber credit their own wallet.

-- ========== new booking columns ==========
alter table bookings
  add column if not exists dispatch_mode text
    constraint bookings_dispatch_mode_check check (dispatch_mode in ('quick', 'chosen')),
  add column if not exists pending_since timestamptz,
  add column if not exists decline_reason text
    constraint bookings_decline_reason_check check (decline_reason in ('barber', 'timeout')),
  add column if not exists accepted_at timestamptz,
  add column if not exists on_the_way_at timestamptz,
  add column if not exists in_service_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Backfill without bumping updated_at (History ordered by it until now).
-- Open requests get a fresh window rather than expiring on the first tick.
alter table bookings disable trigger bookings_set_updated_at;
update bookings set completed_at = updated_at
  where status = 'completed' and completed_at is null;
update bookings set pending_since = now()
  where status = 'pending' and pending_since is null;
alter table bookings enable trigger bookings_set_updated_at;

-- ========== dispatch on insert: now also starts the request clock ==========
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
  new.pending_since := case when is_busy then null else now() end;
  new.decline_reason := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ========== stamp each status transition ==========
-- Queue promotion (0007) moves a booking to pending with a plain UPDATE,
-- so this is also what starts the clock for promoted requests.
create or replace function public.bookings_stamp_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'pending' then new.pending_since := now();
      when 'accepted' then new.accepted_at := now();
      when 'on_the_way' then new.on_the_way_at := now();
      when 'in_service' then new.in_service_at := now();
      when 'completed' then new.completed_at := now();
      when 'declined' then new.decline_reason := coalesce(new.decline_reason, 'barber');
      else null;
    end case;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists bookings_stamp_status_before_update on bookings;
create trigger bookings_stamp_status_before_update
  before update on bookings
  for each row execute function public.bookings_stamp_status();

-- ========== auto-decline unanswered requests (B2) ==========
insert into platform_settings (key, value) values ('request_timeout_seconds', '40')
on conflict (key) do nothing;

-- Declining fires 0007's promote trigger, so the barber's queue moves on.
-- Expired requests are not reassigned: services and prices belong to a
-- barber, so the customer re-matches (their screen offers Quick Match).
create or replace function public.expire_stale_requests()
returns int as $$
declare
  timeout_s int;
  expired int;
begin
  select (value #>> '{}')::int into timeout_s
  from platform_settings where key = 'request_timeout_seconds';

  update bookings
  set status = 'declined', decline_reason = 'timeout'
  where status = 'pending'
    and pending_since < now() - make_interval(secs => coalesce(timeout_s, 40));

  get diagnostics expired = row_count;
  return expired;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.expire_stale_requests() from public, anon, authenticated;

create extension if not exists pg_cron;

-- Every 15 seconds, so a request closes within ~15s of its deadline.
select cron.schedule(
  'expire-stale-requests',
  '15 seconds',
  $$select public.expire_stale_requests()$$
);

-- ========== wallet top-ups: only the webhook settles them ==========
-- 0013's owner update policy let a barber mark their own top-up paid,
-- crediting their wallet with money that was never received.
drop policy if exists "wallet_topups_owner_update" on wallet_topups;
drop policy if exists "wallet_topups_insert" on wallet_topups;
create policy "wallet_topups_insert" on wallet_topups for insert with check (
  auth.uid() = barber_id and status = 'pending'
);

-- ========== barber_profiles: platform-managed columns ==========
-- barber_profiles_self_update (0001) covers the whole row, so a barber
-- could set their own token_balance or verification_status. Direct API
-- calls run as "authenticated"; the security-definer functions that
-- legitimately change these (wallet crediting, ratings) run as their
-- owner, and admins verify barbers through the API.
create or replace function public.barber_profiles_guard()
returns trigger as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.token_balance := 0;
    elsif new.verification_status is distinct from old.verification_status
      or new.token_balance is distinct from old.token_balance
      or new.rating_avg is distinct from old.rating_avg
      or new.rating_count is distinct from old.rating_count then
      raise exception 'Verification, wallet and rating are managed by the platform.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists barber_profiles_guard_before_write on barber_profiles;
create trigger barber_profiles_guard_before_write
  before insert or update on barber_profiles
  for each row execute function public.barber_profiles_guard();
