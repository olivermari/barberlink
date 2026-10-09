-- Roles are granted by the platform, never chosen by the user.
--
-- Before this migration two paths let anyone pick their own role, including
-- 'admin': handle_new_user() copied `role` straight from the signup
-- metadata the browser sends, and profiles_self_update lets a user update
-- every column of their own row, `role` included.
--
-- Barbers now apply on the marketing site (barbero2go.com/barber-partners)
-- and are validated on site; an admin then promotes their customer account:
--   update profiles set role = 'barber' where id = '<user id>';
-- (run through `npx supabase db query --linked`, or by an admin session).

-- 1. Every signup is a customer, whatever metadata the client sends.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'customer',
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. A signed-in user can still edit their own name, phone and avatar, but
-- not their role. Same pattern as barber_profiles_guard (0020): the check
-- only applies to API requests (current_user = 'authenticated'), so admins,
-- the service role and SQL run by the team are unaffected.
create or replace function public.profiles_guard()
returns trigger as $$
begin
  if current_user = 'authenticated'
     and not public.is_admin()
     and new.role is distinct from old.role then
    raise exception 'Roles are managed by the platform.';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists profiles_guard_before_update on public.profiles;
create trigger profiles_guard_before_update
  before update on public.profiles
  for each row execute function public.profiles_guard();
