export type CampaignStatus =
  | "draft"
  | "open"
  | "funded"
  | "booking"
  | "ticketed"
  | "completed"
  | "failed"
  | "refunded";

export type Campaign = {
  id: string;
  route_id: string;
  depart_date: string;
  return_date: string | null;
  target_seats: number;
  max_seats: number;
  deadline: string;
  supplier_type: "group_fare" | "seat_block" | "charter";
  status: CampaignStatus;
  created_at: string;
  routes: { origin: string; destination: string } | null;
};

// Valid forward transitions for the "advance" action — mirrors the lifecycle
// documented in ../../Documentation/README.md. Failure (`open -> failed`) is
// handled separately by the deadline-checker job, not this manual button.
export const NEXT_STATUS: Partial<Record<CampaignStatus, CampaignStatus>> = {
  draft: "open",
  open: "funded",
  funded: "booking",
  booking: "ticketed",
  ticketed: "completed",
};
