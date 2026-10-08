import React from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import HeroParticles from "../components/HeroParticles";

const H2 = ({ children }) => (
  <h2 className="font-display font-semibold tracking-[-0.02em] text-[19px] md:text-[21px] text-[var(--text)] mt-12 first:mt-0">{children}</h2>
);
const H3 = ({ children }) => (
  <h3 className="font-display font-semibold text-[15px] text-[var(--text)] mt-7">{children}</h3>
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

export default function Privacy() {
  return (
    <div data-testid="privacy-page" className="page-enter landing-page-bg">
      <Seo
        title="Privacy Policy"
        description="How Bracket collects, uses and protects your data — including data from connected sources like Gmail."
        path="/privacy"
      />
      <section className="relative overflow-x-clip isolate">
        <HeroParticles />
        <div className="relative z-10 max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-10">
          <span className="section-label"><span className="dot" />LEGAL</span>
          <h1 className="t-display mt-6">Privacy <span className="landing-hero-gradient">Policy</span></h1>
          <p className="mt-4 text-[13px] text-[var(--text-3)] font-mono uppercase tracking-[0.08em]">Last updated: August 31, 2026</p>
          <p className="mt-5 text-[14.5px] leading-[1.7] text-[var(--text-2)]">
            Bracket ("Bracket," "we," "us," or "our") is operated by Saksham Shukla, an individual based in India.
            Bracket helps freelancers, agencies, consultants, and other client-service professionals keep track of
            client projects by connecting selected work conversations and sources, maintaining project memory,
            identifying important changes, and helping users prepare and send client communications. This Privacy
            Policy explains what information Bracket collects, how we use it, and the choices available to you.
          </p>
        </div>
      </section>

      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pb-24 md:pb-32">

          <H2>1. Information we collect</H2>
          <H3>Account information</H3>
          <P>When you create or use a Bracket account, we may collect information such as:</P>
          <UL items={[
            "Your name",
            "Email address",
            "Authentication information",
            "Account and product preferences",
            "Subscription and billing information",
          ]} />
          <P>We do not store your payment-card details directly where payment is processed by a third-party payment provider.</P>
          <H3>Project information</H3>
          <P>When you use Bracket, we may process information associated with projects you create, including:</P>
          <UL items={[
            "Project names",
            "Scope",
            "Deliverables",
            "Requirements",
            "Decisions",
            "Deadlines",
            "Timeline and project history",
            "Generated or edited client responses",
            "Other project information you provide",
          ]} />
          <H3>Connected-source information</H3>
          <P>
            Bracket allows you to connect supported third-party services. For example, when you connect Gmail, Bracket
            may access the conversations you select or authorize for use with a project. Bracket uses connected-source
            information to provide the functionality you request, including understanding project conversations,
            creating compressed project-relevant summaries, maintaining project memory, detecting meaningful changes,
            answering questions about project history, and preparing communications. Bracket does not intentionally use
            unrelated conversations or content to build your project memory.
          </P>

          <H2>2. Gmail and Google user data</H2>
          <P>
            When you connect Gmail, Bracket uses Google OAuth to request permissions required to provide Gmail-related
            features. Depending on the features you use and permissions you grant, Bracket may access Gmail information
            necessary to:
          </P>
          <UL items={[
            "Let you identify and connect project conversations",
            "Read connected project conversations",
            "Understand and summarize project-relevant communication",
            "Extract project information",
            "Maintain project memory and history",
            "Detect changes affecting scope, deliverables, requirements, decisions, or deadlines",
            "Generate suggested replies",
            "Send an email on your behalf when you explicitly choose to send it",
          ]} />
          <P>
            Bracket does not automatically send emails on your behalf. A communication is sent only after an action
            initiated or approved by you. We request Google API permissions based on the functionality Bracket needs and
            aim to use the minimum access reasonably necessary to provide those features. Google itself requires
            applications to request the narrowest scopes necessary for their functionality.
          </P>
          <H3>Google API Services User Data Policy</H3>
          <P>
            Bracket's use and transfer to any other app of information received from Google APIs will adhere to the{" "}
            <a className="link-accent" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. Google requires applications
            accessing Google user data to disclose how that information is accessed, used, stored, and shared.
          </P>
          <UL items={[
            "We do not use Google user data for advertising.",
            "We do not sell Google user data.",
            "We do not use Google user data to create advertising profiles.",
            "Access to Google user data by humans is limited to circumstances where it is necessary to provide or secure the service, comply with applicable law, address a user-requested support issue with appropriate permission, or where otherwise permitted under applicable Google policies.",
          ]} />

          <H2>3. How Bracket uses your information</H2>
          <P>We use information processed through Bracket to:</P>
          <UL items={[
            "Provide and operate Bracket",
            "Build and maintain project memory",
            "Compress project conversations into relevant information",
            "Identify scope, deliverables, requirements, decisions and deadlines",
            "Detect meaningful project changes",
            "Maintain project history",
            "Answer questions about your project",
            "Generate suggested client responses",
            "Send communications you explicitly instruct Bracket to send",
            "Authenticate users",
            "Provide customer support",
            "Process subscriptions and payments",
            "Maintain security and prevent abuse",
            "Diagnose and improve product performance",
            "Comply with applicable legal obligations",
          ]} />
          <P>We do not sell your project content or connected-source content.</P>

          <H2>4. AI processing</H2>
          <P>
            Bracket uses artificial-intelligence services to provide features such as extraction, summarization,
            project-memory updates, change detection, question answering, and reply generation. Relevant portions of
            project information may therefore be processed by AI service providers acting on our behalf. Bracket does
            not intentionally send an entire connected account to an AI provider when only selected project information
            is required.
          </P>

          <H2>5. How we share information</H2>
          <P>We may share information with service providers when reasonably necessary to operate Bracket, including providers of:</P>
          <UL items={[
            "Cloud hosting and infrastructure",
            "Databases and storage",
            "Authentication",
            "AI processing",
            "Payment processing",
            "Email/integration infrastructure",
            "Error monitoring and security",
            "Product analytics",
          ]} />
          <P>
            These providers may process information only as necessary to provide their services to Bracket, subject to
            their applicable contractual and legal obligations. We may also disclose information when required by
            applicable law, legal process, or to protect the security, rights, or integrity of Bracket, our users, or
            others. We do not sell your personal data or project content.
          </P>

          <H2>6. Your client's information</H2>
          <P>
            Projects may contain information about your clients, coworkers, contractors, or other people. You are
            responsible for ensuring that you have the necessary authority, permission, or other lawful basis to
            connect, upload, or process information through Bracket. You should not connect conversations or other
            sources that you are not authorized to use.
          </P>

          <H2>7. Data storage and security</H2>
          <P>
            We use reasonable technical and organizational measures designed to protect information processed by
            Bracket. Depending on the implementation, these measures may include encryption in transit, access controls,
            authentication protections, and restricted access to production systems. However, no internet service or
            storage system can guarantee absolute security.
          </P>

          <H2>8. Connected accounts and disconnecting access</H2>
          <P>
            You may disconnect supported integrations from Bracket. You may also revoke Bracket's access through the
            relevant third-party provider, such as your Google Account settings. Disconnecting an integration stops
            future access through that authorization. Where Bracket has already derived project information from a
            connected conversation—for example a recorded decision or deadline—disconnecting the source does not
            necessarily remove that project-memory information unless you also delete the relevant project or request
            deletion.
          </P>

          <H2>9. Data retention and deletion</H2>
          <P>
            We retain account and project information for as long as reasonably necessary to provide Bracket, maintain
            the account, comply with legal obligations, resolve disputes, and protect the service. You may request
            deletion of your Bracket account and associated personal data by contacting{" "}
            <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>. Where
            applicable, deletion may be subject to limited retention required for security, fraud prevention, billing,
            legal compliance, backups, or dispute resolution.
          </P>

          <H2>10. Payments</H2>
          <P>
            If you purchase a Bracket subscription or project plan, payment information may be processed by a
            third-party payment provider. Bracket may receive transaction information such as payment status, plan,
            transaction identifier, billing country, and amount, but does not need to store full payment-card
            information itself when payments are handled by the provider.
          </P>

          <H2>11. Cookies and analytics</H2>
          <P>Bracket may use cookies or similar technologies necessary for:</P>
          <UL items={[
            "Authentication",
            "Maintaining sessions",
            "Security",
            "Remembering product preferences",
            "Understanding product usage and performance",
          ]} />
          <P>If additional analytics or tracking technologies are introduced, this Policy may be updated accordingly.</P>

          <H2>12. International processing</H2>
          <P>
            Some service providers used by Bracket may process information outside your country. Where required by
            applicable law, we will take reasonable steps to ensure that such processing is handled with appropriate
            protections.
          </P>

          <H2>13. Your rights and choices</H2>
          <P>
            Depending on applicable law, you may have rights concerning your personal data, including rights to request
            access, correction, deletion, or information about its processing. You may also:
          </P>
          <UL items={[
            "Disconnect connected services",
            "Revoke third-party OAuth permissions",
            "Delete projects where supported",
            "Request account deletion",
            "Contact us regarding privacy concerns",
          ]} />
          <P>
            Requests can be sent to <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
            India's Digital Personal Data Protection Act provides a framework for notices, consent and individual
            rights, with substantive provisions being commenced in stages.
          </P>

          <H2>14. Children</H2>
          <P>
            Bracket is intended for professional and business use and is not designed for children. If we learn that we
            have collected personal data from a child in circumstances where applicable law requires parental consent or
            prohibits such processing, we will take appropriate steps to delete or otherwise address that information.
          </P>

          <H2>15. Changes to this Policy</H2>
          <P>
            We may update this Privacy Policy as Bracket evolves. If we make material changes, we may provide notice
            through Bracket, by email, or through another appropriate method. The "Last updated" date at the top
            indicates when this Policy was most recently revised.
          </P>

          <H2>16. Contact</H2>
          <P>
            For privacy questions, requests, or complaints: Bracket, operated by Saksham Shukla, India —{" "}
            <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </P>

          <div className="mt-14 pt-8 border-t border-[var(--hairline)] flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/terms" className="link-accent text-[13px]" data-testid="privacy-to-terms">Terms of Use →</Link>
            <Link to="/pricing" className="link-accent text-[13px]">Pricing →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
