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
        title="Terms of Service"
        description="The terms that govern your use of Bracket, including connected work sources like Gmail, Figma, GitHub, Notion and Slack."
        path="/terms"
      />
      <section className="relative overflow-x-clip isolate">
        <HeroParticles />
        <div className="relative z-10 max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-10">
          <span className="section-label"><span className="dot" />LEGAL</span>
          <h1 className="t-display mt-6">Terms of <span className="landing-hero-gradient">Service</span></h1>
          <p className="mt-4 text-[13px] text-[var(--text-3)] font-mono uppercase tracking-[0.08em]">Last updated: August 10, 2026</p>
          <p className="mt-5 text-[14.5px] leading-[1.7] text-[var(--text-2)]">
            These terms govern your use of Bracket at use-bracket.com. By creating an account, using guest mode, or
            connecting a work source, you agree to them.
          </p>
        </div>
      </section>

      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 md:px-8 pb-24 md:pb-32">

          <H2>1. The service</H2>
          <P>
            Bracket is an AI workspace for client projects. You connect the tools where client work happens (a specific
            Gmail conversation, Slack channel, Figma file, GitHub repository or Notion page) and Bracket builds a live
            "Project Memory" — an organised record of your deliverables, scope, timelines, requirements, decisions and
            deadlines — and surfaces what needs your attention. Bracket can also draft and send client replies for you
            (with your explicit approval), and includes an optional decision flow with client review and sign-off links.
          </P>

          <H2>2. Your account</H2>
          <UL items={[
            "You must provide a valid email address and keep your account access secure.",
            "Guest mode lets you try Bracket without an account; guest projects can be claimed by signing up.",
            "You are responsible for activity under your account.",
          ]} />

          <H2>3. Connected work sources</H2>
          <P>When you connect an external source, you agree that:</P>
          <UL items={[
            "You have the right to connect that source. You are responsible for ensuring that sharing its content with Bracket doesn't violate agreements you have with clients, employers or workspace owners.",
            "Authorization happens through the provider's own sign-in (OAuth). You can revoke it anytime — from Bracket (disconnect) or from the provider's security settings.",
            "Bracket only ingests the specific sources you select, as described in our Privacy Policy.",
            "Bracket never edits or deletes anything in your connected sources. Gmail and Slack are read + send: Bracket sends a message only when you explicitly review and approve it, never on its own. Figma, GitHub and Notion are read-only.",
            "Availability of an integration depends on the provider's API. If a provider changes or restricts its API, the related Bracket features may change or stop working.",
          ]} />

          <H2>4. AI outputs</H2>
          <UL items={[
            "Bracket uses AI to extract, summarize and suggest. AI can make mistakes — extracted requirements, decisions, deadlines and answers are assistance, not professional advice.",
            "Bracket distinguishes confirmed information from detected suggestions, and you can review, confirm or dismiss any extracted item. You remain responsible for the decisions and documents you send to clients.",
            "Your content is processed by AI providers for inference only and is never used to train models.",
          ]} />

          <H2>5. Your content & ownership</H2>
          <UL items={[
            "You own your project content, connected-source data and the documents Bracket produces for you.",
            "You grant Bracket a limited license to store and process this content solely to operate the service.",
            "We may use anonymized, aggregated usage statistics (never your content) to improve Bracket.",
          ]} />

          <H2>6. Acceptable use</H2>
          <P>You agree not to:</P>
          <UL items={[
            "Connect sources you don't have the right to access, or use Bracket to obtain data about others without authorization.",
            "Reverse-engineer, scrape, overload or disrupt the service.",
            "Use Bracket for unlawful content or to infringe others' intellectual property or privacy.",
            "Resell or white-label the service without written permission.",
          ]} />

          <H2>7. Pricing</H2>
          <P>
            Bracket is currently free during early access. We will give at least 30 days' notice by email before any
            pricing change takes effect. Future paid plans will be month-to-month unless you choose otherwise.
          </P>

          <H2>8. Client review links</H2>
          <P>
            Documents you share via a review link are accessible to anyone with that link. You control what you lock
            and share; sharing is always your action, never automatic.
          </P>

          <H2>9. Termination</H2>
          <UL items={[
            "You can stop using Bracket and request full account deletion at any time (support@use-bracket.com).",
            "We may suspend accounts that violate these terms or abuse the service, with notice where practical.",
            "On termination, connected sources are disconnected and your data is deleted per our Privacy Policy.",
          ]} />

          <H2>10. Disclaimers & liability</H2>
          <P>
            Bracket is provided "as is". To the maximum extent permitted by law, we disclaim implied warranties and
            are not liable for indirect or consequential damages, lost profits, or losses arising from decisions made
            using AI outputs or from third-party provider outages. Our total liability is limited to the amounts you
            paid us in the 12 months before the claim (or $50 if you paid nothing).
          </P>

          <H2>11. Changes & contact</H2>
          <P>
            We may update these terms; material changes will be announced by email or in-product notice at least 14
            days in advance. Continued use after changes take effect constitutes acceptance. Contact:{" "}
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
