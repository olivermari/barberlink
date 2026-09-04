# Barbero2Go

On-demand, same-day mobile barber booking (Grab/Angkas/FoodPanda model) for the Philippines market. Full context and roadmap: [README.md](README.md).

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui ("base-nova" style, built on **Base UI**, not Radix) + Supabase (Postgres/Auth/Realtime) + Leaflet/OpenStreetMap.

## Gotchas that aren't obvious from the code

- **shadcn Button uses Base UI, not Radix** — there's no `asChild`. To render a `Button` as a different element (e.g. a `Link`), use `render={<Link href="..." />}` with the text as children, not `<Button asChild><Link>...</Link></Button>`. If the render target isn't a native `<button>` (e.g. an `<a>`), pass `nativeButton={false}` or Base UI logs a console warning.
- **Supabase Realtime silently drops events without this**: before `.channel(...).subscribe()`, call `supabase.auth.getSession()` and `supabase.realtime.setAuth(session.access_token)`. Without it the channel joins fine (`SUBSCRIBED`) but RLS blocks every event server-side with no error. See `components/booking-status-tracker.tsx`.
- **Migrations run through the Supabase CLI**, not the dashboard SQL editor: `npx supabase db push` (project is linked; `npx supabase login` needs a one-time manual browser auth in the user's own terminal, not through an agent — same for `git push`, which needs Git Credential Manager's browser flow run manually once). Ad-hoc queries: `npx supabase db query --linked "..."`.
- **RLS**: `profiles` is public-read (`profiles_public_select`, `using (true)`) — barber names and reviewer names need to be visible to everyone, only `full_name`/`phone`/`avatar_url` live there (no credentials). Most other tables follow "public read, owner-only write."
- **Booking dispatch is server-side, not app logic**: a `BEFORE INSERT` trigger (`0007_booking_dispatch.sql`) sets a new booking's status to `pending` or `queued` depending on whether the barber already has an active job — the client never sets `status` on insert. An `AFTER UPDATE` trigger promotes the nearest `queued` booking (haversine distance to the barber's `current_lat/current_lng`, not FIFO) whenever a barber's active job ends. `barbers_busy_status()` is a `security definer` RPC so Quick Match can check availability without bookings RLS leaking other customers' data.

## Booking model (current)

Same-day on-demand, not future scheduling — `bookings.requested_at` defaults to `now()`. Two paths: **Quick Match** (auto-picks the nearest free barber, no surcharge) and **Choose Your Barber** (pick from a profile, +₱50 surcharge, queues if busy). See `README.md` roadmap for build phases and what's shipped.

## Test accounts (this Supabase project only)

- Customer: `om3893712+customer2@gmail.com` / `testpass123`
- Barber (no barber UI yet — Phase 5): `om3893712+barber1@gmail.com` / `testpass123`
- Admin: `om3893712+admin1@gmail.com` / `testpass123` (signed up as customer, then promoted with `update profiles set role = 'admin' where id = '...'` — signup has no admin option by design)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
