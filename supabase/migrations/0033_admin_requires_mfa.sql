-- Admin powers need a two-step sign-in, enforced in the database.
--
-- Admins log in with a password and then a 6-digit code from an
-- authenticator app (TOTP, Supabase Auth MFA). Only after the code does the
-- session's JWT carry aal = 'aal2'. The app already keeps password-only
-- admin sessions out of /admin (lib/supabase/middleware.ts), but admin
-- pages talk to the database straight from the browser, so the real lock
-- has to live here: is_admin() backs 17 RLS policies and the write guards
-- (barber_profiles_guard, profiles_guard, ...). With this change a stolen
-- admin password alone gets an ordinary signed-in session, nothing more.
--
-- Lost authenticator? Remove the admin's factor, then they enroll a new one
-- on their next login:
--   delete from auth.mfa_factors where user_id = '<admin user id>';

create or replace function public.is_admin()
returns boolean as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    );
$$ language sql security definer stable set search_path = public;
