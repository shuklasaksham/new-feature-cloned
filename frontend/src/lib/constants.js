// Static content for Bracket marketing pages.

export const NAV_LINKS = [
  { to: "/how-it-works", label: "Product" },
  { to: "/use-cases", label: "Use Cases" },
  { to: "/pricing", label: "Pricing" },
  { to: "/case-studies", label: "Case Studies" },
  { to: "/faq", label: "FAQ" },
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
    label: "Situation framing",
    title: "Name what's really happening",
    what: "Bracket mirrors common client patterns and surfaces the tensions you already feel.",
    why: "Because clarity starts with naming reality — not writing a brief.",
    quote: "\"Clarity starts with naming reality.\"",
  },
  {
    num: "02",
    label: "Context compression",
    title: "Keep only what matters",
    what: "Asks the 3–4 questions that actually change the answer. Ignores everything else.",
    why: "Because more input makes worse decisions. Signal beats surface area.",
    quote: "\"Less context. Better judgement.\"",
  },
  {
    num: "03",
    label: "Decision engine",
    title: "Take a stance",
    what: "Weighs risk, leverage, and clarity — then recommends with alternatives and trade-offs.",
    why: "Because a menu isn't a decision. You need someone to say what they'd do.",
    quote: "\"Decisions before deliverables.\"",
  },
  {
    num: "04",
    label: "Artifacts",
    title: "Outputs with intent",
    what: "Scope doc, client message, assumptions, risk flags — all reflecting your stance.",
    why: "Because generic templates don't protect boundaries. Positioned ones do.",
    quote: "\"Output with intent.\"",
  },
  {
    num: "05",
    label: "Confidence lock-in",
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
    who: "Independent Designers",
    pain: "Subjective feedback, vague briefs, decisions that come back to haunt you",
    win: "Decisions you can defend, in writing, with a stance",
    example: "You stop debating taste. You start defending choices. Stakeholders feel the shift in week one.",
  },
  {
    who: "Indie Creatives (writers, photo, video, illustration, dev)",
    pain: "Every project starts at zero. No framework. Every quote feels like a guess.",
    win: "A repeatable thinking shape that fits ANY discipline",
    example: "Writer pricing a brand voice doc? Photographer scoping a campaign? Bracket handles it the same way — frame, decide, ship.",
  },
  {
    who: "Small Agencies & Studios",
    pain: "Junior team-mates making inconsistent calls",
    win: "Shared decision systems, consistent output",
    example: "Every freelancer on every project reasons the same way. Not the same taste — the same rigour.",
  },
  {
    who: "In-house Product Designers",
    pain: "PM pressure, unclear asks, shifting priorities",
    win: "Structured thinking that survives stakeholders",
    example: "You bring a decision, not a draft. The conversation changes.",
  },
  {
    who: "Juniors levelling up",
    pain: "Don't know what to prioritise or how to push back",
    win: "A senior peer sitting next to you, every project",
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
      tagline: "For designers + freelancers running real work.",
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
    slug: "linear",
    brand: "Linear",
    category: "Developer productivity · Issue tracking",
    before: [
      "The category was owned by Jira — bloated, opinion-less, configurable to death",
      "Every team drowning in fields, views, and custom workflows",
      "Speed was treated as a performance problem, not a design problem",
    ],
    after: [
      "Decided: speed IS the product. Everything else bends to it",
      "Removed configurability that didn't serve the 80% case",
      "Keyboard-first, opinionated defaults, ruthless visual restraint",
    ],
    quote: "Linear didn't win by adding features. It won by deciding which ones to refuse.",
  },
  {
    slug: "figma",
    brand: "Figma",
    category: "Design tools · Collaboration",
    before: [
      "Sketch on Mac, Photoshop for pixels, Invision for hand-off — designers stitched together five tools",
      "Everyone agreed design→dev was broken. No one had a unified stance",
      "The obvious play was a better Sketch. Faster. Prettier.",
    ],
    after: [
      "Decided: move it all to the browser. Multiplayer by default, not as a feature",
      "Chose WebGL and the pain of inventing its own rendering layer",
      "Made the file the source of truth — for designers, devs, PMs, everyone",
    ],
    quote: "The best product decision in design software this decade wasn't a feature. It was a posture.",
  },
  {
    slug: "notion",
    brand: "Notion",
    category: "Productivity · Knowledge",
    before: [
      "Every team owned Docs, Drive, Confluence, Trello, Evernote, and a wiki graveyard",
      "Founders pitched \"one tool to replace them all\" — most ended up being none",
      "Flexibility usually means shallow. Opinion usually means rigid. Can't have both.",
    ],
    after: [
      "Decided blocks were the atom — and everything else (pages, databases, dashboards) was arrangement",
      "Turned the onboarding page itself into a marketing surface",
      "Chose community templates over in-house tutorials — users taught users",
    ],
    quote: "Notion sold the same feature set as its competitors. What it actually sold was the decision to stop using them all.",
  },
  {
    slug: "duolingo",
    brand: "Duolingo",
    category: "Consumer · Education",
    before: [
      "\"Serious edtech\" flopped again and again: Rosetta Stone, Pimsleur, textbooks on iPad",
      "Retention was catastrophic — adults dropped off in weeks",
      "The category equated rigour with discomfort",
    ],
    after: [
      "Decided gamification wasn't a layer — it was the product",
      "Owl-led push notifications, streak anxiety, leagues, hearts — choices that sounded unserious, worked brutally well",
      "Made the product slightly embarrassing to talk about. Billions of daily sessions later, nobody's embarrassed.",
    ],
    quote: "Duolingo's engineers built the learning engine. Duolingo's designers decided it should feel like a game, not a class.",
  },
  {
    slug: "arc",
    brand: "Arc Browser (The Browser Company)",
    category: "Consumer · Browser",
    before: [
      "Every \"Chrome alternative\" in a decade had died — Opera, Brave, Vivaldi, etc.",
      "Users didn't want a browser. They wanted tabs to stop ruining their day",
      "Incremental UI tweaks would not unseat Chrome",
    ],
    after: [
      "Decided to rebuild the browser around Spaces and Members — not tabs and bookmarks",
      "Moved the address bar to the sidebar. Broke a 20-year convention, on purpose",
      "Every aesthetic choice was positioned: \"the browser for creative people who refuse Chrome's chrome\"",
    ],
    quote: "Arc wasn't a better browser. It was a better decision about what a browser is for.",
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
