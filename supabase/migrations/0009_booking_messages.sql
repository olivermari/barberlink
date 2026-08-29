-- In-app chat between a booking's customer and barber (confirm service
-- details / exact location before the barber arrives).

create table booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table booking_messages enable row level security;

create policy "booking_messages_select" on booking_messages for select using (
  is_admin() or exists (
    select 1 from bookings b where b.id = booking_messages.booking_id
    and (b.customer_id = auth.uid() or b.barber_id = auth.uid())
  )
);

create policy "booking_messages_insert" on booking_messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from bookings b where b.id = booking_messages.booking_id
    and (b.customer_id = auth.uid() or b.barber_id = auth.uid())
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'booking_messages'
  ) then
    alter publication supabase_realtime add table booking_messages;
  end if;
end $$;
