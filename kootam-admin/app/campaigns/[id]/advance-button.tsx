"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignStatus } from "@/lib/types";

export default function AdvanceButton({
  campaignId,
  nextStatus,
}: {
  campaignId: string;
  nextStatus: CampaignStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch(`/campaigns/${campaignId}/advance`, { method: "POST" });
        setLoading(false);
        router.refresh();
      }}
      className="mt-4 rounded-full bg-marigold px-4 py-2 text-sm font-bold text-marigold-ink disabled:opacity-50 shadow-[0_10px_24px_-10px_rgba(201,122,10,0.5)]"
    >
      {loading ? "Moving…" : `Move to "${nextStatus}"`}
    </button>
  );
}
