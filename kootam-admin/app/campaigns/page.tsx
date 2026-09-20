import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";

// Live pledge/campaign data — never prerender this at build time.
export const dynamic = "force-dynamic";

async function getCampaigns() {
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("*, routes(origin, destination)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Campaign[];
}

async function getPledgedSeats(campaignId: string) {
  const { data } = await supabaseAdmin
    .from("pledges")
    .select("seats")
    .eq("campaign_id", campaignId)
    .neq("status", "refunded");
  return (data ?? []).reduce((sum, p) => sum + p.seats, 0);
}

const statusColor: Record<string, string> = {
  draft: "text-ink-dim bg-ink/8",
  open: "text-jade bg-jade/12",
  funded: "text-marigold bg-marigold/15",
  booking: "text-marigold bg-marigold/15",
  ticketed: "text-jade bg-jade/12",
  completed: "text-jade bg-jade/12",
  failed: "text-vermillion bg-vermillion/12",
  refunded: "text-vermillion bg-vermillion/12",
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  const pledgedByCampaign = await Promise.all(
    campaigns.map(async (c) => [c.id, await getPledgedSeats(c.id)] as const)
  );
  const pledged = Object.fromEntries(pledgedByCampaign);

  return (
    <div className="flex-1">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 pb-16">
        <span className="eyebrow">All campaigns</span>
        <h1 className="mt-2 font-display font-semibold text-3xl">Campaigns</h1>
        <p className="mt-1 text-ink-dim">
          Route voting, pledge progress, and lifecycle status for every campaign.
        </p>

        <div className="mt-6 rounded-2xl bg-ground-raised shadow-[var(--card-shadow)] divide-y divide-ink/10 overflow-hidden">
          {campaigns.length === 0 && (
            <p className="p-6 text-sm text-ink-dim">
              No campaigns yet. Seed one via{" "}
              <code className="num">kootam-backend/supabase/seed.sql</code> or insert a row in
              Supabase Studio.
            </p>
          )}
          {campaigns.map((c) => {
            const seats = pledged[c.id] ?? 0;
            const pct = Math.min(100, Math.round((seats / c.target_seats) * 100));
            return (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-ground-sunken transition-colors"
              >
                <div>
                  <div className="font-display font-semibold text-lg">
                    {c.routes?.origin} → {c.routes?.destination}
                  </div>
                  <div className="text-xs text-ink-dim mt-1">
                    {c.depart_date}
                    {c.return_date ? ` – ${c.return_date}` : ""} · deadline{" "}
                    {new Date(c.deadline).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ground-sunken">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-jade to-marigold"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-ink-dim num">
                      {seats}/{c.target_seats} seats
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusColor[c.status] ?? "text-ink-dim bg-ink/8"}`}
                  >
                    {c.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
