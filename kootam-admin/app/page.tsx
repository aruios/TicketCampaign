import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

async function getFeaturedCampaign() {
  // Any campaign still moving forward (not failed/refunded/completed) — the
  // most recently created one, since that's the one worth surfacing here.
  const { data } = await supabaseAdmin
    .from("campaigns")
    .select("*, routes(origin, destination)")
    .not("status", "in", "(failed,refunded,completed)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as Campaign | null;
}

async function getPledgedSeats(campaignId: string) {
  const { data } = await supabaseAdmin
    .from("pledges")
    .select("seats")
    .eq("campaign_id", campaignId)
    .neq("status", "refunded");
  return (data ?? []).reduce((sum, p) => sum + p.seats, 0);
}

export default async function Home() {
  const campaign = await getFeaturedCampaign();
  const pledged = campaign ? await getPledgedSeats(campaign.id) : 0;
  const pct = campaign ? Math.min(100, Math.round((pledged / campaign.target_seats) * 100)) : 0;

  return (
    <div className="flex-1">
      <div className="kolam-band" />
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-20">
        {/* Hero */}
        <section className="grid gap-10 py-8">
          <div>
            <span className="eyebrow">Phase 1 · Group-fare pooling</span>
            <h1 className="mt-2 font-display font-semibold text-4xl sm:text-5xl leading-[1.04]">
              Go home for the <em className="italic text-marigold">crowded</em> season — without
              paying crowded-season prices.
            </h1>
            <p className="mt-4 max-w-[46ch] text-ink-dim text-lg">
              Diwali. Christmas. Pongal. The weeks everyone flies to India are the weeks fares
              triple. Kootam pools a community&rsquo;s seats into one group booking, so the
              airline gives the group rate instead.
            </p>
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link
                href="/campaigns"
                className="rounded-full bg-marigold text-marigold-ink font-bold text-sm px-5 py-3 shadow-[0_10px_24px_-10px_rgba(201,122,10,0.5)] hover:shadow-[0_14px_28px_-10px_rgba(201,122,10,0.6)] transition-shadow"
              >
                View all campaigns
              </Link>
              <Link
                href="/organizers"
                className="rounded-full border-[1.5px] border-ink/25 text-sm font-bold px-5 py-3 hover:border-ink transition-colors"
              >
                Organizer dashboard
              </Link>
            </div>
          </div>

          {/* Featured campaign — boarding pass */}
          {campaign ? (
            <div className="rounded-[22px] bg-ground-raised shadow-[var(--card-shadow)] border border-ink/10 overflow-hidden">
              <div className="p-7 grid gap-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div>
                    <div className="font-display font-bold text-4xl">{campaign.routes?.origin}</div>
                  </div>
                  <div className="text-ink-dim text-lg">✈</div>
                  <div className="text-right">
                    <div className="font-display font-bold text-4xl">
                      {campaign.routes?.destination}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 border-t border-dashed border-ink/20">
                  <div>
                    <span className="eyebrow block mb-1">Depart</span>
                    <div className="num font-semibold">{campaign.depart_date}</div>
                  </div>
                  <div>
                    <span className="eyebrow block mb-1">Return</span>
                    <div className="num font-semibold">{campaign.return_date ?? "—"}</div>
                  </div>
                  <div>
                    <span className="eyebrow block mb-1">Deadline</span>
                    <div className="num font-semibold">
                      {new Date(campaign.deadline).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="eyebrow block mb-1">Status</span>
                    <div
                      className={`font-semibold capitalize ${
                        campaign.status === "open" || campaign.status === "ticketed"
                          ? "text-jade"
                          : "text-marigold"
                      }`}
                    >
                      {campaign.status}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      <span className="num font-semibold">{pledged}</span> of{" "}
                      <span className="num font-semibold">{campaign.target_seats}</span> seats
                      pledged
                    </span>
                    <span className="num font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-ground-sunken overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-jade to-marigold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="relative border-t-2 border-dashed border-ink/20">
                <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-ground" />
                <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-ground" />
              </div>

              <div className="px-7 py-4 bg-ground-sunken flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm text-ink-dim">Most recently opened campaign</span>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="text-sm font-bold text-marigold hover:underline"
                >
                  Open in admin →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] bg-ground-raised shadow-[var(--card-shadow)] border border-ink/10 p-10 text-center text-ink-dim">
              No open campaigns yet. Create one from{" "}
              <Link href="/campaigns" className="text-marigold font-semibold hover:underline">
                Campaigns
              </Link>
              .
            </div>
          )}
        </section>

        {/* Mission / Vision */}
        <section className="py-8">
          <div className="grid sm:grid-cols-2 rounded-[22px] overflow-hidden shadow-[var(--card-shadow)]">
            <div className="relative bg-ground-raised p-8">
              <div
                className="absolute left-0 top-0 bottom-0 w-px opacity-70"
                style={{
                  background:
                    "repeating-linear-gradient(180deg, var(--gold-line) 0 6px, transparent 6px 12px)",
                }}
              />
              <span className="eyebrow">Mission</span>
              <h3 className="mt-2 font-display font-semibold text-2xl">
                Turn a hundred solo bookings into one group fare.
              </h3>
              <p className="mt-3 max-w-[42ch] text-ink-dim">
                Every diaspora family flying home for the same festival is, to the airline, a
                hundred strangers paying peak price alone. Kootam pools that demand into a single
                group booking of 10 to 50 seats and passes the group rate back to everyone who
                pledged.
              </p>
            </div>
            <div className="p-8 bg-ink text-ground">
              <span className="eyebrow text-marigold">Vision</span>
              <h3 className="mt-2 font-display font-semibold text-2xl">
                Nobody skips Pongal because of the airfare.
              </h3>
              <p className="mt-3 max-w-[42ch] opacity-85">
                We want a Tamil Sangam, a temple, or a student association in any city to see
                enough neighbors want the same dates, and unlock a fare that makes going home for
                the festival an easy yes.
              </p>
            </div>
          </div>
        </section>

        {/* Admin quick links */}
        <section className="py-8">
          <span className="eyebrow">Internal tools</span>
          <div className="mt-3 grid sm:grid-cols-3 gap-4">
            {[
              { href: "/campaigns", title: "Campaigns", desc: "Create, track, and advance campaigns through their lifecycle." },
              { href: "/ledger", title: "Ledger", desc: "Payment reconciliation — deposits, charges, refunds, payouts." },
              { href: "/organizers", title: "Organizers", desc: "Referral commissions and payouts." },
            ].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-2xl bg-ground-raised shadow-[var(--card-shadow)] p-5 hover:-translate-y-0.5 transition-transform"
              >
                <div className="font-display font-semibold text-lg">{s.title}</div>
                <div className="mt-1 text-sm text-ink-dim">{s.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <div className="kolam-band" />
    </div>
  );
}
