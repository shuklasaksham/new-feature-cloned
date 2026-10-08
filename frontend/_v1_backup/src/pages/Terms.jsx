import React from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import HeroParticles from "../components/HeroParticles";

const H2 = ({ children }) => (
  <h2 className="font-display font-semibold tracking-[-0.02em] text-[19px] md:text-[21px] text-[var(--text)] mt-12 first:mt-0">{children}</h2>
);
const P = ({ children }) => (
  <p className="mt-3 text-[13.5px] leading-[1.75] text-[var(--text-2)]">{children}</p>
);
const UL = ({ items }) => (
  <ul className="mt-3 space-y-2">
    {items.map((it, i) => (
      <li key={i} className="text-[13.5px] leading-[1.7] text-[var(--text-2)] pl-4 relative">
        <span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full" style={{ background: "#7a7a7a" }} />
        {it}
      </li>
    ))}
  </ul>
);

export default function Terms() {
  return (
    <div data-testid="terms-page" className="page-enter landing-page-bg">
      <Seo
        title="Terms of Use"
        description="The terms that govern your use of Bracket, including connected work sources like Gmail."
        path="/terms"
      />
      <section className="relative overflow-x-clip isolate">
        <HeroParticles />
        <div className="relative z-10 max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-10">
          <span className="section-label"><span className="dot" />LEGAL</span>
          <h1 className="t-display mt-6">Terms of <span className="landing-hero-gradient">Use</span></h1>
          <p className="mt-4 text-[13px] text-[var(--text-3)] font-mono uppercase tracking-[0.08em]">Last updated: August 31, 2026</p>
          <p className="mt-5 text-[14.5px] leading-[1.7] text-[var(--text-2)]">
            These Terms of Use ("Terms") govern your access to and use of Bracket. Bracket is operated by Saksham
            Shukla, an individual based in India ("Bracket," "we," "us," or "our"). By creating an account, purchasing a
            plan, connecting a source, or otherwise using Bracket, you agree to these Terms.
          </p>
        </div>
      </section>

      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pb-24 md:pb-32">

          <H2>1. What Bracket provides</H2>
          <P>Bracket is a software service designed to help users understand and manage client-project information. Bracket may allow you to:</P>
          <UL items={[
            "Connect selected project conversations or work sources",
            "Maintain project memory",
            "Track scope, deliverables, requirements and decisions",
            "Identify deadlines and project changes",
            "Maintain project history",
            "Compress client communication into project-relevant information",
            "Ask questions about project context and history",
            "Generate suggested client responses",
            "Send communications through supported integrations when explicitly initiated or approved by you",
          ]} />
          <P>Features may change as Bracket develops.</P>

          <H2>2. Eligibility and accounts</H2>
          <P>You must be legally capable of entering into these Terms to use Bracket. You are responsible for:</P>
          <UL items={[
            "Providing accurate account information",
            "Maintaining the security of your account",
            "Protecting your authentication credentials",
            "Activities performed through your account",
            "Promptly notifying us if you believe your account has been compromised",
          ]} />
          <P>You may not share access in a way that circumvents applicable plan limits or security controls.</P>

          <H2>3. Connecting third-party services</H2>
          <P>
            Bracket may allow you to connect services such as Gmail and other supported work tools. By connecting a
            service, you authorize Bracket to access and process information from that service to the extent necessary
            to provide the functionality you request and subject to the permissions you grant. You are responsible for
            ensuring that you have the right to connect and process the relevant information. You must not use Bracket to
            access communications, accounts, files, or other information that you are not authorized to access.
            Third-party services remain governed by their own terms and privacy policies.
          </P>

          <H2>4. Client and third-party information</H2>
          <P>
            Bracket is designed for client work, which means information you process may concern other people or
            organizations. You are responsible for determining whether you have appropriate authorization or another
            lawful basis to process that information through Bracket. Bracket does not independently obtain consent from
            your clients merely because you connect a conversation to the service.
          </P>

          <H2>5. AI-generated information</H2>
          <P>Bracket uses artificial intelligence to extract, summarize, organize, identify, and generate information. AI systems can make mistakes. Bracket may incorrectly interpret:</P>
          <UL items={[
            "Scope", "Requirements", "Deliverables", "Decisions", "Deadlines",
            "Client intentions", "Historical information", "Suggested responses",
          ]} />
          <P>
            You are responsible for reviewing information where appropriate before relying on it for important business
            decisions. Bracket is an assistance tool and does not replace your professional judgment.
          </P>

          <H2>6. Project changes</H2>
          <P>
            Bracket may identify that a client communication affects multiple parts of a project. For example, a request
            may affect scope, deliverables, requirements and deadlines simultaneously. Where Bracket presents a project
            change for your review, your acceptance may cause Bracket to update multiple related parts of the project's
            memory together. You remain responsible for deciding whether a proposed project change accurately reflects
            your agreement with your client.
          </P>

          <H2>7. Client communications</H2>
          <P>
            Bracket may generate suggested emails or other communications based on project context. Generated
            communications are suggestions. Where Bracket provides a sending feature, Bracket will not intentionally send
            a client communication without an action initiated or approved by you. You are responsible for reviewing the
            recipient, content, attachments if any, and other relevant information before sending. You remain
            responsible for communications sent through your connected accounts.
          </P>

          <H2>8. Your content</H2>
          <P>
            You retain ownership of content you provide to Bracket and, as between you and Bracket, your project
            information. You grant Bracket a limited right to host, process, reproduce, transmit and otherwise use your
            content solely as reasonably necessary to:
          </P>
          <UL items={[
            "Operate Bracket",
            "Provide features you request",
            "Maintain and secure the service",
            "Comply with applicable law",
          ]} />
          <P>This permission ends when the relevant information is deleted, subject to reasonable technical, backup, security, and legal-retention requirements.</P>

          <H2>9. Bracket's intellectual property</H2>
          <P>
            Bracket, including its software, interface, branding, designs, underlying technology, and other materials
            provided by us, is owned by or licensed to the operator of Bracket and is protected by applicable
            intellectual-property laws. These Terms do not transfer ownership of Bracket to you. You may not copy,
            resell, redistribute, reverse engineer, or commercially exploit Bracket except where permitted by applicable
            law or with our written permission.
          </P>

          <H2>10. Acceptable use</H2>
          <P>You may not use Bracket to:</P>
          <UL items={[
            "Access information without authorization",
            "Violate another person's privacy or intellectual-property rights",
            "Send spam or unlawful communications",
            "Distribute malware or harmful code",
            "Attempt to bypass security controls",
            "Interfere with or disrupt the service",
            "Conduct unauthorized automated scraping",
            "Impersonate another person",
            "Use Bracket for unlawful activities",
            "Attempt to obtain unauthorized access to another user's projects or account",
          ]} />
          <P>We may restrict or suspend access where reasonably necessary to protect Bracket, our users, or third parties.</P>

          <H2>11. Plans and pricing</H2>
          <P>Bracket may offer different purchasing options. Current advertised plans may include:</P>
          <UL items={[
            "Monthly plan — ₹999/month: provides access to the features and limits described on the pricing page for the applicable subscription period (up to 10 active projects, with unlimited archived projects).",
            "Per-project plan — ₹199/project: provides access for one project for 60 days, subject to the features and limits described on the pricing page.",
          ]} />
          <P>
            Current pricing and plan features are displayed on Bracket's Pricing page. Prices may change in the future.
            Changes to recurring subscription prices will not apply retroactively to periods already paid for and, where
            appropriate, we will provide notice before a changed recurring price takes effect.
          </P>

          <H2>12. Subscriptions</H2>
          <P>
            Monthly subscriptions renew automatically unless cancelled before the next billing date, if automatic
            renewal is enabled for the plan. You may cancel a recurring subscription at any time. Unless otherwise stated
            during purchase, cancellation stops future renewal and access continues until the end of the current paid
            billing period. Cancellation does not automatically delete your account or project data.
          </P>

          <H2>13. Per-project purchases</H2>
          <P>
            A ₹199 project purchase provides access to the applicable project for the advertised 60-day active period. At
            the end of that period, you may be offered the ability to extend the project, move to another plan, or
            otherwise continue access according to the options available at that time. The exact expiry behavior is
            displayed to you before purchase.
          </P>

          <H2>14. Refunds</H2>
          <P>
            Except where required by applicable law or expressly stated at the time of purchase, payments are generally
            non-refundable once the applicable paid service has begun. If you believe you were charged incorrectly,
            contact <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </P>

          <H2>15. Third-party services</H2>
          <P>
            Bracket depends on third-party services, APIs and infrastructure. These may include email providers, AI
            providers, hosting providers, payment processors, and connected work tools. Third-party providers may
            modify, restrict, discontinue, or temporarily interrupt their services. As a result, particular Bracket
            integrations or features may become unavailable or change. We do not control third-party services and are
            not responsible for their independent acts or omissions.
          </P>

          <H2>16. Availability and changes</H2>
          <P>We aim to keep Bracket available and reliable, but we do not guarantee uninterrupted or error-free operation. We may:</P>
          <UL items={[
            "Add or remove features",
            "Modify functionality",
            "Introduce usage limits",
            "Change supported integrations",
            "Perform maintenance",
            "Suspend functionality for security or operational reasons",
          ]} />
          <P>Where reasonably practical, we will provide notice of material changes that significantly reduce a paid service.</P>

          <H2>17. Termination</H2>
          <P>
            You may stop using Bracket at any time. You may request account deletion by contacting{" "}
            <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a> or using an
            account-deletion feature if available. We may suspend or terminate access if you materially violate these
            Terms, misuse the service, fail to pay applicable charges, create security risks, or use Bracket unlawfully.
            Where reasonable, we will provide notice and an opportunity to resolve the issue.
          </P>

          <H2>18. Disclaimer</H2>
          <P>To the maximum extent permitted by applicable law, Bracket is provided on an "as is" and "as available" basis. We do not guarantee that:</P>
          <UL items={[
            "AI-generated information will always be accurate",
            "Bracket will identify every project change",
            "Every deadline, requirement, decision, or scope item will be detected",
            "Suggested communications will be appropriate for every situation",
            "The service will always be uninterrupted or error-free",
            "Third-party integrations will always remain available",
          ]} />
          <P>You should use appropriate professional judgment when relying on Bracket. Nothing in these Terms excludes warranties or rights that cannot legally be excluded.</P>

          <H2>19. Limitation of liability</H2>
          <P>
            To the maximum extent permitted by applicable law, Bracket and its operator will not be liable for indirect,
            incidental, special, consequential, or punitive damages, or for loss of profits, revenue, business
            opportunities, goodwill, or data arising from your use of the service. To the maximum extent permitted by
            applicable law, our aggregate liability relating to Bracket will not exceed the greater of: (a) the amount
            you paid to Bracket during the 12 months immediately preceding the event giving rise to the claim, or (b)
            US$50. These limitations do not apply where liability cannot legally be limited or excluded.
          </P>

          <H2>20. Indemnification</H2>
          <P>
            To the extent permitted by applicable law, you agree to indemnify and hold the operator of Bracket harmless
            from third-party claims arising from your unlawful use of Bracket, your violation of these Terms, or your
            processing of information that you did not have authority to provide or connect. This provision does not
            apply to the extent a claim results from Bracket's own unlawful conduct.
          </P>

          <H2>21. Governing law and disputes</H2>
          <P>
            These Terms are governed by the laws of India, without regard to conflict-of-law principles. Before
            commencing formal proceedings, you and Bracket agree to make a reasonable attempt to resolve disputes
            informally by contacting <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </P>

          <H2>22. Changes to these Terms</H2>
          <P>
            We may update these Terms as Bracket develops. If a change materially affects existing paid users, we may
            provide reasonable advance notice through email, Bracket, or another appropriate method. Continued use after
            updated Terms become effective constitutes acceptance where permitted by applicable law.
          </P>

          <H2>23. Contact</H2>
          <P>
            Questions about these Terms can be sent to: Bracket, operated by Saksham Shukla, India —{" "}
            <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </P>

          <div className="mt-14 pt-8 border-t border-[var(--hairline)] flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/privacy" className="link-accent text-[13px]" data-testid="terms-to-privacy">Privacy Policy →</Link>
            <Link to="/pricing" className="link-accent text-[13px]">Pricing →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
