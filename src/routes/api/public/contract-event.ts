import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";

export const Route = createFileRoute("/api/public/contract-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }

        const { contract_id, event_type, metadata } = body;
        if (!contract_id || !event_type) return new Response("Missing fields", { status: 400 });

        // Get real IP from server headers (not spoofable from client)
        const ip =
          getRequestHeader("x-real-ip") ??
          getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
          getRequestHeader("cf-connecting-ip") ??
          "unknown";

        const userAgent = getRequestHeader("user-agent") ?? "unknown";

        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY!;
        const sb = createClient(supabaseUrl, supabaseKey);

        const { error } = await sb.from("contract_events").insert({
          contract_id,
          event_type,
          ip_address: ip,
          user_agent: userAgent,
          metadata: metadata ?? null,
        });

        if (error) {
          console.error("[contract-event]", error);
          return new Response("Error", { status: 500 });
        }

        // If signing event, also update the contracts table with IP + user agent
        if (event_type === "signed" && metadata?.signed_name) {
          await sb.from("contracts").update({
            status: "signed",
            signed_at: new Date().toISOString(),
            signed_name: metadata.signed_name,
            signed_ip: ip,
            signed_user_agent: userAgent,
          }).eq("id", contract_id).eq("client_token", body.client_token ?? "");
        }

        if (event_type === "viewed") {
          await sb.from("contracts").update({
            viewed_at: new Date().toISOString(),
          }).eq("id", contract_id).is("viewed_at", null);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
