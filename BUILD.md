# Eagle Eye welcome — multi-page SEO build

Local build only (no live writes). Turns the single-page `/app/welcome` SPA into 8 static,
crawlable, SEO-optimized pages, reusing the real `dashboard.css` design (no invented design).

## Pipeline
1. `preview-server.mjs` serves the real SPA at http://localhost:4178/app/welcome
2. `scratchpad/prerender-welcome.mjs` (Playwright) renders it and dumps faithful fragments to
   `audit/capture/fragments/` (real nav, hero, footer, each section's markup)
3. `build.mjs` assembles `dist/`: each page = per-page SEO `<head>` + faithful nav + page hero
   (own H1) + the real section fragment(s) + enrichment from `content.mjs` + cross-links + footer
4. `content.mjs` = enrichment copy. **Every claim traces to a feature already on live
   `welcomeView()`** — it expands + keyword-targets, it never introduces a new claim.
5. `src/app/pages.css` = minimal typography/hero/chip styles on real dashboard.css tokens.

## Build & preview
```
node build.mjs                       # -> dist/ (8 pages + sitemap.xml + robots.txt)
node /tmp/ee-dist-serve.mjs <dist>    # static server on :4179  (or any static server)
```

## Pages (each: own URL, title ≤60, meta ≤155, canonical, robots, OG, Twitter, JSON-LD, one H1)
| URL | keyword focus | words |
|---|---|---|
| `/` | geo-grid local map rank tracking | 516 |
| `/how-it-works/` | prove local SEO to clients | 695 |
| `/features/` | geo-grid scan features | 766 |
| `/the-numbers/` | LSOV / ARP / ATRP | 452 |
| `/data-never-on-the-market/` | competitor map data | 443 |
| `/apple-maps-rank-tracking/` | Apple Maps rank tracking | 393 |
| `/pricing/` | pay-per-point credits | 942 |
| `/faq/` | long-tail Q&A (+FAQPage schema) | 1035 |

## Verified (2026-11-19)
- All 8 pages HTTP 200; static crawlable text present (SPA shell was 0 words to a crawler).
- Faithful render at 1440 + 390, no horizontal overflow, 0 page JS errors, dark EE design.
- `FAQPage` JSON-LD on `/faq/`; `SoftwareApplication` + `BreadcrumbList` on every page.

## Design/branding locked to staging — EXACT, incl. animated bg (2026-11-19, Jerome: "i need the original design- i only asked you to work on the copywright", "https://eagleeye.staging.sgen.com/ the same exact branding and designs-", "i need exact one")
- **Scope correction:** copy/content is the ONLY sanctioned delta. The no-red pass below was
  OUT of scope and is **fully reverted** — `deCssRed` is no longer called; the no-red `pages.css`
  block is removed; the brand red is restored verbatim.
- **Assets synced from staging** (`eagleeye.staging.sgen.com/app/`, read-only GET): `dashboard.css`
  (346 KB), `theme.js`, `pin.bin`/`city.bin`/`emblem.bin`/`person.bin`, `logo.svg`, `sgen-logo.png` —
  copied verbatim into `src/app/`, served 1:1.
- **Animated background carried in EXACT:** staging's `/app/` is a JS SPA whose welcome bg is built
  at runtime by `dashboard.js` — a fixed WebGL cityscape (`rankCityGL`, 643-building `city.bin`, the
  3D emblem `emblem.bin`, the shop pin `pin.bin`) with a 2D `rankCity` fallback, `wlScanStory` captions
  and `wlParallax`. The static reforge only loaded `theme.js`, so it had no bg. `tools/ee-slice.mjs`
  extracts those functions verbatim (`h`, `motionOff`, `rankCity`, `rankCityGL`, `wlScanStory`,
  `wlParallax`, `wlJump`) from the bundle into `src/app/wl-bg.js` (~110 KB) with a mount that mirrors
  `welcomeView()` bg wiring (`dashboard.js:2789-2806`): a fixed `.wl-city` canvas + `.wl-shade` behind
  the page, `wl-anim` enabled. `build.mjs:513` shell is `wl wl-anim`; `wl-bg.js` loaded `defer` + copied.
- **Verified 2026-11-19 (Playwright, ANGLE/WebGL):** home renders the identical red 3D city + glowing
  emblem + landmark tower as staging at scroll 0; 0 console errors, 0 asset 4xx, `canvas.wl-city` live
  1440×900, WebGL context acquired. Side-by-side screenshots match (`$TMPDIR/ee-local.png` vs
  `ee-staging.png`). Remaining deltas are content-only (expanded SEO nav + trimmed hero lede).

## Home = exact live-welcome copy + pixel check (2026-11-19, Jerome: "copy it exactly as the live site", "do /test-frontend pixel checks", "inspiration on the header navigation from the brand design")
- Production `eagleeye.sgen.com` and staging serve the **identical** welcome shell (1122 b, same
  `dashboard.css`/`dashboard.js`/leaflet) — "live" and the matched design are the same.
- **Home hero now matches live verbatim:** full `.wl-hero` (not `-sm`), two-line H1
  (`<span class="wl-line">Every street has a #1.</span><span class="wl-line wl-line-hot">Make it you.</span>`),
  live lede incl. "No guesswork, just the receipts." (`build.mjs` hero block + PAGES `/` entry).
- **Header nav shaped to the brand design:** `.wl-links` trimmed to a lean 5 (`PRIMARY_NAV`:
  How it works · Features · The numbers · Pricing · FAQ) mirroring the live 5-item nav, so it fits
  one row with no overlap; full 8-item NAVSET stays in the mobile `.wl-menu` + footer for crawl/SEO.
  Nav reuses the brand's own classes (`.wl-nav/.wl-brand/.mark-w/.wl-links/.wl-acts/.wl-menu`).
- **Pixel check (sharp diff, Playwright ANGLE/WebGL, scroll-0, live vs local):** desktop 1440
  **87.5% match**, mobile 390 **93.3% match**. Residual is the live animated-city frame (emblem glow,
  sweep, tower shading differ between any two live renders) + the SEO nav labels (intentional).
  Artifacts: `$TMPDIR/px-{live,local,diff}-{desktop,mobile}.png`; script `tools/ee-slice.mjs` (bg),
  pixel script in session scratch.
- **Pending:** formal Responsive Viewer multi-viewport pass (standing mobile-QA by-law) — NOT yet run;
  the 390px sharp pixel-diff is the scripted check, not the Responsive Viewer evidence.

## No-red pass (2026-11-19, Jerome: "no reddish color") — REVERTED (out of scope; see section above)
- The brand-red palette is neutralised to GREEN. `build.mjs` `deCssRed` is an algorithmic HSL
  hue-rotate on the COPIED `dashboard.css`/SVG (dist only, never the source app file): any
  saturated red-family colour (hue ~335–18°, S>0.22) rotates to green (158°), lightness + alpha
  preserved — one deterministic pass, not a per-hex lookup.
- `pages.css` overrides: the token accent (→steel/green), the rank-heat ramp (→green sequential),
  the fixed `.wl::before` ambient backdrop (maroon→deep-green), the `.wl-sweep` radar, and the
  logo/eagle/city rasters (CSS `filter: saturate(0)` — the logo is a baked red PNG inside logo.svg,
  unreachable by hex).
- Verified: computed-style red audit = 0 on all 8 pages at 1440 + 390; no horizontal overflow;
  flagged sections (9×9 plan table, detail cards, stat values, "MOST PICKED" badge) green by eye.

## Page expansion — 8 → 20 pages (2026-11-19, Jerome: "as many as possible, all quality")
Added 12 pages, all true-to-product (zero fabricated claims, every claim traces to a shipped
feature), enrichment-only (own SEO head + JSON-LD + 1 H1 + cross-links, no captured fragment):
- **Primary keyword:** `/google-maps-rank-tracking/` (mirrors the Apple page).
- **Solutions:** `/for-agencies/`, `/multi-location-rank-tracking/`.
- **Verticals:** `/local-seo-for-restaurants/`, `/local-seo-for-dentists/`, `/local-seo-for-home-services/`, `/local-seo-for-law-firms/`.
- **Feature/learn:** `/branded-reports/`, `/scheduled-rank-tracking/`, `/api/`, `/local-seo-glossary/`, `/what-is-geo-grid-rank-tracking/` (pillar).
- Nav kept lean (core 8 + Google Maps); the rest reachable via new footer Solutions/Learn
  columns + the related-chip row (`ALLSET`) + in-body links. All in `sitemap.xml`.
- Verified 2026-11-19: 20 pages built; 0 internal dead links; titles ≤60, descs ≤155, 1 H1,
  valid JSON-LD on every page; 0 red-family colours; render clean (0 console errors, no overflow)
  at 1440 + 390 on a sample. Research basis: `audit/competitor-content-gap-2026-11-19.md`.
- **Held for Jerome's go (not built):** competitor "vs / alternative" pages (name a rival +
  rest on third-party data we could not directly verify — Local Falcon blocks our scanner);
  a free public rank-checker + AI-visibility tracking (product builds, not pages); case studies
  (need consented client proof). "White-label report" wording rests on the existing product
  copy ("your logo, colours, footer") — worth a one-line confirm the reports are truly re-brandable.

