import { supabaseAdmin } from "@/lib/supabase/server";

// Flat CSV in the format an airline group desk expects: passenger name
// exactly as on passport, DOB, nationality.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("passengers")
    .select("name_as_passport, dob, nationality, pledges!inner(campaign_id)")
    .eq("pledges.campaign_id", id);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? [])
    .map((p) => `${p.name_as_passport ?? ""},${p.dob ?? ""},${p.nationality ?? ""}`)
    .join("\n");
  const csv = `Name,DOB,Nationality\n${rows}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="campaign-${id}-manifest.csv"`,
    },
  });
}
