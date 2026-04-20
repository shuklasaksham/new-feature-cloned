// Static content for Bracket marketing pages.

export const NAV_LINKS = [
  { to: "/how-it-works", label: "Product" },
  { to: "/use-cases", label: "Use Cases" },
  { to: "/pricing", label: "Pricing" },
  { to: "/case-studies", label: "Case Studies" },
];

export const LAYERS = [
  {
    num: "01",
    title: "Situation Framing",
    copy: "Name the reality. Not the brief. Not the pitch. The actual situation you're in.",
    bad: "Tools ask you to describe the problem clearly — before you even understand it.",
    good: "Bracket mirrors patterns, surfaces tensions, and tells you what you're actually dealing with.",
  },
  {
    num: "02",
    title: "Context Compression",
    copy: "Less context. Better judgement. Strip the noise. Keep what changes the decision.",
    bad: "Tools ask for long descriptions, background, inspirations — more input, more generic.",
    good: "Bracket asks only what shifts the answer. The rest is discarded on purpose.",
  },
  {
    num: "03",
    title: "Decision Engine",
    copy: "Decisions before deliverables. Risk, leverage, clarity — weighed. A stance, not a menu.",
    bad: "Tools suggest options without trade-offs. You pick blind.",
    good: "Bracket takes a position. Tells you why. Tells you what breaks if you're wrong.",
  },
];

export const WALKTHROUGH = [
  {
    num: "01",
    label: "SITUATION FRAMING",
    title: "Name what's really happening",
    what: "Bracket mirrors common client patterns and surfaces the tensions you already feel.",
    why: "Because clarity starts with naming reality — not writing a brief.",
    quote: "\"Clarity starts with naming reality.\"",
  },
  {
    num: "02",
    label: "CONTEXT COMPRESSION",
    title: "Keep only what matters",
    what: "Asks the 3–4 questions that actually change the answer. Ignores everything else.",
    why: "Because more input makes worse decisions. Signal beats surface area.",
    quote: "\"Less context. Better judgement.\"",
  },
  {
    num: "03",
    label: "DECISION ENGINE",
    title: "Take a stance",
    what: "Weighs risk, leverage, and clarity — then recommends with alternatives and trade-offs.",
    why: "Because a menu isn't a decision. You need someone to say what they'd do.",
    quote: "\"Decisions before deliverables.\"",
  },
  {
    num: "04",
    label: "ARTIFACTS",
    title: "Outputs with intent",
    what: "Scope doc, client message, assumptions, risk flags — all reflecting your stance.",
    why: "Because generic templates don't protect boundaries. Positioned ones do.",
    quote: "\"Output with intent.\"",
  },
  {
    num: "05",
    label: "CONFIDENCE LOCK-IN",
    title: "Prepare for the pushback",
    what: "Simulates likely reactions and drafts your response before the awkward follow-up.",
    why: "Because confidence is knowing you're prepared — not pretending you are.",
    quote: "\"Confidence is knowing you're prepared.\"",
  },
];

export const USE_CASES = [
  {
    who: "Freelancers",
    pain: "Scope creep, silent requests, pricing anxiety",
    win: "Clarity + confidence before you reply",
    example: "\"Can you just add one more revision?\" → Bracket gives you the exact boundary and the exact words.",
  },
  {
    who: "Agencies",
    pain: "Junior designers making inconsistent calls",
    win: "Shared decision systems, consistent output",
    example: "Every designer on every project reasons the same way. Not the same taste — the same rigour.",
  },
  {
    who: "Product Designers",
    pain: "PM pressure, unclear asks, shifting priorities",
    win: "Structured thinking that survives stakeholders",
    example: "You bring a decision, not a draft. The conversation changes.",
  },
  {
    who: "Junior Designers",
    pain: "Don't know what to prioritise or how to push back",
    win: "A senior designer sitting next to you, every project",
    example: "Before you send the file, Bracket tells you what's missing. Before you lose the argument, Bracket shows you the counter.",
  },
];

