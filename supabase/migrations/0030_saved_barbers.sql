-- Saved barbers (Customer UI, Profile & settings): a customer keeps the
-- barbers they like one tap away. Own rows only.

create table if not exists saved_barbers (
  customer_id uuid not null references profiles(id) on delete cascade,
  barber_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, barber_id)
);

alter table saved_barbers enable row level security;

create policy "saved_barbers_select" on saved_barbers
  for select using (auth.uid() = customer_id);

create policy "saved_barbers_insert" on saved_barbers
  for insert with check (auth.uid() = customer_id);

create policy "saved_barbers_delete" on saved_barbers
  for delete using (auth.uid() = customer_id);
