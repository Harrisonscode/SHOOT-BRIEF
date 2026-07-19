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
  return host ? `${proto}://${host}` : "https://shootbrief.app";
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { plan?: "pro" | "studio" }) => data)
  .handler(async ({ context, data }) => {
    const plan = data?.plan ?? "pro";

    const priceId = plan === "studio"
      ? process.env.STRIPE_STUDIO_PRICE_ID
      : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) throw new Error(`Price ID for ${plan} plan is not configured. Add ${plan === "studio" ? "STRIPE_STUDIO_PRICE_ID" : "STRIPE_PRO_PRICE_ID"} to environment variables.`);

    const stripe = getStripe();
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;

    const { data: profile } = await (supabase.from("profiles") as any)
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .maybeSingle() as any;

    let customerId = (profile as any)?.stripe_customer_id ?? null;
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
      metadata: { user_id: userId, plan },
      subscription_data: { metadata: { user_id: userId, plan } },
      success_url: `${origin}/welcome-pro?plan=${plan}`,
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

    const { data: profile } = await (supabase.from("profiles") as any)
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle() as any;

    let customerId = (profile as any)?.stripe_customer_id ?? null;
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

export const createInvoicePaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { invoice_id: string; amount: number; currency: string; description: string }) => data)
  .handler(async ({ context, data }) => {
    const stripe = getStripe();
    const { supabase, userId } = context;

    // Verify invoice belongs to this user
    const { data: invoice } = await (supabase.from("invoices") as any)
      .select("id, total, currency, invoice_number, shoots(client_name, client_email)")
      .eq("id", data.invoice_id)
      .eq("user_id", userId)
      .maybeSingle() as any;

    if (!invoice) throw new Error("Invoice not found");

    const amountPence = Math.round(data.amount * 100);

    // Create a Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: data.currency.toLowerCase(),
          product_data: { name: data.description },
          unit_amount: amountPence,
        },
        quantity: 1,
      },],
      metadata: { invoice_id: data.invoice_id, user_id: userId },
      after_completion: {
        type: "redirect",
        redirect: { url: `https://shootbrief.app/invoice/${invoice.client_token}?paid=1` },
      },
    });

    // Update invoice with payment link URL
    await (supabase.from("invoices") as any)
      .update({ payment_link_enabled: true, payment_link_url: paymentLink.url } as any)
      .eq("id", data.invoice_id);

    return { url: paymentLink.url };
  });
