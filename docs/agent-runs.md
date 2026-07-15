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
