# Agent Runs — token use & result-quality log

Standing practice (see `CLAUDE.md` → Working with AI Agents): every session that uses
subagents, research fan-outs, or workflows appends an entry here — purpose, tokens, tool
uses, duration, result quality, and a token-efficiency verdict including the cheaper route
that would have been as accurate. The point is cross-session evaluation: learn which agent
shapes earn their tokens and which should have been a single search or a grep.

Entry template:

```
## YYYY-MM-DD — <session purpose>
| Agent | Purpose | Tokens | Tool uses | Wall time | Verdict |
Quality: <per-agent, what the output was used for, follow-ups needed>
Efficiency: <tokens vs. alternative route; what to repeat / change>
```

---

## 2026-07-14 — Keeper v2 product & implementation spec

**Session shape:** main loop explored the codebase and wrote the ~1,180-line spec
(`docs/keeper-v2-spec.md`); three general-purpose research agents ran **in parallel in the
background** during exploration/drafting. All three returned dense structured briefs that
were consumed directly — zero follow-up messages to any agent.

| Agent | Purpose | Tokens | Tool uses | Wall time | Verdict |
|---|---|---:|---:|---:|---|
| Competitive landscape | 2026 caregiving-app market scan; verify the care-coordination × predictive-seasonal gap | 101,834 | 44 | 6.1 min | Excellent |
| Infra free-tier facts | Verify July-2026 hosting/auth/email/push/SMS/iOS facts for the $0 stack decision | 100,190 | 29 | 4.1 min | Outstanding — highest decision-density |
| Elder seasonal domain | Sourced cadence catalog (CDC/Medicare/NFPA/AAA/extension services) to seed the engine | 92,311 | 30 | 5.8 min | Excellent |
| **Total** | | **~294k** | **103** | **~6 min** (parallel) | |

**Result quality**

- *Competitive:* verified alive/dead status of all 8 previously-known apps (CareZone and
  Centriq dead with user-data deletion; Carely pivoted), surfaced 2026 entrants (CircleCare,
  TendTo, ElderNest, TidyBoss), and confirmed the core market gap with negative-search
  evidence. Became spec §3 nearly verbatim.
- *Infra:* answered 10/10 questions with source URLs and honored the "mark UNVERIFIED"
  instruction. **Changed three decisions**: Better Auth over maintenance-mode Auth.js;
  SMS killed (A2P 10DLC applies to individuals); iOS path corrected (remote-URL Capacitor
  wrappers now rejected under Guideline 4.2). Also enabled the $0 stack call (pg_cron on
  Supabase free tier). Cheapest of the three and the most consequential.
- *Domain catalog:* 26 sourced cadence families; its trigger-type taxonomy was adopted
  almost wholesale into the schema (`TriggerType` enum) and the ~52-template Appendix A.
  Good verification behavior: flagged Medicare.gov/CDC 403 blocks and cross-confirmed the
  enrollment dates via CMS/Medicare Rights Center instead of guessing.

**Token efficiency**

- ~294k subagent tokens bought ~100 searches/fetches whose raw noise never touched the
  main context — the main loop consumed three ~2k-word briefs and stayed coherent for a
  long single-document write. For a foundational spec, clearly worth it.
- What made the outputs directly usable (repeat this): each prompt specified an **output
  contract** — dense structured markdown, word cap, per-fact source URLs, "label
  speculation/UNVERIFIED", explicit question list. No re-prompting occurred.
- Balanced scoping (92–102k each) and parallel launch meant ~6 min wall for ~16 min of
  serial work.
- Cheaper-route check: none replaceable by grep (external web research). Marginal fat:
  the competitive agent's 44 tool uses included some low-value deep-dives (B2B tier);
  a "top 6 apps only, one fetch each" cap would have saved ~20–30%. The infra brief
  could have skipped 2–3 questions answerable from training, but date-sensitive
  verification was the point — acceptable.
- Calibration for future sessions: ~100k-token research agents are the right size for
  *decision-heavy, multi-question* research. For one-fact lookups, a single inline
  WebSearch is the correct tool — don't spawn an agent for it.

**Other session learnings**

- Long-document pattern that worked: write the skeleton with HTML-comment anchors
  (`<!-- SPEC-CONTINUES-SECTION-N -->`), then fill sections via targeted `Edit` replacements
  as background research lands. Avoids one giant fragile write and lets drafting overlap
  with research.

