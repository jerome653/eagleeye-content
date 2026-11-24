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

## Design source
The look is the Eagle Eye app's own welcome page (`eagleeyes/ui/app` in the app repo — a
reference only, never edited from here). `src/app/dashboard.css` is copied verbatim from the app;
to pick up a later app design change run
`node tools/sync-reference.mjs "<app repo>/eagleeyes/ui/app"` (copies the CSS, extracts the icon
table to `src/icons.json`; reads the app, never writes it) and rebuild.
`design.mjs` holds the welcome page's components as static HTML (product shot, scroll-pinned
showcase carousel, step cards, figure cards, card grids, prose beside a picture panel) and the
welcome sections the product pages carry (how, showcase, details, numbers, exclusive, cost, plans, faq).
`src/app/site.css` styles only what these content pages add (pillar dropdowns, prose, hub cards,
comparison tables, breadcrumbs); `src/app/site.js` is the welcome page's behaviour (bar,
dropdowns, glow, reveal); `src/app/wl-bg.js` is its WebGL city backdrop. Content, URLs and
per-page SEO come from `build.mjs` / `content.mjs` / `faqs.mjs` / `compare.mjs`.

## The experience (every page but home)
Each page opens with a scroll story (`design.mjs` `fxStory`, driven by `src/app/wl-obj.js`, played
as a three.js world with bloom by `src/app/world.js` — the app's feature-world kit; three.js is
synced from the app into `src/app/vendor/three`): a
pinned, letterboxed scene in which the page's own Blender model builds in four chapters taken
from the page's own copy (`chaptersFrom`), the camera dollying, swinging and craning, the city
flying behind. Every page has its own model — 119 in `src/app/obj/`, built from code by
`tools/blender/make_objects.py` (run it in Blender; trade shops carry their trade's emblem,
trade-in-metro pages add the metro's landmark). Which page gets which is `OBJBYSLUG` / `OBJFOR`
in `build.mjs`; the build stops if two pages would share a model.

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
