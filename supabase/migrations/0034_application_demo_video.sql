-- Barber-partner applications gain a haircut demonstration video, and the
-- admin app gets read access so applications can finally be reviewed
-- somewhere other than the Supabase dashboard.
--
-- The video column is nullable so applications saved before this existed (and
-- the site version still deployed while this runs) stay valid; the marketing
-- site's API is what requires a video on new applications.
alter table public.barber_applications
  add column if not exists demo_video_path text;

-- Videos are the first files here above the old 10 MB cap. 50 MB is the most
-- the Supabase plan allows per file.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'application/pdf',
      'video/mp4', 'video/quicktime', 'video/webm'
    ]
where id = 'barber-applications';

-- Admin read access, enforced in the database like every other admin
-- surface: is_admin() is only true for a two-step (aal2) admin session
-- (0033), so a password-only session still sees nothing. 0031 revoked all
-- table access from authenticated; only what the review screen needs comes
-- back — read everything, change the stage and nothing else.
grant select on public.barber_applications to authenticated;
grant update (status) on public.barber_applications to authenticated;

create policy "barber_applications_admin_select"
on public.barber_applications for select
using (public.is_admin());

create policy "barber_applications_admin_update"
on public.barber_applications for update
using (public.is_admin())
with check (public.is_admin());

-- Photos, IDs, the certificate and the video are served to admins through
-- signed URLs.
create policy "barber_applications_storage_admin_select"
on storage.objects for select
using (bucket_id = 'barber-applications' and public.is_admin());
