# Kootam

"Kootam" (Tamil for crowd) is a crowd-powered flight app: users vote for a
route, pledge a seat with a deposit, and once enough people join, the group
flight unlocks at a price below peak fares. If it doesn't fill, everyone is
refunded automatically.

**[Live pitch page →](https://aruios.github.io/TicketCampaign/)**

## Layout

```
.
├── index.html          Landing page (GitHub Pages, served from repo root)
├── kootam-admin/        Next.js admin app — campaigns, ledger, organizers
├── kootam-backend/       Supabase schema, RLS policies, and edge functions
└── Documentation/        Setup guides for backend, admin web, and mobile
```

## Getting started

Start with [`Documentation/README.md`](./Documentation/README.md) — it walks
through local Supabase setup, running the admin app, and a full manual
dry-run of a campaign's lifecycle (pledge → funded → ticketed, and the
failed → refunded path).

Quick start:

```bash
# 1. Backend (needs Docker or Podman)
cd kootam-backend
supabase start
supabase db reset   # applies schema + seed data

# 2. Admin app
cd ../kootam-admin
cp .env.local.example .env.local   # fill in keys from `supabase start` output
npm install
npm run dev
```

## Companion iOS app

The SwiftUI mobile app (Onboarding, Explore, Pledge, My Trips, etc.) lives in
a separate Xcode project and isn't included in this repo yet — ask if you
need it.
