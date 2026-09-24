-- Subscribing a postgres_changes binding to a table that isn't in the
-- supabase_realtime publication doesn't just fail that one binding —
-- it silently breaks delivery for every other binding on the same
-- channel too (confirmed live: adding a disputes UPDATE listener
-- alongside a bookings UPDATE listener on one channel stopped the
-- bookings events from arriving at all, even though bookings is
-- already published). disputes and token_ledger are the two new
-- tables the notification providers listen to; barber_profiles and
-- bookings were already added by earlier migrations.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'disputes'
  ) then
    alter publication supabase_realtime add table disputes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'token_ledger'
  ) then
    alter publication supabase_realtime add table token_ledger;
  end if;
end $$;
