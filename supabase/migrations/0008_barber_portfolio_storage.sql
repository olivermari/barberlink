-- Phase 4: barber portfolio photo uploads via Supabase Storage.

alter table barber_portfolio add column storage_path text;

insert into storage.buckets (id, name, public)
values ('barber-portfolio', 'barber-portfolio', true)
on conflict (id) do nothing;

-- Upload convention: barber-portfolio/<barber_id>/<uuid>-<filename>
create policy "barber_portfolio_storage_public_select"
on storage.objects for select
using (bucket_id = 'barber-portfolio');

create policy "barber_portfolio_storage_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'barber-portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "barber_portfolio_storage_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'barber-portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
