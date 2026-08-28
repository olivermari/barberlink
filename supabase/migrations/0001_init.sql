-- BarberLink initial schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query),
-- or via `supabase db push` if you set up the Supabase CLI later.

-- ========== Enums ==========
create type user_role as enum ('customer', 'barber', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type booking_status as enum ('pending', 'accepted', 'declined', 'on_the_way', 'in_service', 'completed', 'cancelled');
create type payment_method as enum ('gcash', 'maya', 'card', 'instapay', 'cod');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type dispute_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type token_ledger_type as enum ('earned', 'adjustment', 'withdrawal');

-- ========== profiles ==========
-- One row per auth user. Created automatically on signup (trigger below).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ========== barber_profiles ==========
create table barber_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  bio text,
  years_experience int,
  verification_status verification_status not null default 'pending',
  id_document_url text,
  is_available boolean not null default false,
  current_lat double precision,
  current_lng double precision,
  base_address text,
  service_radius_km numeric default 5,
  rating_avg numeric default 0,
  rating_count int default 0,
  token_balance numeric default 0,
  created_at timestamptz not null default now()
);

-- ========== barber_portfolio ==========
create table barber_portfolio (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barber_profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ========== services ==========
create table services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barber_profiles(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null,
  duration_minutes int not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== barber_availability ==========
create table barber_availability (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barber_profiles(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);

-- ========== bookings ==========
create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  barber_id uuid not null references barber_profiles(id),
  service_id uuid references services(id),
  scheduled_at timestamptz not null,
  address_text text not null,
  address_lat double precision not null,
  address_lng double precision not null,
  status booking_status not null default 'pending',
  price numeric not null,
  platform_fee numeric not null default 0,
  barber_payout numeric not null default 0,
  payment_method payment_method,
  payment_status payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== payments ==========
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider text not null default 'paymongo',
  provider_payment_id text,
  method payment_method not null,
  amount numeric not null,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ========== token_ledger ==========
create table token_ledger (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barber_profiles(id) on delete cascade,
  booking_id uuid references bookings(id),
  type token_ledger_type not null,
  token_amount numeric not null,
  created_at timestamptz not null default now()
);

-- ========== reviews ==========
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  customer_id uuid not null references profiles(id),
  barber_id uuid not null references barber_profiles(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ========== disputes ==========
create table disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  raised_by uuid not null references profiles(id),
  category text,
  description text,
  status dispute_status not null default 'open',
  resolution_notes text,
  admin_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ========== service_areas ==========
create table service_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km numeric not null default 10,
  is_active boolean not null default true
);

-- ========== platform_settings ==========
create table platform_settings (
  key text primary key,
  value jsonb not null
);

insert into platform_settings (key, value) values
  ('fee_percentage', '10'),
  ('policy_text', '""');

-- ========== Auto-create profile row on signup ==========
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== updated_at bump for bookings ==========
create function public.bump_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function public.bump_updated_at();

-- ========== Row Level Security ==========
alter table profiles enable row level security;
alter table barber_profiles enable row level security;
alter table barber_portfolio enable row level security;
alter table services enable row level security;
alter table barber_availability enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table token_ledger enable row level security;
alter table reviews enable row level security;
alter table disputes enable row level security;
alter table service_areas enable row level security;
alter table platform_settings enable row level security;

-- Helper: is the current user an admin?
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: self read/update, admin full read
create policy "profiles_self_select" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

-- barber_profiles: public read (customers browse barbers), self + admin write
create policy "barber_profiles_public_select" on barber_profiles for select using (true);
create policy "barber_profiles_self_insert" on barber_profiles for insert with check (auth.uid() = id);
create policy "barber_profiles_self_update" on barber_profiles for update using (auth.uid() = id or is_admin());

-- barber_portfolio: public read, barber owns writes
create policy "portfolio_public_select" on barber_portfolio for select using (true);
create policy "portfolio_owner_write" on barber_portfolio for all using (auth.uid() = barber_id) with check (auth.uid() = barber_id);

-- services: public read (active), barber owns writes
create policy "services_public_select" on services for select using (true);
create policy "services_owner_write" on services for all using (auth.uid() = barber_id) with check (auth.uid() = barber_id);

-- barber_availability: public read, barber owns writes
create policy "availability_public_select" on barber_availability for select using (true);
create policy "availability_owner_write" on barber_availability for all using (auth.uid() = barber_id) with check (auth.uid() = barber_id);

-- bookings: visible to the customer who made it, the assigned barber, or admin
create policy "bookings_select" on bookings for select using (
  auth.uid() = customer_id or auth.uid() = barber_id or is_admin()
);
create policy "bookings_customer_insert" on bookings for insert with check (auth.uid() = customer_id);
create policy "bookings_update" on bookings for update using (
  auth.uid() = customer_id or auth.uid() = barber_id or is_admin()
);

-- payments: visible to related booking's customer/barber, admin
create policy "payments_select" on payments for select using (
  is_admin() or exists (
    select 1 from bookings b where b.id = payments.booking_id
    and (b.customer_id = auth.uid() or b.barber_id = auth.uid())
  )
);
create policy "payments_insert" on payments for insert with check (
  exists (
    select 1 from bookings b where b.id = payments.booking_id
    and b.customer_id = auth.uid()
  )
);

-- token_ledger: barber sees own, admin sees all
create policy "token_ledger_select" on token_ledger for select using (auth.uid() = barber_id or is_admin());

-- reviews: public read, customer writes for own completed bookings
create policy "reviews_public_select" on reviews for select using (true);
create policy "reviews_customer_insert" on reviews for insert with check (auth.uid() = customer_id);

-- disputes: visible to raiser, involved barber, admin
create policy "disputes_select" on disputes for select using (
  auth.uid() = raised_by or is_admin() or exists (
    select 1 from bookings b where b.id = disputes.booking_id and b.barber_id = auth.uid()
  )
);
create policy "disputes_insert" on disputes for insert with check (auth.uid() = raised_by);
create policy "disputes_admin_update" on disputes for update using (is_admin());

-- service_areas: public read, admin write
create policy "service_areas_public_select" on service_areas for select using (true);
create policy "service_areas_admin_write" on service_areas for all using (is_admin()) with check (is_admin());

-- platform_settings: public read, admin write
create policy "platform_settings_public_select" on platform_settings for select using (true);
create policy "platform_settings_admin_write" on platform_settings for all using (is_admin()) with check (is_admin());
