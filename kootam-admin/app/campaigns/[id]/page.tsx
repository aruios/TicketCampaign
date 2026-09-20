import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/types";
import { NEXT_STATUS } from "@/lib/types";
import AdvanceButton from "./advance-button";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

async function getCampaign(id: string) {
  const { data } = await supabaseAdmin
    .from("campaigns")
    .select("*, routes(origin, destination)")
    .eq("id", id)
    .single();
  return data as unknown as Campaign | null;
}

async function getPledges(campaignId: string) {
  const { data } = await supabaseAdmin
    .from("pledges")
    .select("id, seats, tier_price, status, users(name, phone)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

const statusColor: Record<string, string> = {
  deposit_paid: "text-jade bg-jade/12",
  charged: "text-jade bg-jade/12",
  failed: "text-vermillion bg-vermillion/12",
  refunded: "text-vermillion bg-vermillion/12",
  released: "text-ink-dim bg-ink/8",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const pledges = await getPledges(id);
  const seats = pledges
    .filter((p) => p.status !== "refunded")
    .reduce((sum, p) => sum + p.seats, 0);
  const pct = Math.min(100, Math.round((seats / campaign.target_seats) * 100));
  const next = NEXT_STATUS[campaign.status];

  return (
    <div className="flex-1">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <span className="eyebrow">Campaign</span>
        <h1 className="mt-2 font-display font-semibold text-3xl">
          {campaign.routes?.origin} → {campaign.routes?.destination}
        </h1>
        <p className="mt-1 text-ink-dim">
          {campaign.depart_date}
          {campaign.return_date ? ` – ${campaign.return_date}` : ""} · deadline{" "}
          {new Date(campaign.deadline).toLocaleString()}
        </p>

        <div className="mt-6 rounded-2xl bg-ground-raised shadow-[var(--card-shadow)] p-6">
          <div className="flex items-center justify-between text-sm">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusColor[campaign.status] ?? "text-jade bg-jade/12"}`}
            >
              {campaign.status}
            </span>
            <span className="num">
              {seats}/{campaign.target_seats} seats (max {campaign.max_seats})
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ground-sunken">
            <div
              className="h-full rounded-full bg-gradient-to-r from-jade to-marigold"
              style={{ width: `${pct}%` }}
            />
          </div>
          {next && <AdvanceButton campaignId={id} nextStatus={next} />}
        </div>

        <div className="mt-5 flex gap-3 text-sm">
          <a
            className="rounded-full border-[1.5px] border-ink/20 px-4 py-2 font-semibold hover:border-marigold hover:text-marigold transition-colors"
            href={`/campaigns/${id}/manifest`}
          >
            Export manifest CSV
          </a>
        </div>

        <h2 className="mt-10 font-display font-semibold text-xl">Pledges</h2>
        <div className="mt-3 rounded-2xl bg-ground-raised shadow-[var(--card-shadow)] divide-y divide-ink/10 overflow-hidden">
          {pledges.length === 0 && <p className="p-5 text-sm text-ink-dim">No pledges yet.</p>}
          {pledges.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-5 text-sm">
              <span>
                {(p.users as unknown as { name: string } | null)?.name ?? "Unknown"} · {p.seats}{" "}
                seat
                {p.seats > 1 ? "s" : ""} @ <span className="num">${p.tier_price}</span>
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusColor[p.status] ?? "text-ink-dim bg-ink/8"}`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