export const ARTIFACTS_SAMPLES = [
  {
    kind: "SCOPE_DOC",
    title: "Landing page redesign · Tello",
    body: [
      "IN SCOPE — Hero, 4 content sections, mobile breakpoint, component handoff.",
      "OUT OF SCOPE — Illustrations, copywriting, animation polish (phase 2).",
      "DELIVERABLES — Figma file, Loom walkthrough, 1 revision round.",
      "TIMELINE — 2 weeks. One sync per week. No Slack debates on file structure.",
    ],
  },
  {
    kind: "CLIENT_MESSAGE",
    title: "Reply to 'can we reduce the price?'",
    body: [
      "Appreciate you being direct. Short answer: the scope is what protects the price.",
      "If budget is the real constraint, I'd rather trim what we do than trim what I charge for it.",
      "Two options: drop the mobile breakpoint to phase 2, or cut the illustration pass. Both get us to your number. Happy to jump on 15 mins to decide which.",
    ],
  },
  {
    kind: "RISK_FLAGS",
    title: "Flags on current direction",
    body: [
      "HIGH · Stakeholder list unclear — decisions will be re-opened.",
      "MEDIUM · No success metric — subjective review likely.",
      "LOW · Timeline assumes copy is final. It never is.",
    ],
  },
  {
    kind: "ASSUMPTIONS",
    title: "What I'm assuming to be true",
    body: [
      "Brand system is locked. No exploration of new type or palette.",
      "Developer is in place. I'm not responsible for handoff translation.",
      "One primary reviewer. Not a committee.",
    ],
  },
];

export const PRICING = {
  currencies: {
    INR: { symbol: "₹", free: 0, pro: 1499, studio: 4999 },
    USD: { symbol: "$", free: 0, pro: 19, studio: 59 },
  },
  tiers: [
    {
      id: "free",
      name: "FREE",
      tagline: "For trying the thinking.",
      features: [
        "3 projects, total",
        "Situation Framing + Decision step",
        "View-only artifacts",
        "No export",
      ],
      cta: "Start free",
    },
    {
      id: "pro",
      name: "PRO",
      tagline: "For designers running real work.",
      badge: "POPULAR",
      features: [
        "Unlimited projects",
        "Full artifact generation & export",
        "Revision tracking",
        "Risk flags & assumptions",
        "Templates library",
      ],
      cta: "Go Pro",
    },
    {
      id: "studio",
      name: "STUDIO",
      tagline: "For teams who decide together.",
      features: [
        "Everything in Pro",
        "Team workspace & roles",
        "Shared decision systems",
        "Version history",
        "Client-facing outputs",
      ],
      cta: "Talk to us",
    },
  ],
};

export const CASE_STUDIES = [
  {
    slug: "verizon-tello",
    brand: "Tello × Verizon",
    role: "Independent UX consultant",
    before: [
      "5 stakeholders, 3 opinions per meeting",
      "Scope shifted twice a week",
      "Designer felt like a decorator, not a decision-maker",
    ],
    after: [
      "Situation reframed — real problem was merchandising, not layout",
      "Trade-offs documented before the first Figma frame",
      "Client-facing scope doc survived 4 reviews untouched",
    ],
    quote: "I didn't start making better design. I started making better decisions. The design followed.",
  },
  {
    slug: "agency-rebrand",
    brand: "Brand design agency · 9 designers",
    role: "Agency ops",
    before: [
      "Juniors deferred every call to the founder",
      "Client messages written 4 different ways",
      "Revision rounds bled into each other",
    ],
    after: [
      "Decision system shared across the team",
      "Consistent client language without a template",
      "Scope locked before work starts. Revisions counted.",
    ],
    quote: "Juniors stopped pinging me at 11pm. They had the framework. They made the call.",
  },
];

export const WORK_TYPES = [
  { id: "freelance", label: "Freelance", copy: "Solo. Client-facing. Every decision is mine." },
  { id: "agency", label: "Agency", copy: "In a team. Juggling clients, juniors, and founders." },
  { id: "in-house", label: "In-house / Product", copy: "Embedded. PMs, engineers, stakeholders." },
];

export const STRUGGLES = [
  { id: "scope", label: "Scope creep", copy: "Work keeps expanding. I can't stop nodding." },
  { id: "client-clarity", label: "Client clarity", copy: "They ask vague things. I guess what they mean." },
  { id: "decision-making", label: "Decision-making", copy: "I can execute. I just don't know what to decide." },
];