---

## 2026-07-15 — `/code-review` of PR #1 (M0 foundations diff)

**Session shape:** ran `/code-review` at its default "high effort" preset against the full
PR #1 diff (42 files, ~4,810 insertions / 1,030 deletions — Better Auth migration, circle
tenancy, invite flow, Prisma schema/migrations, CI). The preset's 8-finder-angle fan-out
launched all 8 in parallel with no size-down. User interrupted mid-run: *"This is wayyy too
many agents holy shit... 8 agents at 100K tokens each and climbing is way overkill."*

| Agent | Purpose | Tokens | Tool uses | Wall time | Verdict |
|---|---|---:|---:|---:|---|
| Correctness (angle A) | Line-by-line diff scan | 153,887 | 25 | 6.2 min | Good — 3 real findings (open redirect, missing catch, baseURL fallback) |
| Removed-behavior (angle B) | What invariants got dropped | 135,247 | 19 | 4.8 min | Good — 3 real findings incl. the notification-migration bug |
| Cross-file tracer (angle C) | Callers of changed exports | 145,346 | 44 | 6.9 min | Good — found the unhandled-throw regression in task-card.tsx |
| Reuse | Duplicated logic | 118,779 | 15 | 3.0 min | Redundant — rediscovered the same requireCircleContext/session-guard duplication as Altitude and Efficiency |
| Simplification | Unneeded complexity | 95,043 | 18 | 2.1 min | Low value — minor type/duplication nits, nothing acted on |
| Efficiency | Wasted work | 106,345 | 14 | 2.2 min | Useful — surfaced the double requireCircleContext() call (layout + page), acted on |
| Altitude | Shallow fixes / special cases | 125,371 | 15 | 3.1 min | Redundant — same duplication theme as Reuse, plus one real migration-hardcoding note (not acted on) |
| Conventions (CLAUDE.md) | Rule violations | 118,584 | 14 | 2.2 min | Good — 1 real finding (circle.ts has zero tests), the one thing this angle exists for |
| **Total** | | **~998,600** | **164** | **~7 min** (parallel) | |

**Result quality**

Of 10 findings actually acted on (open redirect, notification-migration backfill, createCircle
race + new DB constraint, task-card.tsx unhandled throws, missing error boundaries + invite
membership check, zero test coverage on circle.ts, sign-out swallowed failure, auth.ts baseURL
fallback, redundant per-page auth lookup), every one traces back to angles A, B, C, Efficiency,
or Conventions. **Reuse and Altitude's 11 combined findings mostly re-described the same
"session+membership guard duplicated across layout/pages/routes" root cause already caught by
Efficiency** — real convergent validation, but 3 angles paying full price (~350K tokens) to
say the same thing once. Simplification's 6 findings (duplicate zod schemas, useState sprawl,
try/catch boilerplate) were legitimate but low-stakes; none were acted on this pass.

**Token efficiency — this run was oversized, and it was a repeat of a documented mistake**

- `~/Projects/coding-best-practices/PROMPTING.md` already logs the *identical* failure mode
  from a prior session: an 8-angle review on an 11-file diff cost ~980K tokens across 14 calls
  with 3 of 8 angles rediscovering the same two bugs. That guidance existed but had never been
  pulled into Keeper's own `CLAUDE.md`, so it wasn't applied here — now fixed (see
  `CLAUDE.md` → "Working with AI Agents").
- Even accounting for PR #1 being a genuinely large diff (unlike the 11-file case), a leaner
  4-angle run — correctness, removed-behavior, cross-file/auth, conventions — would very
  likely have caught the same 10 real findings for ~450–550K tokens instead of ~1M, since
  those are exactly the 4 angles every acted-on finding came from.
- **What to repeat:** skipping the skill's separate 1-vote-per-finding verify-agent pass and
  instead spot-checking the top 2 highest-severity findings by reading the flagged code
  directly. Both confirmed as real bugs at near-zero marginal cost, versus spinning up ~10
  more verify agents.
- **What to change next time:** before invoking `/code-review` at "high" or above, size the
  angle count to the diff explicitly (2–4 angles unless the change is architectural and
  touches auth/money/data-loss across many files) rather than accepting the preset's flat
  default. Cap fan-out width at 2–3 *concurrent* launches regardless of total angle count —
  launching all 8 simultaneously was itself the thing that read as "out of control" even
  before token cost entered into it.
