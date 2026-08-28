-- Seeds demo data onto the "Test Barber One" account created earlier
-- (om3893712+barber1@gmail.com) so the customer browse/book flow has
-- something real to show before barbers can self-manage their profile
-- (that's Phase 4). Replace the UUID below with a different barber_id
-- if you're seeding a different account — find it in Table Editor →
-- profiles, or via: select id from profiles where role = 'barber';
--
-- Safe to re-run: upserts the barber_profiles row and replaces the
-- demo services/portfolio each time.

do $$
declare
  demo_barber_id uuid := 'ce1e1e38-bac2-4c5a-8fca-bfd10b4af46b';
begin
  insert into barber_profiles (
    id, bio, years_experience, verification_status, is_available,
    current_lat, current_lng, base_address, service_radius_km
  )
  values (
    demo_barber_id,
    'Fifteen years cutting hair in barbershops before going mobile. Fades, tapers, and beard work — I bring the chair to you.',
    8,
    'verified',
    true,
    14.5995,
    120.9842,
    'Manila, Metro Manila',
    8
  )
  on conflict (id) do update set
    bio = excluded.bio,
    years_experience = excluded.years_experience,
    verification_status = excluded.verification_status,
    is_available = excluded.is_available,
    current_lat = excluded.current_lat,
    current_lng = excluded.current_lng,
    base_address = excluded.base_address,
    service_radius_km = excluded.service_radius_km;

  delete from services where barber_id = demo_barber_id;
  insert into services (barber_id, name, description, price, duration_minutes)
  values
    (demo_barber_id, 'Classic Haircut', 'Scissor or clipper cut, wash, and style.', 350, 30),
    (demo_barber_id, 'Haircut + Beard Trim', 'Full haircut plus beard shaping and line-up.', 500, 45),
    (demo_barber_id, 'Kids Haircut', 'For ages 12 and under.', 250, 25);

  delete from barber_portfolio where barber_id = demo_barber_id;
  insert into barber_portfolio (barber_id, image_url, caption)
  values
    (demo_barber_id, 'https://picsum.photos/seed/fade1/600/600', 'Skin fade, tapered sides'),
    (demo_barber_id, 'https://picsum.photos/seed/fade2/600/600', 'Textured crop'),
    (demo_barber_id, 'https://picsum.photos/seed/beard1/600/600', 'Beard shape-up');
end $$;
