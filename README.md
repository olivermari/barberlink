# Barbero2Go

Same-day, on-demand web platform connecting customers with independent, traveling freelance barbers for door-to-door haircut services — Grab/Angkas/FoodPanda-style dispatch, not future scheduling.

Three interfaces in one app, role-based:

- **Customer** (`/customer`) — browse nearby barbers on a map, view portfolios/ratings/reviews, either **Quick Match** (auto-picks the nearest free barber, no fee) or **Choose Your Barber** (pick from a profile, +₱50, queues if busy), track status live, cancel, leave a review, pay in-app.
- **Barber** (`/barber`) — manage profile/portfolio, set availability, accept/decline incoming and queued bookings, update service status live, track token earnings.
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

Database schema and Row Level Security policies live in [`supabase/migrations`](supabase/migrations). Link the project and push them with the Supabase CLI:

```bash
npx supabase login   # one-time, opens a browser
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## Roadmap

See commit history for the detailed progress. Build phases (✅ shipped):

0. ✅ Tooling + Supabase project setup
1. ✅ Scaffold + schema + auth
2. ✅ Role-based route protection + app shell
3. ✅ Customer interface — browse/map, barber profiles, Quick Match + Choose Your Barber (with per-barber queueing and nearest-location promotion), live status tracking, reviews, cancel
4. ✅ Barber interface — profile/services/portfolio (with real photo uploads), mandatory-GPS online/offline toggle, bookings/queue dashboard with accept/decline/status actions, job map + one-tap navigation, earnings + service history
5. ✅ Realtime booking pipeline — barber side (customer side already live in Phase 3)
6. 🟡 Payments (PayMongo) + token ledger — cash (COD) is fully live: customer picks a payment method at booking, barber marks cash received, and completing a paid job automatically credits the barber's token ledger/balance exactly once. Online methods (GCash/Maya/Card/InstaPay) run through a real PayMongo-shaped API route that **simulates** the payment when no API keys are configured, so the whole pipeline is testable today — swap in real `PAYMONGO_SECRET_KEY`/`PAYMONGO_WEBHOOK_SECRET` (see `.env.local.example`) to go live; the webhook signature verification is unverified until then.
7. Landing page — public-facing marketing/entry page
8. Admin interface (verification, coverage, analytics, disputes)
9. Visual design system — logo, color palette, typography, component/button styling, motion, layout conventions across all three interfaces
10. Final polish, QA, production deploy
