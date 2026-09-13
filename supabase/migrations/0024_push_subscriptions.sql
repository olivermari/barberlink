-- Real Web Push (delivers to the mobile notification bar even while the
-- browser is minimized — the plain Notification API used until now only
-- reaches a tab whose JS is still running, which mobile OSes suspend
-- within seconds of backgrounding). One row per subscribed device, so a
-- user with two devices just gets two rows and both get pushed.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_owner_select" on push_subscriptions for select using (
  auth.uid() = user_id
);
create policy "push_subscriptions_owner_insert" on push_subscriptions for insert with check (
  auth.uid() = user_id
);
create policy "push_subscriptions_owner_update" on push_subscriptions for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);
create policy "push_subscriptions_owner_delete" on push_subscriptions for delete using (
  auth.uid() = user_id
);
