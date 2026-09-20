-- Kootam MVP schema
-- See ../../Documentation/backend-setup.md for context.

create extension if not exists pgcrypto;

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
  user_id uuid references users(id) on delete cascade,
  route_id uuid references routes(id) on delete cascade,
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
  campaign_id uuid references campaigns(id) on delete cascade,
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
  pledge_id uuid references pledges(id) on delete cascade,
  name_as_passport text,
  dob date,
  nationality text,
  doc_type text                  -- 'passport' | 'oci' | 'visa'
);

create table tickets (
  passenger_id uuid references passengers(id) on delete cascade,
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

-- Row-Level Security -----------------------------------------------------
-- Admin app uses the service_role key (bypasses RLS). Mobile/public web use
-- the anon key + a signed-in user's JWT, so these policies are what actually
-- protect passenger/pledge data on those clients.

alter table votes enable row level security;
alter table pledges enable row level security;
alter table passengers enable row level security;

create policy "users manage own votes"
  on votes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users see own pledges"
  on pledges for select
  using (auth.uid() = user_id);

create policy "users create own pledges"
  on pledges for insert
  with check (auth.uid() = user_id);

create policy "users see own passengers"
  on passengers for select
  using (
    pledge_id in (select id from pledges where user_id = auth.uid())
  );

create policy "users manage own passengers"
  on passengers for insert
  with check (
    pledge_id in (select id from pledges where user_id = auth.uid())
  );
