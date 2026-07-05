import { createFileRoute } from "@tanstack/react-router";
import { sendEmail } from "@/lib/email.server";

export const Route = createFileRoute("/api/auth/send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Bad request" }), {
            status: 200, // Supabase requires 200 even for errors
            headers: { "Content-Type": "application/json" },
          });
        }

        // Supabase hook payload:
        // {
        //   user: { email, user_metadata, ... },
        //   email_data: {
        //     token: string,           // OTP
        //     token_hash: string,      // hashed token
        //     redirect_to: string,     // where to go after verification
        //     email_action_type: string, // signup | recovery | magiclink | email_change
        //     site_url: string,        // your Supabase project URL e.g. https://xxx.supabase.co
        //   }
        // }
        const user = body?.user;
        const emailData = body?.email_data;

        if (!user?.email || !emailData) {
          console.error("[send-email hook] missing user or email_data", JSON.stringify(body));
          return new Response(JSON.stringify({ error: "Missing data" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const {
          email_action_type,
          token_hash,
          redirect_to,
          site_url,
          token,
        } = emailData;

        // The verification URL must point to the Supabase project's auth endpoint
        // site_url is the Supabase project URL e.g. https://abc123.supabase.co
        const supabaseUrl = site_url || process.env.VITE_SUPABASE_URL || "";
        const appUrl = "https://shootbrief.app";
        const finalRedirect = redirect_to || appUrl;

        // Construct the correct Supabase verification URL
        const actionUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(finalRedirect)}`;

        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          null;
        const firstName = displayName ? displayName.split(" ")[0] : null;

        let subject = "";
        let html = "";

        switch (email_action_type) {
          case "signup":
          case "email_confirmation":
            subject = "Confirm your Shoot Brief account";
            html = confirmEmail(actionUrl, firstName);
            break;
          case "recovery":
            subject = "Reset your Shoot Brief password";
            html = resetEmail(actionUrl, firstName);
            break;
          case "magiclink":
            subject = "Your Shoot Brief login link";
            html = magicLinkEmail(actionUrl, firstName);
            break;
          case "email_change":
          case "email_change_new":
            subject = "Confirm your new email address";
            html = emailChangeEmail(actionUrl, firstName);
            break;
          default:
            subject = "Action required — Shoot Brief";
            html = confirmEmail(actionUrl, firstName);
        }

        try {
          await sendEmail({ to: user.email, subject, html });
        } catch (e) {
          console.error("[send-email hook] sendEmail threw:", e);
        }

        // Always return 200 — Supabase requires this
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

// ─── Templates ────────────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8faf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#1a1a1a;border-radius:12px 12px 0 0;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">📷 Shoot Brief</span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:36px 32px;border-left:1px solid #e8f0e0;border-right:1px solid #e8f0e0;">
          ${content}
        </td></tr>
        <tr><td style="background:#f0f7e8;border-radius:0 0 12px 12px;border:1px solid #e8f0e0;padding:16px 32px;text-align:center;">
          <span style="color:#6b7280;font-size:12px;">
            Powered by <a href="https://shootbrief.app" style="color:#4f8a1f;text-decoration:none;">Shoot Brief</a>
          </span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#4f8a1f;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-top:20px;">${label}</a>`;
}

function confirmEmail(url: string, firstName: string | null) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Confirm your email</h1>
    <p style="margin:8px 0 4px;font-size:15px;color:#374151;line-height:1.6;">
      ${firstName ? `Hi ${firstName},` : "Hi there,"} welcome to Shoot Brief.
    </p>
    <p style="margin:4px 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Click the button below to confirm your email address and start planning your shoots.
    </p>
    ${btn(url, "Confirm email address")}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you didn't create a Shoot Brief account you can safely ignore this email.
    </p>
  `);
}

function resetEmail(url: string, firstName: string | null) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Reset your password</h1>
    <p style="margin:8px 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      ${firstName ? `Hi ${firstName}, we` : "We"} received a request to reset your Shoot Brief password. Click the button below to choose a new one.
    </p>
    ${btn(url, "Reset password")}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you didn't request a password reset you can safely ignore this email. This link expires in 24 hours.
    </p>
  `);
}

function magicLinkEmail(url: string, firstName: string | null) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Your login link</h1>
    <p style="margin:8px 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      ${firstName ? `Hi ${firstName}, click` : "Click"} the button below to sign in to Shoot Brief. This link expires in 10 minutes.
    </p>
    ${btn(url, "Sign in to Shoot Brief")}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you didn't request this link you can safely ignore this email.
    </p>
  `);
}

function emailChangeEmail(url: string, firstName: string | null) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Confirm your new email</h1>
    <p style="margin:8px 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      ${firstName ? `Hi ${firstName}, click` : "Click"} the button below to confirm your new email address for Shoot Brief.
    </p>
    ${btn(url, "Confirm new email")}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you didn't request this change you can safely ignore this email.
    </p>
  `);
}
