import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/calendar/$token")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { token: string } }) => {
        const supabaseUrl = process.env.VITE_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY!;
        const sb = createClient(supabaseUrl, supabaseKey);

        // Find the profile by calendar token
        const { data: profile } = await sb
          .from("profiles")
          .select("id, display_name, business_name")
          .eq("calendar_token", params.token)
          .maybeSingle();

        if (!profile) {
          return new Response("Calendar not found", { status: 404 });
        }

        // Load their shoots
        const { data: shoots } = await sb
          .from("shoots")
          .select("id, name, date, time, location, shoot_type, notes, client_name")
          .eq("user_id", profile.id)
          .not("date", "is", null)
          .order("date", { ascending: true });

        const calName = profile.business_name || profile.display_name || "Shoot Brief";

        // Build iCal
        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          `PRODID:-//Shoot Brief//EN`,
          `X-WR-CALNAME:${calName} — Shoots`,
          "X-WR-TIMEZONE:Europe/London",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
        ];

        for (const shoot of (shoots ?? [])) {
          const uid = `shoot-${shoot.id}@shootbrief.app`;
          const dateStr = (shoot.date as string).replace(/-/g, "");

          let dtStart: string;
          let dtEnd: string;

          if (shoot.time) {
            // Has a time — make a timed event
            const [h, m] = (shoot.time as string).split(":").map(Number);
            const pad = (n: number) => String(n).padStart(2, "0");
            dtStart = `${dateStr}T${pad(h)}${pad(m)}00`;
            // Default 4 hour duration
            const endH = h + 4;
            dtEnd = `${dateStr}T${pad(endH % 24)}${pad(m)}00`;
          } else {
            // All-day event
            dtStart = dateStr;
            dtEnd = dateStr;
          }

          const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

          const summary = shoot.client_name
            ? `${shoot.name} — ${shoot.client_name}`
            : shoot.name;

          const descParts = [
            shoot.shoot_type ? `Type: ${shoot.shoot_type}` : null,
            shoot.notes ? `Notes: ${shoot.notes}` : null,
          ].filter(Boolean);

          lines.push("BEGIN:VEVENT");
          lines.push(`UID:${uid}`);
          lines.push(`DTSTAMP:${now}`);

          if (shoot.time) {
            lines.push(`DTSTART;TZID=Europe/London:${dtStart}`);
            lines.push(`DTEND;TZID=Europe/London:${dtEnd}`);
          } else {
            lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
            lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
          }

          lines.push(`SUMMARY:${icalEscape(summary)}`);
          if (shoot.location) lines.push(`LOCATION:${icalEscape(shoot.location)}`);
          if (descParts.length) lines.push(`DESCRIPTION:${icalEscape(descParts.join("\\n"))}`);
          lines.push("END:VEVENT");
        }

        lines.push("END:VCALENDAR");

        const body = lines.join("\r\n") + "\r\n";

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="shootbrief.ics"`,
            "Cache-Control": "no-cache, no-store",
          },
        });
      },
    },
  },
});

function icalEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
