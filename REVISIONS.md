# Eagle Eye /app/welcome — content optimization & revisions

Session 2026-11-19 (Manila). Preview: `node preview-server.mjs` → http://localhost:4178/app/welcome

## 1. SEO surface — DONE on the preview shell (`src/app/welcome.html`)

Measured gap on live (capture 2026-11-18, `audit/seo-inventory.json`): title "Eagle Eye"
(9 chars), **empty** meta description, no canonical, no robots, no OpenGraph, no Twitter card,
no JSON-LD, 0 crawlable H1 (SPA — real content only exists after `dashboard.js` hydrates `#root`).

Applied to the local shell head + a richer `<noscript>` fallback (hero H1 + lede + CTA, grounded
in the page's own copy). Exact tags added:

- `<title>` → `Eagle Eye — Geo-Grid Rank Tracking for Google & Apple Maps` (60 chars)
- `<meta name="description">` (150 chars, under the ≤155 gate)
- `<link rel="canonical">` → `https://eagleeye.sgen.com/app/welcome`
- `<meta name="robots" content="index,follow">`
- OpenGraph: type / site_name / url / title / description / image
- Twitter: `summary_large_image` + title / description / image
- JSON-LD `SoftwareApplication` (name, category, OS=Web, url, description, Offer $24.99 = Starter/mo from `billing.py` SEED_PLANS)
- `<noscript>` → H1 "Every street has a #1. Make it you." + lede + signup/login links

### CARRY-BACK to the Eagle Eye app repo (this is the real deliverable for live)
The live shell is the ~1,122-byte template the app serves (NOT this preview file). To ship, add the
same head tags to that template's `<head>` for the `/app/welcome` route. Two open items:

1. **OG image asset** — tags reference `https://eagleeye.sgen.com/app/og-eagleeye.png`, which does
   **not exist yet**. Needs a 1200×630 PNG (hero: "Every street has a #1. Make it you." on the dark
   grid). Until it exists, social unfurls have no image. Flagged, not fabricated.
2. **`robots: index,follow` is a live-surface directive** — confirm the welcome page is meant to be
   indexed (it's the public pre-login landing, so yes expected) before it ships.

## 2. Body copy (`dashboard.js` `welcomeView()`, 2373–2905) — candidates, NOT applied

The marketing copy is already tight and fact-grounded (guide files + `billing.py`). No wholesale
rewrite warranted. Two genuine line-level items for your call (copy direction is yours):

- **C1 — footer easter egg, line 2905:** "Kind of service that make you **SQUAHHH!**" reads as a
  grammar slip ("service that make"). Fix → "The kind of service that makes you SQUAHHH!" *(keep the
  yell).* May be an intentional broken-English brand joke — your call.
- **C2 — Apple Maps showcase card, line 2501:** "…searched on Apple Maps **-** run a business on
  both…" uses a spaced hyphen as a dash. Consistency: em dash, or recast to two sentences.

Everything else (hero, 3-step prove-your-work, "data never on the market", calculator receipt, plans,
FAQ) reads clean — no changes proposed.
