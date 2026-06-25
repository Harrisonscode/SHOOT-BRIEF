import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

function getOrigin() {
  const origin = getRequestHeader("origin");
  if (origin) return origin;
  const host = getRequestHeader("host");
  const proto = getRequestHeader("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://shootbriefplanner.vercel.app";
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) throw new Error("STRIPE_PRO_PRICE_ID is not configured");

    const stripe = getStripe();
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;

    // Find or reuse customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) customerId = existing.data[0].id;
    }

    const origin = getOrigin();
    const session = await stripe.checkout.sessions.create({
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : email,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } },
      success_url: `${origin}/welcome-pro`,
      cancel_url: `${origin}/billing`,
      allow_promotion_codes: true,
    });

    return { url: session.url as string };
  });

export const createCustomerPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = getStripe();
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) customerId = existing.data[0].id;
    }
    if (!customerId) throw new Error("No Stripe customer found for this account");

    const origin = getOrigin();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });
    return { url: portal.url as string };
  });
