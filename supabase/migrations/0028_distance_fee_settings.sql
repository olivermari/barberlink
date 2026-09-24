-- Nearby barbers now reach 5 km instead of 1, and a barber farther than
-- 3 km from the booked spot earns a per-km distance fee on top of the
-- price (charged to the customer, kept in full by the barber — see
-- components/booking-dialog.tsx). All three numbers are admin-tunable.
update platform_settings set value = '5' where key = 'max_match_radius_km';

insert into platform_settings (key, value) values
  ('distance_free_km', '3'),
  ('distance_fee_per_km', '10')
on conflict (key) do nothing;
