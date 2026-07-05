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
          return new Response("Bad request", { status: 400 });
        }

        // Supabase sends: { user: {...}, email_data: { token, token_hash, redirect_to, email_action_type, site_url, otp } }
        const user = body?.user;
        const emailData = body?.email_data;

        if (!user?.email || !emailData) {
          return new Response("Missing data", { status: 400 });
        }

        const { email_action_type, token_hash, redirect_to, site_url } = emailData;
        const baseUrl = site_url || "https://shootbrief.app";

        // Build the confirmation/action URL
        const actionUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || baseUrl}`;

        const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || null;
        const firstName = displayName ? displayName.split(" ")[0] : null;

        let subject = "";
        let html = "";

        if (email_action_type === "signup" || email_action_type === "email_confirmation") {
          subject = "Confirm your Shoot Brief account";
          html = confirmEmail(actionUrl, firstName);
        } else if (email_action_type === "recovery") {
          subject = "Reset your Shoot Brief password";
          html = resetEmail(actionUrl, firstName);
        } else if (email_action_type === "magiclink") {
          subject = "Your Shoot Brief login link";
          html = magicLinkEmail(actionUrl, firstName);
        } else if (email_action_type === "email_change") {
          subject = "Confirm your new email address";
          html = emailChangeEmail(actionUrl, firstName);
        } else {
          // Unknown type — still send a generic confirmation
          subject = "Action required — Shoot Brief";
          html = confirmEmail(actionUrl, firstName);
        }

        await sendEmail({
          to: user.email,
          subject,
          html,
        });

        // Supabase expects a 200 response
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
      Click the button below to confirm your email address and get started planning your shoots.
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
