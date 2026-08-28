-- profiles only holds display info (full_name, phone, avatar_url) —
-- auth credentials live in auth.users, which PostgREST never exposes.
-- Customers need to read barber names when browsing, and reviewer
-- names alongside public reviews, so open up SELECT the same way
-- every other table here does (public read, owner-only write).

drop policy if exists "profiles_self_select" on profiles;

create policy "profiles_public_select" on profiles
  for select using (true);
