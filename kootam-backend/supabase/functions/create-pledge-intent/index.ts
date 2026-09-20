// Creates a Stripe PaymentIntent for a pledge deposit, with the card saved
// (setup_future_usage: "off_session") so the balance can be charged later
// without the user present — see Documentation/backend-setup.md's payment
// flow section. Called by the iOS app via supabase.functions.invoke(...);
// never exposes the Stripe secret key to the client.
//
// Deploy: supabase functions deploy create-pledge-intent
// Secret:  supabase secrets set STRIPE_SECRET_KEY=sk_test_...

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.132.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const DEPOSIT_PER_SEAT_CENTS = 7500; // $75/seat, mid-range of the $50-100 the doc specifies

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
    }
    const user = userData.user;

    const { campaignId, seats } = await req.json();
    if (!campaignId || !seats || seats < 1) {
      return new Response(JSON.stringify({ error: "campaignId and seats are required" }), { status: 400 });
    }

    // Reuse a Stripe customer per user if one already exists (stored on a
    // prior pledge); otherwise create one.
    const { data: existingPledge } = await supabaseClient
      .from("pledges")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    const customer = existingPledge?.stripe_customer_id
      ? { id: existingPledge.stripe_customer_id }
      : await stripe.customers.create({
          email: user.email ?? undefined,
          phone: user.phone ?? undefined,
          metadata: { supabase_user_id: user.id },
        });

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-06-20" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: DEPOSIT_PER_SEAT_CENTS * seats,
      currency: "usd",
      customer: customer.id,
      setup_future_usage: "off_session",
      metadata: {
        kind: "deposit",
        campaign_id: campaignId,
        user_id: user.id,
        seats: String(seats),
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        ephemeralKeySecret: ephemeralKey.secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
