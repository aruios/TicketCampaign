import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import Stripe from "stripe";

// Source of truth for payment state — never trust a client-reported
// "payment succeeded." Every ledger write and pledge status change that
// involves money should trace back to an event verified here.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const pledgeId = pi.metadata.pledge_id;
      const kind = pi.metadata.kind as "deposit" | "charge" | undefined;

      if (!pledgeId || !kind) {
        console.warn("payment_intent.succeeded missing pledge_id/kind metadata", pi.id);
        break;
      }

      await supabaseAdmin.from("ledger").insert({
        pledge_id: pledgeId,
        type: kind,
        amount: pi.amount / 100,
        stripe_ref: pi.id,
      });

      await supabaseAdmin
        .from("pledges")
        .update({ status: kind === "charge" ? "charged" : "deposit_paid" })
        .eq("id", pledgeId);
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const pledgeId = pi.metadata.pledge_id;
      if (pledgeId) {
        await supabaseAdmin
          .from("pledges")
          .update({ status: "failed" })
          .eq("id", pledgeId);
      }
      // TODO: queue a payment-link retry / 48h waitlist release per
      // Documentation/backend-setup.md's payment flow section.
      break;
    }

    default:
      break;
  }

  return new Response("ok", { status: 200 });
}
