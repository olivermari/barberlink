-- Admin redesign (wireframes A1–A5): richer barber verification
-- (documents, request-more-info, internal notes), a platform-wide
-- service catalog admins can price, and settings the app reads instead
-- of constants.

-- ========== verification: request more info ==========
-- Only referenced from plpgsql bodies below, which resolve enum values
-- at run time — the new value can't be used elsewhere in this migration.
alter type verification_status add value if not exists 'needs_info';

alter table barber_profiles add column if not exists verified_at timestamptz;

update barber_profiles set verified_at = created_at
  where verification_status = 'verified' and verified_at is null;

create or replace function public.barber_profiles_stamp_verified()
returns trigger as $$
begin
  if new.verification_status = 'verified'
    and old.verification_status is distinct from 'verified' then
    new.verified_at := now();
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists barber_profiles_stamp_verified_before_update on barber_profiles;
create trigger barber_profiles_stamp_verified_before_update
  before update on barber_profiles
  for each row execute function public.barber_profiles_stamp_verified();

-- ========== settings the app now reads ==========
insert into platform_settings (key, value) values
  ('max_match_radius_km', '1'),
  ('min_wallet_to_go_online', '0')
on conflict (key) do nothing;

-- ========== barber_profiles guard (0017) + going-online rules ==========
-- Going online is now checked here, not just in the toggle: verified,
-- and a wallet at or above the platform minimum.
create or replace function public.barber_profiles_guard()
returns trigger as $$
declare
  min_wallet numeric;
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.token_balance := 0;
      new.verified_at := null;
    else
      if new.verification_status is distinct from old.verification_status
        or new.token_balance is distinct from old.token_balance
        or new.rating_avg is distinct from old.rating_avg
        or new.rating_count is distinct from old.rating_count
        or new.verified_at is distinct from old.verified_at then
        raise exception 'Verification, wallet and rating are managed by the platform.';
      end if;

      if new.is_available and not old.is_available then
        if new.verification_status <> 'verified' then
          raise exception 'Only verified barbers can go online.';
        end if;
        select (value #>> '{}')::numeric into min_wallet
        from platform_settings where key = 'min_wallet_to_go_online';
        if new.token_balance < coalesce(min_wallet, 0) then
          raise exception 'Top up your wallet to go online.';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- ========== cash commission (0018) against the configurable minimum ==========
create or replace function public.credit_barber_on_payment()
returns trigger as $$
declare
  inserted_id uuid;
  min_wallet numeric;
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
        select (value #>> '{}')::numeric into min_wallet
        from platform_settings where key = 'min_wallet_to_go_online';

        -- Both expressions read the pre-update balance, so the check is
        -- against the balance after this commission.
        update barber_profiles
        set token_balance = token_balance - new.platform_fee,
            is_available = case
              when token_balance - new.platform_fee < coalesce(min_wallet, 0) then false
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

-- ========== admin review notes ==========
-- Separate from barber_profiles, which is public-read: the internal
-- note must stay admin-only. The barber reads only their own request
-- through my_info_request().
create table if not exists barber_reviews (
  barber_id uuid primary key references barber_profiles(id) on delete cascade,
  admin_note text,
  info_request text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

alter table barber_reviews enable row level security;

create policy "barber_reviews_admin_all" on barber_reviews for all
  using (is_admin()) with check (is_admin());

create or replace function public.my_info_request()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select info_request from barber_reviews where barber_id = auth.uid();
$$;

grant execute on function public.my_info_request() to authenticated;

-- A barber answering a request for more info puts themselves back in
-- the queue; nothing else about their verification is theirs to change.
create or replace function public.resubmit_verification()
returns void as $$
begin
  update barber_profiles set verification_status = 'pending'
  where id = auth.uid() and verification_status = 'needs_info';
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.resubmit_verification() from public, anon;
grant execute on function public.resubmit_verification() to authenticated;

-- ========== verification documents ==========
-- "3 of 3" in the admin queue = the three required kinds; the kit photo
-- is optional.
create table if not exists barber_documents (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barber_profiles(id) on delete cascade,
  kind text not null
    constraint barber_documents_kind_check
    check (kind in ('gov_id', 'selfie', 'certificate', 'kit_photo')),
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  unique (barber_id, kind)
);

alter table barber_documents enable row level security;

create policy "barber_documents_select" on barber_documents for select
  using (auth.uid() = barber_id or is_admin());
create policy "barber_documents_owner_insert" on barber_documents for insert
  with check (auth.uid() = barber_id);
create policy "barber_documents_owner_update" on barber_documents for update
  using (auth.uid() = barber_id) with check (auth.uid() = barber_id);
create policy "barber_documents_owner_delete" on barber_documents for delete
  using (auth.uid() = barber_id);

-- Private: IDs and selfies are served to admins through signed URLs only.
insert into storage.buckets (id, name, public)
values ('barber-documents', 'barber-documents', false)
on conflict (id) do nothing;

create policy "barber_documents_storage_select"
on storage.objects for select
using (
  bucket_id = 'barber-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

create policy "barber_documents_storage_insert"
on storage.objects for insert
with check (
  bucket_id = 'barber-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "barber_documents_storage_update"
on storage.objects for update
using (
  bucket_id = 'barber-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'barber-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "barber_documents_storage_delete"
on storage.objects for delete
using (
  bucket_id = 'barber-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ========== service catalog (the fixed menu from 0019) ==========
create table if not exists service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric not null check (price > 0),
  duration_minutes int not null check (duration_minutes > 0),
  sort int not null default 0
);

alter table service_catalog enable row level security;

create policy "service_catalog_public_select" on service_catalog for select using (true);
create policy "service_catalog_admin_update" on service_catalog for update
  using (is_admin()) with check (is_admin());

insert into service_catalog (name, price, duration_minutes, sort) values
  ('Kids Haircut', 200, 20, 1),
  ('Regular Haircut', 250, 30, 2),
  ('Haircut + Beard Shave', 300, 45, 3)
on conflict (name) do nothing;

-- New barbers get the catalog as it stands, not 0019's literals.
create or replace function public.seed_fixed_services()
returns trigger as $$
begin
  insert into services (barber_id, name, price, duration_minutes, is_active)
  select new.id, name, price, duration_minutes, true
  from service_catalog
  order by sort;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- A price change reaches every barber's menu at once. Bookings keep the
-- price they were made at (bookings.price).
create or replace function public.propagate_catalog_change()
returns trigger as $$
begin
  update services
  set name = new.name, price = new.price, duration_minutes = new.duration_minutes
  where name = old.name and is_active;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists service_catalog_propagate on service_catalog;
create trigger service_catalog_propagate
  after update on service_catalog
  for each row execute function public.propagate_catalog_change();
