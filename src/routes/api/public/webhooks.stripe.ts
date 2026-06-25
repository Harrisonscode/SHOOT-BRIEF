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

        const setPro = async (userId: string, isPro: boolean, customerId?: string | null) => {
          const patch: { is_pro: boolean; stripe_customer_id?: string } = { is_pro: isPro };
          if (customerId) patch.stripe_customer_id = customerId;
          const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
          if (error) console.error("[stripe-webhook] profile update failed", error);
        };

        const resolveUserIdFromCustomer = async (customerId: string): Promise<string | null> => {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
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
              .maybeSingle();
            return byEmail?.id ?? null;
          } catch {
            return null;
          }
        };

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as any;
              const userId =
                session.client_reference_id ??
                session.metadata?.user_id ??
                (session.customer ? await resolveUserIdFromCustomer(session.customer) : null);
              if (userId) await setPro(userId, true, session.customer ?? null);
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as any;
              const userId =
                sub.metadata?.user_id ??
                (sub.customer ? await resolveUserIdFromCustomer(sub.customer) : null);
              if (userId) {
                const active = ["active", "trialing", "past_due"].includes(sub.status);
                await setPro(userId, active, sub.customer ?? null);
              }
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object as any;
              const userId =
                sub.metadata?.user_id ??
                (sub.customer ? await resolveUserIdFromCustomer(sub.customer) : null);
              if (userId) await setPro(userId, false, sub.customer ?? null);
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
