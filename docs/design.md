# Keeper — design language

> Seeded from `docs/keeper-v2-spec.md` §8 during M1. This is the living reference; the spec is the rationale.

## Identity

**A family almanac.** The tone of a Farmers' Almanac page married to a well-kept notebook: seasonal, calm, factual, warm. Not clinical (it is not a hospital app), not playful-startup (it is not a habit tracker).

## Tells we refuse

No violet/indigo gradients · no glassmorphism/blur · no emoji-as-iconography · no centered-hero marketing layouts · no uniform-radius-on-everything · no slate-with-indigo dark mode · no "✨ AI" ceremony — suggestions read as almanac entries, not magic.

## Palette (subject-anchored: evergreen, parchment, clay)

Tokens live in `src/app/globals.css` as Tailwind v4 oklch variables. Semantic names are stable; only values changed from the v1 teal.

| Token | Meaning | Rule |
|---|---|---|
| `--background` | warm parchment (charcoal in dark) | ground |
| `--foreground` | ink | text |
| `--primary` | evergreen | actions, active nav, chrome |
| `--accent-urgent` | clay | overdue / urgent **only** |
| `--accent-suggest` | ochre | suggestion surfaces **only** (M2) |
| member colors | moss · clay · ochre · plum · slate · pine | identity (`User.color`; v1 names alias in `constants.ts`) |

**One accent per screen.** Today may show clay (overdue) and ochre (suggestions) blocks, but chrome stays evergreen/neutral. Every color encodes meaning; decorative color is banned.

## Typography (system stacks only — no web-font RTT on a phone)

- **Serif** (`Charter, "Iowan Old Style", Georgia, serif`) — content voice: screen titles (`h1`/`h2`), date headings, KPI numerals, and the almanac reason lines (italic, `.almanac-line`).
- **Sans** (system) — everything interactive.
- **Mono** (`ui-monospace`) — doses, member/insurance IDs: anything copy/pasted or read aloud to a nurse.
- Tabular numerals globally. Dates render like an almanac ("Oct 15"), never ISO strings in UI (`formatAlmanacDate` in `constants.ts`).

## The memorable move: the almanac line

Every suggestion and every engine-generated task carries a one-line **italic-serif reason with a date anchor** (`.almanac-line`). This single device carries the product's intelligence and is unmistakably not a generic AI card. (The season glyph + full suggestion surfaces arrive with the M2 engine.)

## Structure & components

- One structural device: **hairline rules** between list rows (`.notebook-list`) — notebook lines, not nested card-shadow-on-card.
- Cards keep a single soft radius (`--radius` 0.625rem); **no shadows** except the FAB and open sheets.
- Primitives stay Radix + `src/components/ui/*` — visual restyle only, no component-library churn.
- Icons: lucide at 1.5px stroke, sparse.
- Voice: concrete and unceremonious — "3 due today," never "You've got this! 💪".

## Status

Applied in M1: palette, typography tokens, almanac-line + notebook-list utilities, four-tab IA, member-color recalibration. Deferred: season glyphs and suggestion/ochre surfaces (M2); full dark-mode audit and PWA polish (M4).
