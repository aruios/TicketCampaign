# Kootam — Local Development Docs

"Kootam" (Tamil for crowd) is a crowd-powered flight app: users vote for a
route, pledge a seat with a deposit, and once enough people join, the group
flight unlocks at a price below peak fares. If it doesn't fill, everyone is
refunded automatically. Full product context lives in `../flight_campign.rtf`.

This folder documents how to stand up the whole system **locally** — backend,
admin web app, and iOS app — so you can run an actual test campaign
end-to-end on your own machine before anything touches production.

## System overview

```
iOS app (SwiftUI) ─┐
Admin web (Next.js) ─┼──► Supabase (Postgres + Auth + Edge Functions + Cron)
Public web (Next.js) ─┘            │
                                    ├── Stripe (deposits, charges, refunds, webhooks)
                                    ├── Push (APNs) + SMS/WhatsApp (Twilio)
                                    └── Storage (e-tickets, docs)
```

- **Backend**: Supabase (Postgres, Auth, Row-Level Security, Edge Functions,
  Cron). One project, one schema, shared by every client.
- **Admin web app**: internal tool for creating campaigns, tracking pledges
  vs. target, uploading tickets, reconciling payments. You are the only user.
- **Public web app**: the page people actually pledge from — most traffic
  arrives via WhatsApp links, so this has to work without installing anything.
- **iOS app**: the SwiftUI project already scaffolded in `../FlightCampign/`.
  Explore routes, vote, pledge, track "My Trips," upload passenger docs.

## Read the docs in this order

1. [`backend-setup.md`](./backend-setup.md) — Supabase local instance, schema,
   RLS, Stripe test keys. Do this first; both apps depend on it.
2. [`admin-web-setup.md`](./admin-web-setup.md) — scaffold and run the Next.js
   admin app against your local Supabase instance.
3. [`mobile-app-setup.md`](./mobile-app-setup.md) — wire the existing Xcode
   project to local Supabase, add Stripe/Supabase SPM packages, run in the
   simulator.
4. [`running-a-campaign.md`](./running-a-campaign.md) — a full manual
   walkthrough: create a route and campaign in admin, pledge from the app,
   simulate hitting the target, charge balances, upload tickets.

## Campaign lifecycle (shared vocabulary)

```
draft → open → funded → booking → ticketed → completed
          └──(deadline hit, target missed)──► failed → refunded
```

Every doc below refers back to this state machine — the admin app moves a
campaign forward through it, the mobile/web apps just reflect current state
and let users pledge while `open`.

## Conventions used across these docs

- All local secrets are **test-mode** (Stripe test keys, local Supabase
  anon/service-role keys). Never put live keys in a local `.env`.
- Environment variable names are kept identical between the admin web app and
  the iOS app's config so you can cross-reference one `.env.local` while
  reading `Config.xcconfig`.
- "Local Supabase" means the Supabase CLI's Docker-based stack
  (`supabase start`), not a hosted project — this is what lets you iterate on
  schema/RLS without touching real data.
