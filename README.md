# Barbero2Go

On-demand web platform connecting customers with independent, traveling freelance barbers for door-to-door haircut services.

Three interfaces in one app, role-based:

- **Customer** (`/customer`) — browse nearby barbers on a map, view portfolios/ratings, book a home-visit appointment, track status in real time, pay in-app.
- **Barber** (`/barber`) — manage profile/portfolio, set availability, accept/decline bookings, update service status live, track token earnings.
- **Admin** (`/admin`) — verify/onboard barbers, manage service coverage areas, view platform analytics, resolve disputes, manage pricing/policy.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage
- [Leaflet](https://leafletjs.com) + OpenStreetMap for maps/geolocation
- [PayMongo](https://paymongo.com) for GCash / Maya / Card / InstaPay payments

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Database schema and Row Level Security policies live in [`supabase/migrations`](supabase/migrations) — run them in the Supabase SQL Editor (or via the Supabase CLI) against a fresh project.

## Roadmap

See project board / commit history for progress. Build phases:

0. Tooling + Supabase project setup
1. Scaffold + schema + auth (this repo's initial commit)
2. Role-based route protection + app shell
3. Customer interface (browse, book, track)
4. Barber interface (profile, availability, bookings, earnings)
5. Realtime booking status pipeline
6. Payments (PayMongo) + token ledger
7. Admin interface (verification, coverage, analytics, disputes)
8. Reviews, polish, production deploy
