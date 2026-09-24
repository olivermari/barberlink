-- Push-notification triggers. Each one mirrors a notify() call that
-- already exists client-side (components/customer/active-booking-bar.tsx,
-- components/barber/jobs-badge-provider.tsx,
-- components/admin/admin-notification-provider.tsx) — those still run
-- and still show the in-page toast; these are what reach the mobile
-- notification bar when nothing is running to receive a Realtime event.
-- Fire-and-forget via public.push_notify() (0025): a push failure never
-- blocks the underlying write.

-- ========== bookings: new job request to the barber (insert) ==========
create or replace function public.bookings_push_on_insert()
returns trigger as $$
begin
  if new.status = 'pending' then
    perform public.push_notify(
      array[new.barber_id], 'New job request', null, '/barber', 'booking-' || new.id
    );
  elsif new.status = 'queued' then
    perform public.push_notify(
      array[new.barber_id], 'A new booking joined your queue.', null, '/barber', 'booking-' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_push_after_insert
  after insert on bookings
  for each row execute function public.bookings_push_on_insert();

-- ========== bookings: status changes (update) ==========
create or replace function public.bookings_push_on_update()
returns trigger as $$
declare
  status_label text;
begin
  if new.status is distinct from old.status then
    status_label := case new.status
      when 'queued' then 'You''re in the queue'
      when 'pending' then 'Waiting for your barber to accept'
      when 'accepted' then 'Your barber accepted'
      when 'on_the_way' then 'Your barber is on the way'
      when 'in_service' then 'Your service is in progress'
      else null
    end;
    if status_label is not null then
      perform public.push_notify(
        array[new.customer_id], status_label, null,
        '/customer/bookings/' || new.id, 'booking-' || new.id
      );
    end if;

    if new.status = 'cancelled' then
      perform public.push_notify(
        array[new.barber_id], 'A customer cancelled their booking.', null, '/barber', 'booking-' || new.id
      );
    elsif new.status = 'declined' and new.decline_reason = 'timeout' then
      perform public.push_notify(
        array[new.barber_id], 'A request expired before you answered it.', null, '/barber', 'booking-' || new.id
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_push_after_update
  after update on bookings
  for each row execute function public.bookings_push_on_update();

-- ========== booking_messages: new chat message to the other participant ==========
create or replace function public.booking_messages_push_on_insert()
returns trigger as $$
declare
  b record;
  recipient_id uuid;
  recipient_url text;
  sender_name text;
begin
  select customer_id, barber_id into b from bookings where id = new.booking_id;

  if new.sender_id = b.customer_id then
    recipient_id := b.barber_id;
    recipient_url := '/barber';
  else
    recipient_id := b.customer_id;
    recipient_url := '/customer/bookings/' || new.booking_id || '#chat';
  end if;

  select full_name into sender_name from profiles where id = new.sender_id;

  perform public.push_notify(
    array[recipient_id],
    'New message from ' || coalesce(sender_name, 'them'),
    new.body,
    recipient_url,
    'chat-' || new.booking_id
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger booking_messages_push_after_insert
  after insert on booking_messages
  for each row execute function public.booking_messages_push_on_insert();

-- ========== disputes: new dispute filed (admins) ==========
create or replace function public.disputes_push_on_insert()
returns trigger as $$
declare
  admin_ids uuid[];
begin
  select array_agg(id) into admin_ids from profiles where role = 'admin';
  perform public.push_notify(admin_ids, 'New dispute filed', null, '/admin/disputes', 'dispute-' || new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger disputes_push_after_insert
  after insert on disputes
  for each row execute function public.disputes_push_on_insert();

-- ========== disputes: resolved/dismissed (both sides of the booking) ==========
create or replace function public.disputes_push_on_update()
returns trigger as $$
declare
  b record;
begin
  if new.status is distinct from old.status and new.status in ('resolved', 'dismissed') then
    select customer_id, barber_id into b from bookings where id = new.booking_id;
    perform public.push_notify(
      array[b.customer_id], 'Your dispute was resolved', null,
      '/customer/bookings/' || new.booking_id, 'dispute-' || new.id
    );
    perform public.push_notify(
      array[b.barber_id], 'A dispute involving you was resolved', null,
      '/barber/history', 'dispute-' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger disputes_push_after_update
  after update on disputes
  for each row execute function public.disputes_push_on_update();

-- ========== barber_profiles: verification submitted (admins) ==========
create or replace function public.barber_profiles_push_on_verification()
returns trigger as $$
declare
  admin_ids uuid[];
begin
  if new.verification_status = 'pending' and old.verification_status is distinct from 'pending' then
    select array_agg(id) into admin_ids from profiles where role = 'admin';
    perform public.push_notify(
      admin_ids, 'New barber verification submitted', null, '/admin/barbers', 'verification-' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger barber_profiles_push_after_verification
  after update on barber_profiles
  for each row execute function public.barber_profiles_push_on_verification();

-- ========== barber_profiles: wallet dropped below the minimum ==========
create or replace function public.barber_profiles_push_on_wallet_low()
returns trigger as $$
declare
  min_wallet numeric;
begin
  select (value #>> '{}')::numeric into min_wallet
  from platform_settings where key = 'min_wallet_to_go_online';
  min_wallet := coalesce(min_wallet, 0);

  if old.token_balance >= min_wallet and new.token_balance < min_wallet then
    perform public.push_notify(
      array[new.id], 'Wallet low — top up to stay online', null, '/barber/earnings', 'wallet-low'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger barber_profiles_push_after_wallet_low
  after update on barber_profiles
  for each row
  when (new.token_balance is distinct from old.token_balance)
  execute function public.barber_profiles_push_on_wallet_low();

-- ========== token_ledger: commission drawn from a cash booking ==========
create or replace function public.token_ledger_push_on_insert()
returns trigger as $$
begin
  if new.type = 'adjustment' and new.token_amount < 0 then
    perform public.push_notify(
      array[new.barber_id],
      '₱' || to_char(abs(new.token_amount), 'FM999999990') || ' commission drawn from your wallet',
      null,
      '/barber/earnings',
      null
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger token_ledger_push_after_insert
  after insert on token_ledger
  for each row execute function public.token_ledger_push_on_insert();