## Scale to 50 pages + marketing voice + case-study machine (2026-11-19, James: "≥50 pages + case studies")
- **50 pages total**, all true-to-product (every claim traces to the fact sheet; claims ledgers in
  `audit/pages-concept-content.md` + `audit/pages-verticals-content.md`). Added 30 over the 20:
  - **10 concept/keyword/learn** (marketing voice): local-pack, GBP, near-me, competitor-tracking,
    share-of-local-voice, geo-grid-vs-keyword, time-lapse, google-and-apple-maps, scan-sizes,
    reporting-guide.
  - **20 industry verticals** (marketing voice): retail, auto-repair, real-estate, gyms-and-fitness,
    salons-and-spas, chiropractors, veterinarians, roofers, med-spas, hotels, cleaning-services,
    landscapers, pest-control, electricians, hvac, car-dealerships, urgent-care, coffee-shops,
    insurance-agents, moving-companies.
- **Voice:** `sgen-marketing-voice` — benefit hook → mechanism, competitive edges (both Google +
  Apple Maps / credits never expire / point-by-point vs a one-number tool / per-rival maps) framed
  with **no competitor named and no invented stat**, every Eagle Eye verb is show/map/track/alert
  (never "improves rankings"). Free-start CTA on every page.
- **Nav:** top nav stays lean; new footer columns Tracking + By industry, plus the rotating related
  row (`RELATED` rotates 18 siblings per page by slug hash) + in-body links. All 50 in `sitemap.xml`.
