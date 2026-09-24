-- Infrastructure for server-triggered push (see 0024 and 0026): a
-- Postgres trigger can't call a browser API, so it calls out over HTTP
-- (pg_net, async/fire-and-forget) to our own /api/push/dispatch route,
-- which holds the actual web-push library and VAPID keys.
--
-- The dispatch URL isn't sensitive (it's just barbero2go.com), so it's a
-- literal in this function — Supabase's hosted Postgres doesn't grant
-- `alter database ... set`, which is the usual way to make a plain
-- setting like this editable without a migration, so a literal plus
-- `create or replace function` (via `npx supabase db query --linked`,
-- the same non-committed path used for local-dev tunnel testing) is the
-- simplest thing that actually works here. The shared secret that
-- proves a request came from this database IS sensitive — this repo is
-- public, so it must never appear in a migration file. It lives in
-- Supabase Vault instead (pre-installed on every Supabase project) and
-- is inserted once, out of band, via `npx supabase db query --linked`,
-- never written to a committed file.

create extension if not exists pg_net with schema extensions;

-- One choke point every trigger in 0026 calls through. Fire-and-forget:
-- net.http_post queues the request and returns immediately, so a push
-- failure (or a dev environment with no reachable dispatch URL) never
-- blocks or fails the underlying booking/chat/dispute write.
create or replace function public.push_notify(
  target_user_ids uuid[],
  title text,
  body text,
  url text,
  tag text default null
)
returns void as $$
declare
  dispatch_secret text;
  dispatch_url text := 'https://barbero2go.com/api/push/dispatch';
begin
  if target_user_ids is null or array_length(target_user_ids, 1) is null then
    return;
  end if;

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'push_dispatch_secret';

  if dispatch_secret is null then
    return;
  end if;

  perform net.http_post(
    url := dispatch_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || dispatch_secret
    ),
    body := jsonb_build_object(
      'userIds', to_jsonb(target_user_ids),
      'title', title,
      'body', body,
      'url', url,
      'tag', tag
    )
  );
end;
$$ language plpgsql security definer set search_path = public, extensions;
