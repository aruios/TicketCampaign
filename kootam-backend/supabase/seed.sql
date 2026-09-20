-- Local-only test data, applied automatically by `supabase db reset`.
-- See ../../Documentation/running-a-campaign.md for the full walkthrough
-- this seed data supports.

insert into routes (origin, destination) values ('LAX', 'MAA');

insert into campaigns (route_id, depart_date, return_date, target_seats, max_seats, deadline, status)
select id, '2026-12-18', '2027-01-10', 10, 15, now() + interval '14 days', 'open'
from routes where origin = 'LAX' and destination = 'MAA';

insert into price_tiers (campaign_id, seats_from, seats_to, price)
select id, 1, 10, 650
from campaigns
order by created_at desc
limit 1;
