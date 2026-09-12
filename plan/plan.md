# Figma rate-limit error — why it happens and how to stop it

## The error
Users see: *"Figma is temporarily limiting requests on their side (API rate limit).
It clears on its own — wait about a minute and try again."*

## Why users are getting it (the cause)
Figma caps how many times any app can read a file through its API, and the cap is
low and depends on the *Figma* plan/seat of the person (or file), not on Bracket:

- On the restrictive tiers — a viewer/collaborator seat, or **any file that lives in
  a Free/Starter Figma workspace** — the limit is only **5 requests per minute**.
  Figma applies the *file's* plan, so even a paid user connecting a file that sits in
  a free workspace gets throttled to 5/min.
- Every time Bracket reads a Figma file today it spends about **3 requests** (file
  contents + comments + version history). So two automatic refreshes plus one manual
  "Add file" in the same minute already blows past 5, and Figma returns the error.
- When Figma throttles, it tells us exactly how long to wait (seconds to, in bad
  cases, much longer). Bracket doesn't currently read that "wait" value, so it can
  retry too soon and can't tell the user the real wait time.

Bottom line: this is a Figma-side limit we cannot raise. The fix is to make Bracket
use Figma far more sparingly, wait exactly as long as Figma asks, and recover on its
own instead of showing an error the user has to act on.

## What is proposed

**1. Use Figma much less (so the limit is rarely reached).**
   - Read the full file only once when it's first connected; after that, routine
     syncs fetch **just the comments** (the thing that actually changes), roughly
     halving or better the requests per sync.
   - Keep syncs spaced out and never let Bracket make more than a couple of Figma
     requests per minute for a given account, even across multiple projects.

**2. Recover gracefully when Figma does throttle.**
   - Read Figma's "wait this long" signal and pause that connection for exactly that
     long, then resume automatically — no user action needed.
   - Background syncs that hit the limit stay silent (the source keeps its normal
     "synced" state and quietly catches up), instead of surfacing an error.

**3. Make a manual "Add file" that gets throttled succeed on its own.**
   - If adding a file hits the limit, Bracket keeps the file and finishes connecting
     it automatically once Figma's wait period passes, showing a calm "connecting,
     this can take a minute" state rather than a red error the user must retry.
   - Decision needed: is it acceptable that a throttled "Add" completes a short while
     later on its own, rather than instantly? (Assumed **yes** below.)

**4. Optional upgrade — realtime with no polling (Figma webhooks).**
   - Figma can *push* a notification to Bracket the moment a comment is added, which
     removes comment-polling from the rate-limit picture entirely and makes comment
     capture effectively realtime.
   - Prerequisites set by Figma: this requires the connected Figma workspace to be on
     a **Professional plan or higher**, and the connecting account to have edit access
     to the file/team so the notification can be registered. It does not work for
     files in Free/Starter workspaces.
   - Because many clients/freelancers are on Free/Starter, this is proposed as an
     opt-in enhancement layered *on top of* items 1–3 (which still cover everyone),
     not a replacement. Decision needed: pursue webhooks now, later, or skip.

## Decisions for you
1. Comment freshness expectation:
   - **Fine if new Figma comments appear within a few minutes (Recommended)** — items
     1–3 fully cover this and require nothing from users.
   - Must be near-instant for everyone — only Figma webhooks (item 4) achieve that, and
     only for users on Figma Professional+.
2. Throttled "Add file" behaviour: **auto-complete shortly after (Recommended)** vs.
   keep asking the user to click retry.
3. Figma webhooks (item 4): **defer as an optional later add-on (Recommended)** vs.
   build now (only benefits Professional+ Figma users).

## Assumptions (chosen unless you push back)
- Build items 1–3 now; treat webhooks (item 4) as a later, opt-in enhancement.
- "Within a few minutes" is acceptable freshness for Figma comments.
- A throttled manual add should finish automatically rather than error out.

## Out of scope / cannot change
- Figma's own per-minute limits (especially the 5/min cap on free-workspace files and
  viewer seats). We can only stay under them and wait them out gracefully.
- Bracket will not, and cannot, "unlock" a user's Figma limit; heavy users on free
  Figma workspaces may still occasionally wait — but it will self-recover silently.
