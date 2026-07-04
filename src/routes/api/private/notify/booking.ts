import { createFileRoute } from "@tanstack/react-router";
import { sendEmail, bookingRequestEmail, bookingConfirmationEmail, bookingAcceptedEmail } from "@/lib/email.server";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/private/notify/booking")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY!;
        const sb = createClient(supabaseUrl, supabaseKey);

        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }

        const { action, booking_request_id } = body;
        if (!booking_request_id || !action) return new Response("Missing fields", { status: 400 });

        // Load the booking request
        const { data: booking } = await sb
          .from("booking_requests")
          .select("*, profiles!booking_requests_photographer_id_fkey(display_name, business_name, email, phone, website)")
          .eq("id", booking_request_id)
          .maybeSingle();

        if (!booking) return new Response("Not found", { status: 404 });

        const photographer = (booking as any).profiles;
        const photographerName = photographer?.business_name || photographer?.display_name || "Your photographer";
        const photographerEmail = photographer?.email;

        if (action === "new") {
          // Email to photographer: new booking request
          if (photographerEmail) {
            await sendEmail(bookingRequestEmail({
              photographerEmail,
              photographerName,
              clientName: booking.client_name,
              clientEmail: booking.client_email,
              clientPhone: booking.client_phone,
              shootType: booking.shoot_type,
              preferredDate: booking.preferred_date,
              budget: booking.budget,
              location: booking.location,
              message: booking.message,
              dashboardUrl: "https://shootbrief.app/bookings",
            }));
          }

          // Confirmation email to client
          await sendEmail(bookingConfirmationEmail({
            clientEmail: booking.client_email,
            clientName: booking.client_name,
            photographerName,
            photographerEmail: photographerEmail ?? "",
            shootType: booking.shoot_type,
            preferredDate: booking.preferred_date,
          }));
        }

        if (action === "accepted") {
          // Try to find a shoot linked to this client to get portal URL
          const { data: shoot } = await sb
            .from("shoots")
            .select("client_token")
            .eq("user_id", booking.photographer_id)
            .eq("client_name", booking.client_name)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const portalUrl = shoot?.client_token
            ? `https://shootbrief.app/client/${shoot.client_token}`
            : null;

          await sendEmail(bookingAcceptedEmail({
            clientEmail: booking.client_email,
            clientName: booking.client_name,
            photographerName,
            photographerEmail: photographerEmail ?? "",
            shootType: booking.shoot_type,
            preferredDate: booking.preferred_date,
            portalUrl,
          }));
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
