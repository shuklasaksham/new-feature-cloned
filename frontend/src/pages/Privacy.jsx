import React from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";

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
        <span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full" style={{ background: "var(--signal, #8184C4)" }} />
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
        description="How Bracket collects, uses and protects your data — including data from connected sources like Gmail, Figma, GitHub, Notion and Slack."
        path="/privacy"
      />
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative z-10 max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-10">
          <span className="section-label"><span className="dot" />LEGAL</span>
          <h1 className="t-display mt-6">Privacy <span className="landing-hero-gradient">Policy</span></h1>
          <p className="mt-4 text-[13px] text-[var(--text-3)] font-mono uppercase tracking-[0.08em]">Last updated: August 10, 2026</p>
          <p className="mt-5 text-[14.5px] leading-[1.7] text-[var(--text-2)]">
            Bracket ("Bracket", "we", "us") is an AI decision workspace for client projects, operated at{" "}
            <span className="text-[var(--text)]">use-bracket.com</span>. This policy explains what we collect, how we
            use it, and the strict boundaries we apply to data from connected work sources such as Gmail, Figma,
            GitHub, Notion and Slack.
          </p>
        </div>
      </section>

      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pb-24 md:pb-32">

          <H2>1. Information we collect</H2>
          <H3>Account information</H3>
          <UL items={[
            "Email address and name (used for sign-in via email code and account communication).",
            "Basic technical data: IP address, browser type, and usage analytics (pages viewed, features used) to improve the product.",
          ]} />
          <H3>Project content</H3>
          <P>
            The briefs, notes, decisions, documents and files you create inside Bracket. This content belongs to you.
          </P>
          <H3>Connected work sources (integrations)</H3>
          <P>
            When you connect an external source — a Gmail conversation, a Figma design file, a GitHub repository, a
            Notion page, a Slack channel — Bracket receives data from that provider through their official API, only
            after you explicitly authorize it via the provider's own sign-in (OAuth).
          </P>

          <H2>2. The source-level boundary — our core privacy promise</H2>
          <P>
            Bracket connects <span className="text-[var(--text)] font-medium">specific pieces of work, not your entire account</span>.
            Even where a provider's authorization technically grants broader access, we enforce a strict boundary in our own systems:
          </P>
          <UL items={[
            "We only read, store and process the specific sources you explicitly select (e.g. one email conversation, one design file, one repository).",
            "We never ingest, index or analyze unrelated data from your connected account.",
            "Listing screens (e.g. your recent conversations or files shown while you choose a source) are fetched transiently for selection and are not stored.",
            "Every extracted insight in Bracket retains a reference to the exact source it came from, and is only visible to you.",
            "You can disconnect any source at any time. Disconnecting stops all synchronization immediately and deletes the cached source content.",
          ]} />

          <H2>3. How we use connected-source data</H2>
          <P>Data from sources you select is used exclusively to power your project's intelligence:</P>
          <UL items={[
            "Extracting requirements, decisions, deliverables, deadlines and open questions into your Project Memory.",
            "Detecting meaningful changes (new client requests, deadline changes, potential scope creep) when the source updates.",
            "Answering your questions about the project (\"Ask Bracket\"), always with citations to the underlying source.",
            "Suggesting whether a newly connected source belongs to one of your existing projects.",
          ]} />
          <P>
            We do <span className="text-[var(--text)] font-medium">not</span> use connected-source data for advertising,
            we do not sell it, and we do not share it with third parties except the AI processing described below.
          </P>

          <H2>4. AI processing — no training on your data</H2>
          <UL items={[
            "Bracket sends relevant excerpts of your project content and selected sources to large-language-model providers (e.g. Anthropic Claude) strictly to generate the outputs you request.",
            "Your content is used for inference only. It is never used to train Bracket's or any third party's AI models.",
            "Humans do not read your connected-source data except with your explicit permission (e.g. a support request), or where required by law.",
          ]} />

          <H2>5. Google API Services — Limited Use disclosure</H2>
          <P>
            Bracket's use of information received from Google APIs (including Gmail data — read to understand the threads you connect, and used to send a reply only when you explicitly approve it) adheres to the{" "}
            <a className="link-accent" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>, including the Limited Use requirements. Specifically:
          </P>
          <UL items={[
            "Gmail data is only used to provide the user-facing features described here: understanding the specific conversations you connect to a project.",
            "We do not transfer Gmail data to third parties except as necessary to provide these features (AI inference), for security, or to comply with law.",
            "We do not use Gmail data for advertising.",
            "Humans do not read your Gmail data unless you give explicit permission, it is necessary for security, or required by law.",
          ]} />

          <H2>6. Provider-specific notes</H2>
          <UL items={[
            "Gmail: we read only the conversations you select. When you explicitly approve it, Bracket can also send a reply into that same thread on your behalf. Bracket never edits or deletes your email and never sends without your approval.",
            "Figma: read-only file access; we read file structure (pages, frames, components), comments and version history of the files you select.",
            "GitHub: we read repository metadata, README, issues and commit messages of the repositories you select.",
            "Notion: we read only pages you grant access to during Notion's own authorization, and store only the pages you select.",
            "Slack: we read only the channels/conversations you select, and — only when you explicitly approve it — post a reply as you, using permissions scoped to your own user account.",
          ]} />

          <H2>7. Security</H2>
          <UL items={[
            "Integration credentials (OAuth tokens) are encrypted at rest with dedicated keys, and never exposed to your browser or other users.",
            "All data is transmitted over TLS (HTTPS).",
            "Access to connected-source data is enforced per user and per project on our backend — no other Bracket user can see your sources or memory.",
            "Client review links are unguessable tokens that expose only the final document you choose to share.",
          ]} />

          <H2>8. Retention & deletion</H2>
          <UL items={[
            "Project content and extracted memory are retained while your account is active.",
            "Disconnecting a source immediately deletes its cached content and stops syncing; extracted memory remains on your project until you remove it.",
            "Deleting a project deletes its content.",
            "To delete your entire account and history, email support@use-bracket.com — we complete deletion within 48 hours.",
            "You may also revoke Bracket's access at any time from the provider's own security settings (Google, Figma, GitHub, Notion, Slack); Bracket connections then stop working immediately.",
          ]} />

          <H2>9. Cookies & analytics</H2>
          <P>
            We use a session cookie to keep you signed in, and first-party analytics (page views, clicks, session
            duration) to understand product usage. We do not use third-party advertising trackers.
          </P>

          <H2>10. Children</H2>
          <P>Bracket is not directed at children under 16 and we do not knowingly collect their data.</P>

          <H2>11. Changes & contact</H2>
          <P>
            We'll notify you of material changes to this policy by email or in-product notice. Questions or requests:{" "}
            <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </P>

          <div className="mt-14 pt-8 border-t border-[var(--hairline)] flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/terms" className="link-accent text-[13px]" data-testid="privacy-to-terms">Terms of Service →</Link>
            <Link to="/faq" className="link-accent text-[13px]">FAQ →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
