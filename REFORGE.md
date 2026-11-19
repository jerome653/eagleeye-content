# Eagle Eye — /app/welcome reforge

Reforged 2026-11-18 (Manila) from live https://eagleeye.sgen.com/app/welcome.

## What this page is
Public pre-login marketing landing for Eagle Eye (geo-grid rank tracking, Google + Apple Maps).
Client-side rendered: a 1,122-byte shell hydrated by `/app/dashboard.js`. Static fetch = empty
`#root` SPA mount (render-risk HIGH). The real content lives inside `dashboard.js` as hyperscript
`h(...)` template calls, not in the repo's `eagleeyes/ui/` (that folder is the signed-in console:
`app.js` / `index.html`). Live `/app/dashboard.js` + `/app/dashboard.css` are the source of truth
for the welcome page and were pulled here.

## Captured (editable base)
- `src/app/dashboard.js`  — 7,752 lines, NOT minified, readable. The whole landing.
- `src/app/dashboard.css` — 338 KB, full styles.
- `src/app/theme.js`      — theme bootstrap.
- `src/app/welcome.html`  — local shell to preview the page (loads local css/js + local fonts,
  leaflet from the live public `/vendor/leaflet/`). Serve under an `/app/welcome` path so the
  router mounts `welcomeView()` (router keys off the path, dashboard.js:401).
- `assets/fonts/` — 33 webfonts; `audit/google-fonts/fonts-local.css` serves them offline.
- 4 images, 3 stylesheets captured under `audit/`.
- Full rendered content inventory: `audit/content-inventory.json`; rendered DOM snapshot taken.

## Where the marketing copy lives — dashboard.js
`welcomeView()` = lines **2373–~2910**. Section anchors:

| Section | line | copy hook |
|---|---|---|
| Hero | 2792 | "Every street has a #1." / "Make it you." |
| How it works (7 chapters) | ~2793–2800 | interactive map story, 01–07 of 07 |
| Point at any street | 2801 | grid demo (Joe's Pizza) |
| For agencies / Prove your work | 2810 | 3-step: find gap / prove lift / report win |
| Data never on the market | 2855 | 6 differentiators |
| The numbers / The details | ~2366–2384 | coverage/depth/price tables |
| Cost calculator + plans | pricing UI | Starter→Enterprise, credit math |
| FAQ | 2885 | "Asked before you sign up" |
| Footer + SQUAHHH easter egg | 2905, 7648–7674 | |

Hero also appears at line 802 (a second render path) and the nav label at line 385.

## Scope note
site-reforge's gated clone lane does NOT fit here: it refuses a bespoke SPA with no CMS profile,
and there is no foreign platform to decontaminate (it is our own site). The reforge value here is
the local editable source + rendered reference, which is in hand. Content/marketing edits are made
in `src/app/dashboard.js` `welcomeView()`, previewed via `src/app/welcome.html`, then carried back
to the Eagle Eye repo / live build.
