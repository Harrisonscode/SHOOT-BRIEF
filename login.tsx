// Server-only email utility using Resend
// Usage: await sendEmail({ to, subject, html })

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? "hello@shootbrief.app";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `Shoot Brief <${from}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    console.error("[email] send failed:", res.status, err);
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shoot Brief</title>
</head>
<body style="margin:0;padding:0;background:#f8faf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Header -->
        <tr><td style="background:#1a1a1a;border-radius:12px 12px 0 0;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">📷 Shoot Brief</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e8f0e0;border-right:1px solid #e8f0e0;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f0f7e8;border-radius:0 0 12px 12px;border:1px solid #e8f0e0;padding:16px 32px;text-align:center;">
          <span style="color:#6b7280;font-size:12px;">Powered by <a href="https://shootbrief.app" style="color:#4f8a1f;text-decoration:none;">Shoot Brief</a></span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#4f8a1f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:20px;">${label}</a>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:8px 0;font-size:15px;color:#374151;line-height:1.6;">${text}</p>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#1a1a1a;font-weight:500;">${value}</td>
  </tr>`;
}

function table(rows: string) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f8faf7;border-radius:8px;padding:16px;margin:20px 0;">${rows}</table>`;
}

// ─── New booking request → photographer ──────────────────────────────────────
export function bookingRequestEmail(opts: {
  photographerEmail: string;
  photographerName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  shootType: string | null;
  preferredDate: string | null;
  budget: string | null;
  location: string | null;
  message: string | null;
  dashboardUrl: string;
}) {
  const html = base(`
    ${h1("New booking request")}
    ${p(`<strong>${opts.clientName}</strong> has sent you a booking request.`)}
    ${table(`
      ${row("Name", opts.clientName)}
      ${row("Email", opts.clientEmail)}
      ${opts.clientPhone ? row("Phone", opts.clientPhone) : ""}
      ${opts.shootType ? row("Shoot type", opts.shootType) : ""}
      ${opts.preferredDate ? row("Preferred date", opts.preferredDate) : ""}
      ${opts.budget ? row("Budget", opts.budget) : ""}
      ${opts.location ? row("Location", opts.location) : ""}
    `)}
    ${opts.message ? `<div style="background:#f8faf7;border-left:3px solid #4f8a1f;border-radius:4px;padding:12px 16px;margin:16px 0;font-size:14px;color:#374151;line-height:1.6;">${opts.message.replace(/\n/g, "<br/>")}</div>` : ""}
    ${btn(opts.dashboardUrl, "View in Shoot Brief")}
  `);

  return {
    to: opts.photographerEmail,
    subject: `New booking request from ${opts.clientName}`,
    html,
    replyTo: opts.clientEmail,
  };
}

// ─── Booking confirmation → client ────────────────────────────────────────────
export function bookingConfirmationEmail(opts: {
  clientEmail: string;
  clientName: string;
  photographerName: string;
  photographerEmail: string;
  shootType: string | null;
  preferredDate: string | null;
}) {
  const html = base(`
    ${h1("Booking request received!")}
    ${p(`Hi ${opts.clientName.split(" ")[0]}, thanks for reaching out to <strong>${opts.photographerName}</strong>.`)}
    ${p("Your booking request has been received and they'll be in touch soon to confirm details.")}
    ${opts.shootType || opts.preferredDate ? table(`
      ${opts.shootType ? row("Shoot type", opts.shootType) : ""}
      ${opts.preferredDate ? row("Preferred date", opts.preferredDate) : ""}
    `) : ""}
    ${p(`In the meantime, feel free to reply to this email if you have any questions.`)}
  `);

  return {
    to: opts.clientEmail,
    subject: `Booking request received — ${opts.photographerName}`,
    html,
    replyTo: opts.photographerEmail,
  };
}

// ─── Booking accepted → client ────────────────────────────────────────────────
export function bookingAcceptedEmail(opts: {
  clientEmail: string;
  clientName: string;
  photographerName: string;
  photographerEmail: string;
  shootType: string | null;
  preferredDate: string | null;
  portalUrl?: string | null;
}) {
  const html = base(`
    ${h1("Your booking has been accepted! 🎉")}
    ${p(`Hi ${opts.clientName.split(" ")[0]}, great news — <strong>${opts.photographerName}</strong> has accepted your booking request.`)}
    ${opts.shootType || opts.preferredDate ? table(`
      ${opts.shootType ? row("Shoot type", opts.shootType) : ""}
      ${opts.preferredDate ? row("Preferred date", opts.preferredDate) : ""}
    `) : ""}
    ${opts.portalUrl ? `${p("You can track your shoot progress and view updates using the link below:")}${btn(opts.portalUrl, "View your shoot portal")}` : ""}
    ${p(`Questions? Just reply to this email.`)}
  `);

  return {
    to: opts.clientEmail,
    subject: `Booking confirmed — ${opts.photographerName}`,
    html,
    replyTo: opts.photographerEmail,
  };
}

// ─── New review submitted → photographer ──────────────────────────────────────
export function reviewSubmittedEmail(opts: {
  photographerEmail: string;
  photographerName: string;
  clientName: string;
  rating: number;
  body: string | null;
  shootName: string;
  dashboardUrl: string;
}) {
  const stars = "★".repeat(opts.rating) + "☆".repeat(5 - opts.rating);
  const html = base(`
    ${h1("New review received")}
    ${p(`<strong>${opts.clientName}</strong> left a review for <em>${opts.shootName}</em>.`)}
    <div style="margin:20px 0;padding:16px;background:#f8faf7;border-radius:8px;border:1px solid #e8f0e0;">
      <div style="font-size:20px;color:#f59e0b;margin-bottom:8px;">${stars}</div>
      ${opts.body ? `<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">"${opts.body}"</p>` : ""}
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">— ${opts.clientName}</p>
    </div>
    ${p("Review it in Shoot Brief and approve it to show it on your booking page.")}
    ${btn(opts.dashboardUrl, "View reviews")}
  `);

  return {
    to: opts.photographerEmail,
    subject: `New ${opts.rating}★ review from ${opts.clientName}`,
    html,
  };
}

// ─── Pro upgrade confirmation → user ──────────────────────────────────────────
export function proUpgradeEmail(opts: {
  userEmail: string;
  userName: string | null;
}) {
  const html = base(`
    ${h1("Welcome to Shoot Brief Pro! 🎉")}
    ${p(`Hi ${opts.userName ?? "there"}, your upgrade to Pro is confirmed.`)}
    ${p("You now have access to:")}
    <ul style="margin:12px 0;padding-left:20px;color:#374151;font-size:15px;line-height:2;">
      <li>Unlimited shoots</li>
      <li>PDF shoot briefs</li>
      <li>Client portal & shareable links</li>
      <li>Inspiration board</li>
      <li>Calendar sync</li>
      <li>Expense tracking</li>
      <li>Recurring shoots</li>
    </ul>
    ${btn("https://shootbrief.app/dashboard", "Go to your dashboard")}
    ${p(`Questions? Reply to this email anytime.`)}
  `);

  return {
    to: opts.userEmail,
    subject: "Welcome to Shoot Brief Pro!",
    html,
  };
}
