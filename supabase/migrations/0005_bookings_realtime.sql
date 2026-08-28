-- Adds bookings to Supabase's realtime publication so the customer's
-- booking-detail page can subscribe to live status updates.
-- Guarded so it's safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
end $$;
