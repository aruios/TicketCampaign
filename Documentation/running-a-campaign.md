# Running a Test Campaign End-to-End (local)

A manual walkthrough that exercises admin + backend + mobile together, once
`backend-setup.md`, `admin-web-setup.md`, and `mobile-app-setup.md` are all
done. This mirrors the "do it manually first, then automate" rule from the
product doc — running this locally is the dry run for the real Weeks 7–10
manual campaign.

Have three things running at once:

```bash
supabase start                                            # backend
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # webhooks
cd kootam-admin && npm run dev                             # admin app
```

...plus the iOS app running in a simulator, signed in as a test user.

## 1. Seed a route

In admin (or directly in Supabase Studio's table editor):

```sql
insert into routes (origin, destination) values ('LAX', 'MAA');
```

## 2. Create a campaign (`draft` → `open`)

In the admin app's campaign creation form, or directly:

```sql
insert into campaigns (route_id, depart_date, return_date, target_seats, max_seats, deadline, status)
select id, '2026-12-18', '2027-01-10', 10, 15, now() + interval '14 days', 'open'
from routes where origin = 'LAX' and destination = 'MAA';

insert into price_tiers (campaign_id, seats_from, seats_to, price)
select id, 1, 10, 650 from campaigns order by created_at desc limit 1;
```

`target_seats: 10` and a 14-day deadline keeps this test campaign fast to
fill and fast to expire — don't mirror real-world numbers here.

## 3. Pledge from the iOS app

- Sign in (phone OTP or Sign in with Apple, against local Supabase Auth)
- Explore → open the LAX→MAA campaign → Pledge
- Confirm the SetupIntent with Stripe's test card `4242 4242 4242 4242`
- Confirm the deposit shows up: `select * from ledger;` in Studio, and the
  Stripe CLI terminal should log the forwarded webhook event

Repeat with a few different test users (delete and recreate the simulator's
signed-in session, or use `stripe listen` + manually inserted pledges) until
`target_seats` is met.

## 4. Move the campaign to `funded`

This is the moment the deadline-checker cron job would normally trigger.
Locally, trigger it by hand from the admin app's "advance status" action, or:

```sql
update campaigns set status = 'funded' where id = '<campaign id>';
```

This is where the admin backend should charge each pledge's balance
off-session (the deposit was already collected; charge `tier_price -
deposit`) and write a `charge` row to `ledger` per successful payment.
Verify with `stripe trigger payment_intent.succeeded` if you haven't built
the real off-session charge call yet.

## 5. Collect passenger details

Once `funded`, the iOS app's Passenger Details screen should unlock (gate it
on `campaign.status == .funded` client-side, but confirm it server-side via
RLS too — a client-side-only gate is not security). Enter a test
passport-exact name, DOB, nationality.

## 6. Move to `booking` → `ticketed`

```sql
update campaigns set status = 'booking' where id = '<campaign id>';
```

In admin, export the manifest CSV (`/campaigns/<id>/manifest`) — confirm the
column format matches what you'd hand an airline group desk. Then use the
Ticket Upload screen to enter a fake PNR/ticket number per passenger:

```sql
insert into tickets (passenger_id, pnr, ticket_number)
values ('<passenger id>', 'ABC123', 'TESTTICKET001');

update campaigns set status = 'ticketed' where id = '<campaign id>';
```

Confirm this triggers a (locally logged, not actually sent) passenger
notification — wire the real push/SMS send later.

## 7. Test the failure path separately

Create a second campaign with a deadline a few minutes out and target_seats
higher than you're willing to pledge. Let the deadline pass (or set
`deadline` to a past timestamp), run the deadline-checker logic by hand:

```sql
update campaigns set status = 'failed' where id = '<campaign id>' and status = 'open';
```

Then confirm refunds get issued — every `deposit`-type ledger row for that
campaign's pledges should get a matching `refund` row, and pledge `status`
should move to `refunded`. This path is what makes pledging genuinely
no-risk for users, so it's worth testing as deliberately as the happy path.

## 8. What "done" looks like for this dry run

- A campaign can go `open → funded → booking → ticketed` with real (test)
  Stripe charges recorded in `ledger` at each money-moving step
- A campaign can go `open → failed → refunded` with refunds recorded
- The manifest CSV export has the right columns for an airline group desk
- The iOS app reflects campaign/pledge status changes without needing a
  rebuild (i.e., it's reading live state, not hardcoded)
- RLS actually blocks a second test user from seeing the first user's
  passenger data — check this by querying `passengers` as the wrong user's
  JWT, not just by trusting the app's UI to hide it

Once this works locally with fake data, the same sequence — minus the SQL
shortcuts — is exactly what you'd run manually on WhatsApp/spreadsheets for
the real Weeks 7–10 first campaign described in the product doc, before
building out the app further.
