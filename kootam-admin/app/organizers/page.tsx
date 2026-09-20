import { supabaseAdmin } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function OrganizersPage() {
  const { data } = await supabaseAdmin
    .from("organizers")
    .select("commission_per_seat, users(name, phone), campaigns(id, status)");

  return (
    <div className="flex-1">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 pb-16">
        <span className="eyebrow">Community leaders</span>
        <h1 className="mt-2 font-display font-semibold text-3xl">Organizers</h1>
        <p className="mt-1 text-ink-dim">
          Referral commissions, paid out of the per-seat markup — this is what motivates temples,
          Tamil Sangams, and student associations to fill flights.
        </p>
        <div className="mt-6 rounded-2xl bg-ground-raised shadow-[var(--card-shadow)] divide-y divide-ink/10 overflow-hidden">
          {(!data || data.length === 0) && (
            <p className="p-6 text-sm text-ink-dim">No organizers yet.</p>
          )}
          {data?.map((row, i) => (
            <div key={i} className="flex items-center justify-between p-5 text-sm">
              <span className="font-semibold">
                {(row.users as unknown as { name: string } | null)?.name ?? "Unknown"}
              </span>
              <span className="num text-jade font-semibold">${row.commission_per_seat}/seat</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
