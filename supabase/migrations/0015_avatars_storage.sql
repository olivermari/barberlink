-- Profile photo uploads (customer + barber) via Supabase Storage.
-- Fixed path per user (<user_id>/avatar) rather than a uuid-per-upload
-- like barber-portfolio — there's only ever one avatar per person, so
-- re-uploading should overwrite in place instead of accumulating
-- orphaned files. That means uploads need an UPDATE policy too (an
-- upsert to an existing path is an UPDATE at the storage.objects
-- level, not just an INSERT).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_storage_public_select"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_storage_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_storage_owner_update"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_storage_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
