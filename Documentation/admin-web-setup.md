# Admin Web App Setup (local)

Internal tool — you're the only user. Runs against local Supabase from
[`backend-setup.md`](./backend-setup.md).

## What it needs to do (from the product spec)

- Create/edit campaigns and price tiers, attach supplier quotes
- Live dashboard: pledges vs. target, deadline countdown
- Manifest export — CSV name list in airline group-desk format
- Ticket upload — enter PNR/ticket numbers, auto-notify passengers
- Payment reconciliation from the `ledger` table, plus refunds
- Organizer commissions and payouts

## Prerequisites

- Node.js 18+
- Local Supabase running (`supabase start` from `backend-setup.md`)
- Stripe CLI running (`stripe listen`, from `backend-setup.md`)

## 1. Scaffold

```bash
cd ~/Documents/Flight_Ticket_Scope
npx create-next-app@latest kootam-admin --typescript --tailwind --app --eslint
cd kootam-admin
npm install @supabase/supabase-js @supabase/ssr stripe
```

## 2. Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen`
```

`SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` must only ever be read in
server code (API routes / server components) — never imported into a client
component, since they bypass RLS and can move real money.

## 3. Suggested structure

```
kootam-admin/
  app/
    (auth)/login/            -- admin sign-in (Supabase email OTP is fine for one user)
    campaigns/
      page.tsx               -- list + create
      [id]/page.tsx           -- detail: pledges vs target, price tiers, status actions
      [id]/manifest/route.ts  -- CSV export
      [id]/tickets/page.tsx   -- ticket upload form
    ledger/page.tsx           -- reconciliation view
    organizers/page.tsx       -- commissions/payouts
    api/
      webhooks/stripe/route.ts   -- Stripe webhook handler (source of truth for payment state)
      campaigns/[id]/advance/route.ts  -- move status forward (open→funded etc.)
  lib/
    supabase/server.ts        -- service-role client, server-only
    supabase/client.ts        -- anon client, for the (rare) client-side reads
    stripe.ts
```

## 4. Two Supabase clients, on purpose

```ts
// lib/supabase/server.ts — server-only, full access
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Use `supabaseAdmin` in API routes and server components only. It bypasses
RLS, which is exactly what the admin app needs (you must see every user's
pledges), but it means every query here is trusted code — no per-request
filtering by `auth.uid()` to lean on.

## 5. Stripe webhook handler

This is the source of truth for payment state — don't trust client-reported
"payment succeeded," always confirm via webhook before writing to `ledger`
or advancing a pledge's `status`.

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()
  const event = stripe.webhooks.constructEvent(
    body, sig, process.env.STRIPE_WEBHOOK_SECRET!
  )

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabaseAdmin.from('ledger').insert({
        type: pi.metadata.kind, // 'deposit' | 'charge'
        amount: pi.amount / 100,
        stripe_ref: pi.id,
        pledge_id: pi.metadata.pledge_id,
      })
      break
    }
    case 'payment_intent.payment_failed': {
      // mark pledge status 'failed', queue payment-link retry
      break
    }
  }
  return new Response('ok', { status: 200 })
}
```

Test it locally with `stripe trigger payment_intent.succeeded` while
`stripe listen` is running.

## 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. Confirm it can read from local Supabase by
hitting `http://127.0.0.1:54323` (Studio) side by side and checking rows
created through the admin UI show up there.

## 7. Manifest export format

The airline group desk typically wants a flat CSV: passenger name (exactly
as on passport), DOB, nationality, PNR (once assigned). Build the export
route as a plain CSV response, not a client-side download:

```ts
// app/campaigns/[id]/manifest/route.ts
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { data } = await supabaseAdmin
    .from('passengers')
    .select('name_as_passport, dob, nationality, pledges!inner(campaign_id)')
    .eq('pledges.campaign_id', params.id)

  const csv = ['Name,DOB,Nationality',
    ...data!.map(p => `${p.name_as_passport},${p.dob},${p.nationality}`)
  ].join('\n')

  return new Response(csv, { headers: { 'Content-Type': 'text/csv' } })
}
```

Next: [`mobile-app-setup.md`](./mobile-app-setup.md).
