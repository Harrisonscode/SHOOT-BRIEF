import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Use — Shoot Brief" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">← Back to home</Link>
        <h1 className="text-3xl font-bold">Terms of Use</h1>
        <p className="text-muted-foreground mt-2 text-sm">Last updated: July 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Agreement to terms</h2>
            <p>By accessing or using Shoot Brief ("the Service") at shootbrief.app, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the Service. These terms apply to all users of the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Description of service</h2>
            <p>Shoot Brief is a software-as-a-service application designed for professional photographers. It provides tools for shoot planning, client management, booking requests, expense tracking, and client communication. We reserve the right to modify, suspend or discontinue any part of the Service at any time.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Accounts</h2>
            <p className="mb-2">To use Shoot Brief you must create an account. You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring the information you provide is accurate and up to date</li>
            </ul>
            <p className="mt-2">You must be at least 18 years old to create an account. You may not create an account on behalf of someone else without their permission.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Free and Pro plans</h2>
            <p className="mb-2">Shoot Brief offers a free plan with limited features and a Pro plan with full access. The free plan allows up to 3 shoots and access to core planning features. The Pro plan is billed monthly and provides unlimited shoots and all features.</p>
            <p>We reserve the right to change the features available on each plan and the pricing of the Pro plan with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Payment and cancellation</h2>
            <p className="mb-2">Pro subscriptions are billed monthly via Stripe. By subscribing to Pro you authorise us to charge your payment method on a recurring monthly basis. Subscriptions automatically renew unless cancelled.</p>
            <p className="mb-2">You may cancel your subscription at any time through the billing portal. Cancellation takes effect at the end of the current billing period — you retain Pro access until then. We do not offer refunds for partial months.</p>
            <p>If a payment fails, we will attempt to retry the charge. If payment continues to fail your account may be downgraded to the free plan.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Your content</h2>
            <p className="mb-2">You retain ownership of all content you upload or create within Shoot Brief, including shoot data, client information, and images. By uploading content you grant us a limited licence to store and display it solely for the purpose of providing the Service to you.</p>
            <p>You are responsible for ensuring you have the right to store any client information or images you upload, and that doing so complies with applicable data protection laws.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload content that infringes third-party rights or is harmful, offensive or illegal</li>
              <li>Attempt to gain unauthorised access to any part of the Service</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Reverse engineer, copy or resell any part of the Service</li>
              <li>Use automated tools to scrape or extract data from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Client data responsibility</h2>
            <p>When you store client personal data (names, emails, phone numbers) in Shoot Brief, you are the data controller for that information. You are responsible for ensuring you have a lawful basis for storing that data and complying with applicable privacy laws including GDPR. We process client data only as your data processor on your instructions.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Availability and limitations</h2>
            <p>We aim to keep the Service available at all times but do not guarantee uninterrupted access. We are not liable for any downtime, data loss or service interruptions. You are responsible for maintaining your own backups of important data.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Intellectual property</h2>
            <p>All intellectual property rights in the Shoot Brief application, including the software, design, and branding, belong to us. Nothing in these terms grants you any rights to our intellectual property other than the limited right to use the Service as described here.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Shoot Brief shall not be liable for any indirect, incidental, special, consequential or punitive damages arising from your use of the Service. Our total liability to you for any claim arising from these terms or your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">12. Termination</h2>
            <p>We may suspend or terminate your account if you breach these terms, or for any other reason at our discretion with reasonable notice. You may delete your account at any time. On termination your data will be deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">13. Changes to these terms</h2>
            <p>We may update these terms from time to time. We will notify you of significant changes by email. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">14. Governing law</h2>
            <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">15. Contact</h2>
            <p>If you have any questions about these terms, contact us at <a href="mailto:hello@shootbrief.app" className="text-primary hover:underline">hello@shootbrief.app</a>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
