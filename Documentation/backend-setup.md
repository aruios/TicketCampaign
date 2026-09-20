# Backend Setup — Supabase (local)

Both the admin web app and the iOS app read/write the same Supabase project.
Set this up first.

## Prerequisites

- Docker Desktop (Supabase CLI runs Postgres, Auth, Storage, etc. in
  containers)
- Node.js 18+ (for the Supabase CLI and later the Next.js app)
- A free [Stripe](https://dashboard.stripe.com) account, test mode only
- (Optional, for WhatsApp/SMS reminders) A [Twilio](https://www.twilio.com)
  trial account

## 1. Install the Supabase CLI

```bash
brew install supabase/tap/supabase
supabase --version
```

## 2. Create the project

```bash
mkdir -p ~/Documents/Flight_Ticket_Scope/kootam-backend
cd ~/Documents/Flight_Ticket_Scope/kootam-backend
supabase init
supabase start
```

`supabase start` prints local credentials — save them, you'll need them for
both the admin app and the iOS app:

```
API URL:        http://127.0.0.1:54321
GraphQL URL:     http://127.0.0.1:54321/graphql/v1
DB URL:          postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:      http://127.0.0.1:54323
anon key:        eyJ...
service_role key: eyJ...
```

Studio (`http://127.0.0.1:54323`) is a local dashboard — table editor, SQL
runner, auth users — same UI as hosted Supabase.

## 3. Apply the schema

Create `supabase/migrations/0001_init.sql` with the MVP data model from the
product doc:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text unique,
  email text unique,
  referral_code text unique,
  created_at timestamptz default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  origin text not null,        -- e.g. 'LAX'
  destination text not null    -- e.g. 'MAA'
);

create table votes (
  user_id uuid references users(id),
  route_id uuid references routes(id),
  preferred_month date,
  primary key (user_id, route_id)
);

create type supplier_type as enum ('group_fare', 'seat_block', 'charter');
create type campaign_status as enum
  ('draft', 'open', 'funded', 'booking', 'ticketed', 'completed', 'failed', 'refunded');

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id),
  depart_date date not null,
  return_date date,
  target_seats int not null,
  max_seats int not null,
  deadline timestamptz not null,
  supplier_type supplier_type not null default 'group_fare',
  status campaign_status not null default 'draft',
  created_at timestamptz default now()
);

create table price_tiers (
  campaign_id uuid references campaigns(id),
  seats_from int not null,
  seats_to int not null,
  price numeric not null,
  primary key (campaign_id, seats_from)
);

create type pledge_status as enum
  ('deposit_paid', 'charged', 'failed', 'refunded', 'released');

create table pledges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  campaign_id uuid references campaigns(id),
  seats int not null default 1,
  tier_price numeric not null,
  deposit_payment_id text,        -- Stripe PaymentIntent id
  stripe_customer_id text,
  status pledge_status not null default 'deposit_paid',
  created_at timestamptz default now()
);

create table passengers (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid references pledges(id),
  name_as_passport text,
  dob date,
  nationality text,
  doc_type text                  -- 'passport' | 'oci' | 'visa'
);

create table tickets (
  passenger_id uuid references passengers(id),
  pnr text,
  ticket_number text,
  pdf_url text
);

create table organizers (
  user_id uuid references users(id),
  campaign_id uuid references campaigns(id),
  commission_per_seat numeric not null default 0,
  primary key (user_id, campaign_id)
);

create type ledger_type as enum ('deposit', 'charge', 'refund', 'payout');

create table ledger (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid references pledges(id),
  type ledger_type not null,
  amount numeric not null,
  stripe_ref text,
  created_at timestamptz default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text,
  entity text,
  at timestamptz default now()
);
```

Apply it:

```bash
supabase db reset   # applies all migrations to the local DB fresh
```

## 4. Row-Level Security (RLS)

Enable RLS so a signed-in user can only see their own pledges/passengers —
critical since passenger passport data lives here.

```sql
alter table pledges enable row level security;
alter table passengers enable row level security;
alter table votes enable row level security;

create policy "users see own pledges"
  on pledges for select
  using (auth.uid() = user_id);

create policy "users manage own votes"
  on votes for all
  using (auth.uid() = user_id);

create policy "users see own passengers"
  on passengers for select
  using (
    pledge_id in (select id from pledges where user_id = auth.uid())
  );
```

The admin app talks to Supabase with the **service_role** key (bypasses RLS,
server-side only — never ship it in the iOS app or public web bundle). The
iOS app and public web app use the **anon** key plus the signed-in user's
JWT, so RLS is what actually protects the data.

## 5. Stripe test keys

Grab your test-mode keys from the Stripe dashboard
(`Developers → API keys`) and the CLI for local webhook forwarding:

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

`stripe listen` prints a webhook signing secret (`whsec_...`) — that's what
the admin app's webhook handler verifies incoming events against.

## 6. Environment variables (reference)

Both the admin web app and the iOS app read from this same set of values —
keep them in one place mentally even though each app has its own file.

| Variable | Value (local) | Used by |
|---|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` | admin, mobile |
| `SUPABASE_ANON_KEY` | from `supabase start` output | admin (client), mobile |
| `SUPABASE_SERVICE_ROLE_KEY` | from `supabase start` output | admin (server only) |
| `STRIPE_SECRET_KEY` | `sk_test_...` | admin (server only) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | mobile, public web |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from `stripe listen` | admin |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | from Twilio console | admin (edge functions) |

Next: [`admin-web-setup.md`](./admin-web-setup.md).
