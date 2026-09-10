-- Services stop being barber-customizable. The business now offers a
-- fixed platform-wide menu — Kids Haircut ₱200, Regular Haircut ₱250,
-- Haircut + Beard Shave ₱300 — so the 25% commission (0011) is a fixed
-- cut of a fixed price, not something a barber could quietly undercut
-- by setting their own prices. Existing custom rows are deactivated,
-- not deleted, so historical bookings' service_id and the service name
-- shown in booking history/receipts stay intact.

update services set is_active = false where is_active = true;

insert into services (barber_id, name, price, duration_minutes, is_active)
select id, v.name, v.price, v.duration_minutes, true
from barber_profiles
cross join (values
  ('Kids Haircut', 200, 20),
  ('Regular Haircut', 250, 30),
  ('Haircut + Beard Shave', 300, 45)
) as v(name, price, duration_minutes);

-- Every new barber gets the same fixed menu automatically — there's no
-- "add a service" step in onboarding.
create or replace function public.seed_fixed_services()
returns trigger as $$
begin
  insert into services (barber_id, name, price, duration_minutes, is_active) values
    (new.id, 'Kids Haircut', 200, 20, true),
    (new.id, 'Regular Haircut', 250, 30, true),
    (new.id, 'Haircut + Beard Shave', 300, 45, true);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger barber_profiles_seed_services
  after insert on barber_profiles
  for each row execute function public.seed_fixed_services();

-- Prices are fixed platform-wide now, so a barber setting their own
-- name/price would undermine the guaranteed commission — only admins
-- (or the seeding trigger above, which runs security definer) write
-- to this table going forward.
drop policy if exists "services_owner_write" on services;
create policy "services_admin_write" on services for all using (is_admin()) with check (is_admin());
