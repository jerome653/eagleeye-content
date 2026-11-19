# Eagle Eye — Local SEO content site

Fifty static, crawlable SEO pages for Eagle Eye (geo-grid local rank tracking for Google &
Apple Maps). The design, branding and animated WebGL city backdrop are a faithful copy of the
live Eagle Eye welcome; the copy is original, true-to-product, and built to rank.

## What's here
- `dist/` — the built site: 50 pages + `sitemap.xml` + `robots.txt`, self-contained.
- `build.mjs` — the static generator (per-page SEO head + JSON-LD + nav/footer/related + body).
- `content.mjs`, `casestudies.mjs` — enrichment copy and the (dormant) case-study machine.
- `src/app/` — shipped front-end assets (brand CSS, the extracted WebGL backdrop `wl-bg.js`,
  logo, geometry `.bin`, OG card).
- `src/og-card.html`, `tools/` — the OG image source and the backdrop-extraction tool.

## Build
```
node build.mjs      # -> dist/ (50 pages + sitemap.xml + robots.txt)
```

## SEO state
Every page: title <=60, description <=155, canonical, OpenGraph + Twitter card, exactly one H1,
`Organization` + `WebSite` + `SoftwareApplication` (+ `AggregateOffer`) + `BreadcrumbList` JSON-LD;
`/faq/` adds `FAQPage`. All 50 in `sitemap.xml`. Internal linking via nav + footer + related rows.

`robots.txt` and the page `robots` meta are `noindex` on purpose — this is a pre-launch build.
Flip to index/allow at launch.
