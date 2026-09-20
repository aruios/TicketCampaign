import { supabaseAdmin } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

const typeColor: Record<string, string> = {
  deposit: "text-jade bg-jade/12",
  charge: "text-jade bg-jade/12",
  refund: "text-vermillion bg-vermillion/12",
  payout: "text-marigold bg-marigold/15",
};

export default async function LedgerPage() {
  const { data } = await supabaseAdmin
    .from("ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex-1">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 pb-16">
        <span className="eyebrow">Reconciliation</span>
        <h1 className="mt-2 font-display font-semibold text-3xl">Ledger</h1>
        <p className="mt-1 text-ink-dim">
          Every deposit, charge, refund, and payout — written only from the Stripe webhook
          handler, never client-side.
        </p>
        <div className="mt-6 rounded-2xl bg-ground-raised shadow-[var(--card-shadow)] divide-y divide-ink/10 overflow-hidden">
          {(!data || data.length === 0) && (
            <p className="p-6 text-sm text-ink-dim">No ledger entries yet.</p>
          )}
          {data?.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 p-5 text-sm">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${typeColor[row.type] ?? "text-ink-dim bg-ink/8"}`}
              >
                {row.type}
              </span>
              <span className="num font-semibold">${row.amount}</span>
              <span className="num text-xs text-ink-dim">{row.stripe_ref}</span>
              <span className="num text-xs text-ink-dim">
                {new Date(row.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
