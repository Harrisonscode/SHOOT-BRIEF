import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Shoot Brief" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">← Back to home</Link>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2 text-sm">Last updated: July 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Who we are</h2>
            <p>Shoot Brief ("we", "us", "our") is a software-as-a-service application for professional photographers, available at shootbrief.app. We are committed to protecting your personal information and your right to privacy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. What information we collect</h2>
            <p className="mb-2">We collect information you provide directly to us:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information: your name, email address, and password when you register</li>
              <li>Profile information: business name, phone number, website, and profile photo</li>
              <li>Shoot data: shoot names, dates, locations, shot lists, notes, and client details you enter</li>
              <li>Client information: names, email addresses, and phone numbers of your clients that you add</li>
              <li>Payment information: processed securely by Stripe — we do not store card details</li>
              <li>Uploaded files: images you upload to the inspiration board</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. How we use your information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, operate and maintain the Shoot Brief service</li>
              <li>To process your subscription payments via Stripe</li>
              <li>To send transactional emails (account confirmation, password reset, booking notifications)</li>
              <li>To improve and develop new features for the service</li>
              <li>To respond to your support requests</li>
            </ul>
            <p className="mt-2">We do not sell, trade, or rent your personal information to third parties. We do not use your data for advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Client data you enter</h2>
            <p>When you add client details (names, emails, phone numbers) to Shoot Brief, you are the data controller for that information. You are responsible for ensuring you have the appropriate basis for storing and processing your clients' personal data. We process this data only on your instructions as your data processor.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Third-party services</h2>
            <p className="mb-2">We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Supabase</strong> — database and authentication (EU region)</li>
              <li><strong className="text-foreground">Stripe</strong> — payment processing</li>
              <li><strong className="text-foreground">Resend</strong> — transactional email delivery</li>
              <li><strong className="text-foreground">Vercel</strong> — application hosting</li>
            </ul>
            <p className="mt-2">Each of these services has their own privacy policies and data processing terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Data retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or accounting purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Your rights</h2>
            <p className="mb-2">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, email us at hello@shootbrief.app.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Cookies</h2>
            <p>Shoot Brief uses only essential cookies required for authentication and session management. We do not use tracking cookies or third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your personal data. All data is encrypted in transit (HTTPS) and at rest. Authentication is handled by Supabase with industry-standard security practices.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Changes to this policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of significant changes by email or by a notice in the application. Continued use of Shoot Brief after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Contact</h2>
            <p>If you have any questions about this privacy policy or how we handle your data, please contact us at <a href="mailto:hello@shootbrief.app" className="text-primary hover:underline">hello@shootbrief.app</a>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
