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
6. 🟡 Payments (PayMongo, GCash-only) + token ledger — fixed 25% platform commission. Cash (COD) is fully live: customer picks a payment method at booking, barber marks cash received, and completing the job debits the platform's commission from the barber's wallet (they already collected the full price in person) — a top-up flow settles a negative balance, and going online is blocked while commission is owed. Online payment is GCash-only (Maya/Card/InstaPay removed from the picker) via PayMongo's current Payment Intent workflow (`lib/paymongo.ts`). With a real `PAYMONGO_SECRET_KEY` in `.env.local`, booking/top-up GCash checkout is **confirmed working against PayMongo's live sandbox** — verified end to end through an actual sandbox redirect and test authorization. Without a key configured, it falls back to a simulated payment so the pipeline is still testable with no credentials. **Deliberately deferred**: the webhook that flips `payment_status` to `paid` automatically (`PAYMONGO_WEBHOOK_SECRET` + a public endpoint) — needs a real domain, so it's picked up in Phase 10 below rather than tested against a throwaway tunnel URL now.
7. Landing page — public-facing marketing/entry page
8. Admin interface (verification, coverage, analytics, disputes)
9. Visual design system — logo, color palette, typography, component/button styling, motion, layout conventions across all three interfaces
10. Final polish, QA, production deploy — **includes**: buying/pointing a real domain at the production deployment, then finishing the Phase 6 PayMongo integration by registering the production webhook URL (`https://<your-domain>/api/payments/webhook`) in the PayMongo dashboard and setting `PAYMONGO_WEBHOOK_SECRET` from it — this is the one remaining piece to make GCash payments fully live end to end
