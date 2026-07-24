import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!signature || !secret || !stripeKey) {
          return new Response("Webhook not configured", { status: 500 });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);

        const rawBody = await request.text();
        let event: any;
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature, secret);
        } catch (err: any) {
          console.error("[stripe-webhook] signature verification failed", err?.message);
          return new Response(`Invalid signature: ${err?.message ?? "unknown"}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const setPlan = async (userId: string, plan: string | null, customerId?: string | null) => {
          const isPro = plan === "pro" || plan === "studio";
          const isStudio = plan === "studio";
          const patch: any = { is_pro: isPro, is_studio: isStudio, stripe_plan: plan };
          if (customerId) patch.stripe_customer_id = customerId;
          const { error } = await (supabaseAdmin.from("profiles") as any).update(patch).eq("id", userId);
          if (error) console.error("[stripe-webhook] profile update failed", error);
        };

        // Keep legacy setPro for backwards compat
        const setPro = async (userId: string, isPro: boolean, customerId?: string | null) => {
          await setPlan(userId, isPro ? "pro" : null, customerId);
        };

        const resolveUserIdFromCustomer = async (customerId: string): Promise<string | null> => {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle() as any;
          if (data?.id) return data.id;
          // Fallback: look up the customer's email and match a profile.
          try {
            const customer = await stripe.customers.retrieve(customerId);
            const email = (customer as any)?.email as string | undefined;
            if (!email) return null;
            const { data: byEmail } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("email", email)
              .maybeSingle() as any;
            return byEmail?.id ?? null;
          } catch {
            return null;
          }
        };

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as any;

              // ── Invoice payment link payment ──────────────────────────────
              // When a client pays an invoice via a Stripe payment link,
              // the session metadata contains the invoice_id we stored when creating the link
              if (session.metadata?.invoice_id) {
                const invoiceId = session.metadata.invoice_id;
                const { error } = await (supabaseAdmin.from("invoices") as any)
                  .update({ status: "paid", paid_at: new Date().toISOString() } as any)
                  .eq("id", invoiceId);
                if (error) console.error("[stripe-webhook] invoice update failed", error);
                else console.log("[stripe-webhook] invoice marked as paid:", invoiceId);
                break;
              }

              // ── Subscription upgrade ──────────────────────────────────────
              const userId =
                session.client_reference_id ??
                session.metadata?.user_id ??
                (session.customer ? await resolveUserIdFromCustomer(session.customer) : null);
              const plan = session.metadata?.plan ?? "pro";
              if (userId) {
                await setPlan(userId, plan, session.customer ?? null);
                try {
                  const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("email, display_name")
                    .eq("id", userId)
                    .maybeSingle() as any;
                  if (profile?.email) {
                    const { sendEmail, proUpgradeEmail } = await import("@/lib/email.server");
                    await sendEmail(proUpgradeEmail({ userEmail: profile.email, userName: profile.display_name, plan }));
                  }
                } catch (e) {
                  console.error("[stripe-webhook] upgrade email failed", e);
                }
              }
              break;
            }

            // ── Payment intent succeeded (covers payment link payments) ────
            case "payment_intent.succeeded": {
              const pi = event.data.object as any;
              const invoiceId = pi.metadata?.invoice_id;
              if (invoiceId) {
                const { error } = await (supabaseAdmin.from("invoices") as any)
                  .update({ status: "paid", paid_at: new Date().toISOString() } as any)
                  .eq("id", invoiceId);
                if (error) console.error("[stripe-webhook] invoice update failed", error);
                else console.log("[stripe-webhook] invoice marked as paid via payment_intent:", invoiceId);
              }
              break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as any;
              const userId = sub.metadata?.user_id ?? (sub.customer ? await resolveUserIdFromCustomer(sub.customer) : null);
              if (userId) {
                const active = ["active", "trialing", "past_due"].includes(sub.status);
                const plan = active ? (sub.metadata?.plan ?? "pro") : null;
                await setPlan(userId, plan, sub.customer ?? null);
              }
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object as any;
              const userId = sub.metadata?.user_id ?? (sub.customer ? await resolveUserIdFromCustomer(sub.customer) : null);
              if (userId) await setPlan(userId, null, sub.customer ?? null);
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