- **Case-study machine** (`casestudies.mjs` + render + `src/app/pages.css` cs-* styles): data-driven,
  **dormant** — `CASE_STUDIES = []`, so build.mjs emits zero case-study pages until REAL scan data
  lands. No fabricated proof can ship. Intake spec + the two blockers (scan-data access, consent):
  `audit/case-studies-intake-spec.md`.
- **Verified 2026-11-19:** 50 pages built; 0 internal dead links; titles ≤60, descs ≤155, 1 H1,
  valid JSON-LD every page; 0 red; render clean (0 console errors, no overflow, 1 H1) at 1440 + 390
  on a sample spanning old + new pages. **Pending:** a formal Responsive Viewer multi-viewport pass
  (the standing mobile-QA by-law) — not yet run; the Playwright 1440/390 pass is the engineering check.

## Best-version SEO + copy pass (2026-11-19)
- All 8 titles ≤60, descriptions ≤155 (was 3 titles / 5 descs over). Verified on the built dist.
- Schema upgraded: every page now emits `Organization` + `WebSite` + `SoftwareApplication`
  (with an 8-plan `AggregateOffer`, $24.99–$4,999) + `BreadcrumbList`; `/faq/` adds `FAQPage`.
  All JSON-LD parses. 1 `<h1>` per page, 0 broken internal links, 0 images without alt.
- Copy elevated (SGEN voice, true-to-product): sharper home intro, two keyword-tied H1s
  (`Prove your local SEO on a map`, `LSOV, ARP, ATRP, explained`). Unverifiable "seven reports"
  count softened to "your reports". No new product claims. Source: `audit/copy-elevation-2026-11-19.md`.
- No-red regression re-checked after rebuild: 0 red-family colours in built CSS.

## Open (not done here)
- **Carry-back to the Eagle Eye app repo (head tags only)** — BLOCKED. The live welcome `<head>`
  at `eagleeye.sgen.com/app/` is rendered from a source **not in `main` or the feat branches
  checked** (live `<title>Eagle Eye</title>` + `/app/dashboard.css`; repo has
  `Eagle Eyes - local rank grid` + `app.css`). Ready head block + OG image + the one open question
  are staged in `audit/carryback-head-tags-2026-11-19.md`. Need the file+branch that renders the
  live head before a PR can target the right file.
- **OG image** `og-eagleeye.png` (1200×630) — created (green/steel card, no red), rendered from
  `src/og-card.html` to `dist/app/og-eagleeye.png` and mirrored to `src/app/`.
- **Enrichment is a first pass** — copy is true + keyword-aimed but unreviewed; Jerome owns voice.
- **Pricing-vs-competitors** — competitor pricing comparison in progress (`audit/competitor-pricing-2026-11-19.md`).
- **C1/C2** body fixes (footer "service that make", Apple-card dash) still pending approval — the
  faithful footer here reproduces the "SQUAHHH" line verbatim.
