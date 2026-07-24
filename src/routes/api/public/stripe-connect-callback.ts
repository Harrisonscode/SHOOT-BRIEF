import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/stripe-connect-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // this is the user_id we passed
        const error = url.searchParams.get("error");

        if (error) {
          console.error("[stripe-connect] OAuth error:", error, url.searchParams.get("error_description"));
          return Response.redirect("https://shootbrief.app/settings?connect=error");
        }

        if (!code || !state) {
          return Response.redirect("https://shootbrief.app/settings?connect=error");
        }

        try {
          // Exchange code for access token
          const stripeKey = process.env.STRIPE_SECRET_KEY!;
          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(stripeKey);

          const response = await stripe.oauth.token({
            grant_type: "authorization_code",
            code,
          });

          const connectedAccountId = response.stripe_user_id;
          if (!connectedAccountId) throw new Error("No account ID returned");

          // Save to profile
          const supabaseUrl = process.env.VITE_SUPABASE_URL!;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
          const sb = createClient(supabaseUrl, supabaseKey);

          const { error: dbError } = await sb.from("profiles").update({
            stripe_connect_account_id: connectedAccountId,
            stripe_connect_enabled: true,
          }).eq("id", state);

          if (dbError) {
            console.error("[stripe-connect] DB error:", dbError);
            return Response.redirect("https://shootbrief.app/settings?connect=error");
          }

          return Response.redirect("https://shootbrief.app/settings?connect=success");
        } catch (err) {
          console.error("[stripe-connect] callback error:", err);
          return Response.redirect("https://shootbrief.app/settings?connect=error");
        }
      },
    },
  },
});
