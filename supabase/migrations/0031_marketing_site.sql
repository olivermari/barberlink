-- Tables, private storage and a tiny rate limiter for the Barbero2Go.com
-- marketing site (a separate Next.js project that shares this database):
-- barber-partner applications and contact-form messages.
--
-- Nothing here is readable or writable from a browser: RLS is on with no
-- policies, and table access is revoked from anon/authenticated. The site's
-- server routes use the service role, which bypasses RLS. Applications are
-- reviewed in the Supabase dashboard for now; they are separate from the app's
-- own barber verification (barber_documents) until an admin flow exists.

create sequence if not exists public.barber_application_seq start 1;

create table if not exists public.barber_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null unique
    default ('APP-' || lpad(nextval('public.barber_application_seq')::text, 4, '0')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  mobile text not null,
  email text not null,
  home_address text not null,
  experience text not null check (experience in
    ('Less than 1 year', '1 to 2 years', '3 to 5 years', 'More than 5 years')),
  portfolio_paths text[] not null check (array_length(portfolio_paths, 1) between 3 and 10),
  government_id_paths text[] not null check (array_length(government_id_paths, 1) between 1 and 2),
  certificate_path text not null,
  agreed_terms boolean not null check (agreed_terms = true),
  status text not null default 'submitted' check (status in
    ('submitted', 'verifying', 'interview_scheduled', 'training', 'active', 'not_yet')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  contact text not null, -- email or PH mobile number
  topic text not null check (topic in
    ('Booking problem', 'Payment or refund', 'Barber application', 'Feedback', 'Something else')),
  booking_id text, -- optional, format B2G-0000
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null, -- hash of route + client address, never the address itself
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_created_idx
  on public.rate_limit_hits (key, created_at desc);

alter table public.barber_applications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.rate_limit_hits enable row level security;

revoke all on table public.barber_applications from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.rate_limit_hits from anon, authenticated;

-- Records one hit and says whether the caller is still under the limit
-- (p_max hits per p_window_seconds). Serverless functions have no shared
-- memory, so the counter lives here.
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  delete from rate_limit_hits where created_at < now() - interval '1 day';

  select count(*) into recent
  from rate_limit_hits
  where key = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_max then
    return false;
  end if;

  insert into rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- Private bucket for application photos and ID documents. Files are uploaded
-- with short-lived signed upload URLs issued by the site's server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barber-applications',
  'barber-applications',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;
