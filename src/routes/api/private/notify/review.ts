import { createFileRoute } from "@tanstack/react-router";
import { sendEmail, reviewSubmittedEmail } from "@/lib/email.server";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/private/notify/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY!;
        const sb = createClient(supabaseUrl, supabaseKey);

        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }

        const { review_id } = body;
        if (!review_id) return new Response("Missing review_id", { status: 400 });

        const { data: review } = await sb
          .from("reviews")
          .select("*, shoots(name), profiles!reviews_photographer_id_fkey(display_name, business_name, email)")
          .eq("id", review_id)
          .maybeSingle();

        if (!review) return new Response("Not found", { status: 404 });

        const photographer = (review as any).profiles;
        const photographerEmail = photographer?.email;
        if (!photographerEmail) return new Response("No photographer email", { status: 400 });

        await sendEmail(reviewSubmittedEmail({
          photographerEmail,
          photographerName: photographer?.business_name || photographer?.display_name || "there",
          clientName: review.client_name,
          rating: review.rating,
          body: review.body,
          shootName: (review as any).shoots?.name ?? "your shoot",
          dashboardUrl: "https://shootbrief.app/reviews",
        }));

        return new Response("ok", { status: 200 });
      },
    },
  },
});
