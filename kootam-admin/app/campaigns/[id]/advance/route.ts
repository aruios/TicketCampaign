import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { NEXT_STATUS, type CampaignStatus } from "@/lib/types";

// Manually advances a campaign one step through the lifecycle
// (draft -> open -> funded -> booking -> ticketed -> completed).
// This is the "move it by hand" action for the local dry run in
// ../../../../../Documentation/running-a-campaign.md. In production, the
// open -> funded transition is driven by the deadline-checker cron job
// instead, and open -> failed is a separate branch this endpoint doesn't
// handle.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from("campaigns")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const next = NEXT_STATUS[campaign.status as CampaignStatus];
  if (!next) {
    return NextResponse.json(
      { error: `No forward transition from '${campaign.status}'` },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("campaigns")
    .update({ status: next })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("audit_log").insert({
    action: `campaign.advance:${campaign.status}->${next}`,
    entity: `campaigns/${id}`,
  });

  return NextResponse.json({ status: next });
}
