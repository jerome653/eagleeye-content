// Eagle Eye welcome — multi-page static build.
// Splits the real rendered /app/welcome into one page per section (SEO: own URL, title,
// meta, H1, JSON-LD, cross-links), reusing the captured design (dashboard.css + wl-* classes
// + real section markup from audit/capture/fragments). No invented design, no new claims.
// Phase 1 = structural split from REAL content. Enrichment copy is layered in CONTENT below.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from './design.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CAP = join(ROOT, 'audit/capture');
const FRG = join(CAP, 'fragments');
const DIST = join(ROOT, 'dist');
const ORIGIN = 'https://eagleeye.sgen.com';
const APP = ORIGIN + '/app';           // real app (signup/login) stays on /app
const OGIMG = ORIGIN + '/app/og-eagleeye.png';
// Asset cache-bust: GitHub Pages serves /app/*.css with max-age=600, so a CSS fix can
// show stale on an edge for up to 10 min. Version the stylesheet URL off the pages.css
// content hash — a change mints a new URL the CDN has never cached, so the fix is instant.
const ASSETVER = createHash('sha1').update(['dashboard.css', 'site.css', 'site.js', 'wl-bg.js', 'wl-obj.js', 'world.js']
  .map((n) => readFileSync(join(ROOT, 'src/app', n), 'utf8')).join('\n')).digest('hex').slice(0, 10);

const readFrag = async (f) => existsSync(join(FRG, f)) ? await readFile(join(FRG, f), 'utf8') : '';
// Fragments are optional: this build renders plain, self-contained document pages from
// content.mjs + faqs.mjs + the page map alone, so it runs with no captured SPA fragments.
const shell = existsSync(join(FRG, '_shell.json')) ? JSON.parse(readFileSync(join(FRG, '_shell.json'), 'utf8')) : {};

// DESIGN (Jerome 2026-11-24): the app's own welcome-page design, from the Eagle Eye app
// repo (eagleeyes/ui/app — reference only, never edited from here). dashboard.css is copied
// verbatim into src/app and carries the whole look; src/app/site.css styles only the pieces
// these content pages have that the welcome page does not; src/app/site.js is the welcome
// page's behaviour (bar, dropdowns, glow, reveal); src/app/wl-bg.js is its city backdrop.
// Content, URLs and per-page SEO are unchanged.
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">`;
const ASSETS_HEAD = () => `${FONTS}
<link rel="stylesheet" href="/app/dashboard.css?v=${ASSETVER}">
<link rel="stylesheet" href="/app/site.css?v=${ASSETVER}">
<script src="/app/wl-bg.js?v=${ASSETVER}" defer></script>
<script src="/app/site.js?v=${ASSETVER}" defer></script>`;

// ---- the page map: slug -> { title, desc, h1, lede, sections[], intro?, extraFaq? } ----
// title <=60, desc <=155. lede = page H1 subhead. intro = enrichment paragraph(s) (true).
const NAVSET = [
  ['/how-it-works/', 'How it works'],
  ['/features/', 'Features'],
  ['/the-numbers/', 'The numbers'],
  ['/data-never-on-the-market/', 'Exclusive data'],
  ['/google-maps-rank-tracking/', 'Google Maps'],
  ['/apple-maps-rank-tracking/', 'Apple Maps'],
  ['/pricing/', 'Pricing'],
  ['/faq/', 'FAQ'],
  ['/compare/', 'Compare'],
  ['/free-tools/', 'Free tools'],
];
// Primary top nav: lean brand-shaped set (mirrors the live welcome's 5-item nav — brand design),
// so .wl-links fits one row without overlap. Full NAVSET stays in the mobile menu + footer.
const PRIMARY_NAV = [NAVSET[0], NAVSET[1], NAVSET[2], NAVSET[6], NAVSET[7]];
// Secondary groups: crawlable via footer + related + in-body links (kept out of the top nav).
const SOLUTIONS = [
  ['/for-agencies/', 'For agencies'],
  ['/multi-location-rank-tracking/', 'Multi-location'],
  ['/local-seo-for-restaurants/', 'Restaurants'],
  ['/local-seo-for-dentists/', 'Dentists & medical'],
  ['/local-seo-for-home-services/', 'Home services'],
  ['/local-seo-for-law-firms/', 'Law firms'],
];
const LEARN = [
  ['/what-is-geo-grid-rank-tracking/', 'What is geo-grid tracking'],
  ['/geo-grid-vs-keyword-rank-tracking/', 'Geo-grid vs keyword rank'],
  ['/geo-grid-scan-sizes-explained/', 'Grid sizes explained'],
  ['/share-of-local-voice/', 'Share of local voice'],
  ['/local-seo-reporting-guide/', 'Reporting guide'],
  ['/branded-reports/', 'Branded reports'],
  ['/scheduled-rank-tracking/', 'Scheduled scans & alerts'],
  ['/api/', 'API & integrations'],
  ['/local-seo-glossary/', 'Local SEO glossary'],
];
const TRACKING = [
  ['/local-pack-tracking/', 'Local pack tracking'],
  ['/google-business-profile-rank-tracking/', 'Business Profile (GBP)'],
  ['/near-me-rank-tracking/', 'Near me tracking'],
  ['/competitor-rank-tracking/', 'Competitor tracking'],
  ['/time-lapse-rank-tracking/', 'Time-lapse tracking'],
  ['/rank-tracking-for-google-and-apple-maps/', 'Google & Apple Maps'],
];
const VERTICALS = [
  ["/local-seo-for-retail/", "Retail stores"],
  ["/local-seo-for-auto-repair/", "Auto repair shops"],
  ["/local-seo-for-real-estate/", "Real estate agents"],
  ["/local-seo-for-gyms-and-fitness/", "Gyms & fitness studios"],
  ["/local-seo-for-salons-and-spas/", "Salons & spas"],
  ["/local-seo-for-chiropractors/", "Chiropractors"],
  ["/local-seo-for-veterinarians/", "Veterinarians"],
  ["/local-seo-for-roofers/", "Roofers"],
  ["/local-seo-for-med-spas/", "Med spas"],
  ["/local-seo-for-hotels/", "Hotels"],
  ["/local-seo-for-cleaning-services/", "Cleaning services"],
  ["/local-seo-for-landscapers/", "Landscapers"],
  ["/local-seo-for-pest-control/", "Pest control"],
  ["/local-seo-for-electricians/", "Electricians"],
  ["/local-seo-for-hvac/", "HVAC companies"],
  ["/local-seo-for-car-dealerships/", "Car dealerships"],
  ["/local-seo-for-urgent-care/", "Urgent care"],
  ["/local-seo-for-coffee-shops/", "Coffee shops"],
  ["/local-seo-for-insurance-agents/", "Insurance agents"],
  ["/local-seo-for-moving-companies/", "Moving companies"],
  ["/local-seo-for-plumbers/", "Plumbers"],
  ["/local-seo-for-accountants/", "Accountants & CPAs"],
  ["/local-seo-for-physical-therapy/", "Physical therapy"],
  ["/local-seo-for-optometrists/", "Optometrists"],
  ["/local-seo-for-barbers/", "Barbershops"],
  ["/local-seo-for-florists/", "Florists"],
  ["/local-seo-for-self-storage/", "Self-storage"],
  ["/local-seo-for-locksmiths/", "Locksmiths"],
];
const ALLSET = [...NAVSET, ...SOLUTIONS, ...LEARN, ...TRACKING, ...VERTICALS];

// ---- pillar->cluster hierarchy ----
// Flat top-level slugs are nested under four hubs: /industries/, /solutions/, /tracking/, /learn/.
// REMAP is old-slug -> new-slug. CONTENT/FAQS stay keyed by the ORIGINAL slug (p.ckey); every
// other use of p.slug (canonical, OG, sitemap, file path, page-relative links) takes the NEW slug.
// Old flat URLs get a redirect stub written at build time so nothing 404s. Product/root pages
// (home, how-it-works, features, the-numbers, exclusive-data, google/apple-maps, pricing, faq)
// stay at the root as the money/keyword pages.
const REMAP = {
  '/for-agencies/': '/solutions/agencies/',
  '/multi-location-rank-tracking/': '/solutions/multi-location/',
  '/local-pack-tracking/': '/tracking/local-pack/',
  '/google-business-profile-rank-tracking/': '/tracking/google-business-profile/',
  '/near-me-rank-tracking/': '/tracking/near-me/',
  '/competitor-rank-tracking/': '/tracking/competitor/',
  '/time-lapse-rank-tracking/': '/tracking/time-lapse/',
  '/rank-tracking-for-google-and-apple-maps/': '/tracking/google-and-apple-maps/',
  '/scheduled-rank-tracking/': '/tracking/scheduled/',
  '/what-is-geo-grid-rank-tracking/': '/learn/what-is-geo-grid/',
  '/geo-grid-vs-keyword-rank-tracking/': '/learn/geo-grid-vs-keyword/',
  '/geo-grid-scan-sizes-explained/': '/learn/grid-sizes/',
  '/share-of-local-voice/': '/learn/share-of-local-voice/',
  '/local-seo-reporting-guide/': '/learn/reporting-guide/',
  '/branded-reports/': '/learn/branded-reports/',
  '/api/': '/learn/api/',
  '/local-seo-glossary/': '/learn/glossary/',
};
for (const [h] of VERTICALS) REMAP[h] = '/industries/' + h.replace('/local-seo-for-', '');
const RM = (s) => REMAP[s] || s;
// Repoint the nav/footer arrays to the new URLs (PRIMARY_NAV + ALLSET share these element refs).
for (const arr of [NAVSET, SOLUTIONS, LEARN, TRACKING, VERTICALS]) for (const e of arr) e[0] = RM(e[0]);
// Which cluster each hub lists.
const HUBSETS = { '/industries/': VERTICALS, '/solutions/': SOLUTIONS, '/tracking/': TRACKING, '/learn/': LEARN };

// Enrichment copy (Phase 2) is authored per-page in content.mjs and merged here.
let CONTENT = {};
if (existsSync(join(ROOT, 'content.mjs'))) CONTENT = (await import('./content.mjs')).default;
// Per-page AEO FAQ sets (faqs.mjs) — merged per slug; renders an on-page accordion + FAQPage schema.
let FAQS = {};
if (existsSync(join(ROOT, 'faqs.mjs'))) FAQS = (await import('./faqs.mjs')).default;
let caseStudyPages = () => [];
if (existsSync(join(ROOT, 'casestudies.mjs'))) ({ caseStudyPages } = await import('./casestudies.mjs'));
// Comparison ("vs") pages — grounded competitor content, authored in compare.mjs.
let COMPARE = null;
if (existsSync(join(ROOT, 'compare.mjs'))) COMPARE = (await import('./compare.mjs')).default;

const PAGES = [
  { slug: '/', file: 'index.html',
    title: 'Eagle Eye — Geo-Grid Rank Tracking on Google & Apple',
    desc: 'See where a business ranks on Google and Apple Maps, point by point across its whole area: geo-grid rank tracking, competitor maps and branded reports.',
    h1: 'Every street has a #1. Make it you.',
    lede: 'Eagle Eye searches Google Maps and Apple Maps from every corner of a business’s neighbourhood and maps it all: where it wins, where it disappears, and exactly who’s taking its customers. No guesswork, just the receipts.',
    sections: [], home: true },
  { slug: '/how-it-works/', file: 'how-it-works/index.html',
    title: 'How Eagle Eye Works — Prove Local SEO to Every Client',
    desc: 'Find the gap, prove the lift, report the win. See how agencies use geo-grid scans to show clients where they rank on the map and what the work moved.',
    h1: 'Prove your local SEO on a map', lede: 'Clients don’t buy rankings. They buy being found. Show them where that happens, what you changed, and what it’s worth.',
    sections: ['how'] },
  { slug: '/features/', file: 'features/index.html',
    title: 'Eagle Eye Features — What One Geo-Grid Scan Gives You',
    desc: 'Rank at every grid point, LSOV, competitor maps, scheduled scans, branded PDF reports, time-lapse, API and team seats: everything one scan gives you.',
    h1: 'Everything one scan gives you', lede: 'What you can set, what you get back, and what keeps it running.',
    sections: ['everything-one-scan-gives-you', 'details'] },
  { slug: '/the-numbers/', file: 'the-numbers/index.html',
    title: 'LSOV, ARP & ATRP — The Numbers Behind a Geo-Grid Scan',
    desc: 'Four figures turn a grid of pins into an answer: LSOV, ARP, ATRP and scan cost. How wide a business wins, how high it ranks, the price to run it.',
    h1: 'LSOV, ARP, ATRP, explained', lede: 'Four figures turn a grid of pins into an answer a client can remember.',
    sections: ['numbers'] },
  { slug: '/data-never-on-the-market/', file: 'data-never-on-the-market/index.html',
    title: 'Local Map Data a Rank Checker Never Shows You — Eagle Eye',
    desc: "Every rival's map from your scan, open-or-closed point by point, review moves as they happen, the full top 20 everywhere: data a rank checker never shows.",
    h1: 'Data that has never been on the market', lede: 'Six things a scan records that an ordinary rank checker never shows you — the ground-level map of a neighbourhood, not a national average.',
    sections: ['exclusive'] },
  { slug: '/apple-maps-rank-tracking/', file: 'apple-maps-rank-tracking/index.html',
    title: 'Apple Maps Rank Tracking — Geo-Grid Scans | Eagle Eye',
    desc: 'Track where a business ranks on Apple Maps: same geo-grid, same numbers, same price as Google. Run both and see the two maps side by side.',
    h1: 'Apple Maps rank tracking', lede: 'The same grid, the same numbers, searched on Apple Maps. Run a business on both maps and see the two side by side.',
    sections: [] },  // enrichment-only page (content.mjs); no single source section
  { slug: '/pricing/', file: 'pricing/index.html',
    title: 'Eagle Eye Pricing — Pay Per Point, Credits Never Expire',
    desc: 'One point is one search is one credit. Pick a grid and how often it runs to see the cost. Eight plans, monthly or yearly, and unused credits never expire.',
    h1: 'Pay for the points you search', lede: 'Every plan is credits: one per grid point. Pick a grid and how often it runs to see what your scans cost.',
    sections: ['cost', 'plans'] },
  { slug: '/faq/', file: 'faq/index.html',
    title: 'Eagle Eye FAQ — Geo-Grid Local Rank Tracking Questions',
    desc: 'How a rank is measured, what a scan costs, free scans, Apple Maps, scheduling, credit expiry and more. Everything asked before you sign up to Eagle Eye.',
    h1: 'Asked before you sign up', lede: 'Anything else is in the user guide inside the app.',
    sections: ['faq'] },

  // ── Primary keyword page: Google Maps (mirror of the Apple page) ──
  { slug: '/google-maps-rank-tracking/', file: 'google-maps-rank-tracking/index.html',
    title: 'Google Maps Rank Tracking — Geo-Grid Scans | Eagle Eye',
    desc: 'Track where a business ranks on Google Maps at every point of a geo-grid: LSOV, competitor maps, scheduled scans and branded reports from one scan.',
    h1: 'Google Maps rank tracking',
    lede: 'Lay a grid over a business and search Google Maps from every point — the rank street by street, not one number from your desk.',
    sections: [] },

  // ── Audience / solution pages ──
  { slug: '/for-agencies/', file: 'for-agencies/index.html',
    title: 'Local Rank Tracking for Agencies — Eagle Eye',
    desc: 'Prove local SEO to every client: geo-grid rank maps, LSOV trends, branded white-label reports, team seats and one credit balance per client.',
    h1: 'Local rank tracking built for agencies',
    lede: 'Show every client where they rank on the map, prove the lift you made, and report it with your name on it.',
    sections: [] },
  { slug: '/multi-location-rank-tracking/', file: 'multi-location-rank-tracking/index.html',
    title: 'Multi-Location Rank Tracking — Eagle Eye Geo-Grid',
    desc: 'Track every location on its own geo-grid, compare them on the same numbers, and watch rank across a whole franchise or chain from one account.',
    h1: 'Rank tracking for multi-location brands',
    lede: 'Every branch gets its own grid and its own LSOV. See which locations win their neighbourhood and which need the work.',
    sections: [] },
  { slug: '/local-seo-for-restaurants/', file: 'local-seo-for-restaurants/index.html',
    title: 'Local SEO for Restaurants — Map Rank Tracking | Eagle Eye',
    desc: 'See where a restaurant ranks for “near me” searches across its area on Google and Apple Maps, point by point, with competitor maps and reports.',
    h1: 'Local SEO for restaurants',
    lede: 'Diners search on the map. See exactly which blocks find the restaurant first and which find a rival.',
    sections: [] },
  { slug: '/local-seo-for-dentists/', file: 'local-seo-for-dentists/index.html',
    title: 'Local SEO for Dentists & Clinics — Eagle Eye',
    desc: 'Track where a dental or medical practice ranks on the map across its catchment, point by point, with competitor maps and patient-ready branded reports.',
    h1: 'Local SEO for dentists & medical practices',
    lede: 'Patients choose the practice they can find. See where yours shows up on the map, street by street.',
    sections: [] },
  { slug: '/local-seo-for-home-services/', file: 'local-seo-for-home-services/index.html',
    title: 'Local SEO for Home Services — Eagle Eye Geo-Grid',
    desc: 'Plumbers, HVAC and contractors: track map rank across a whole service area, not one pin. Geo-grid scans, competitor maps and scheduled monitoring.',
    h1: 'Local SEO for home services',
    lede: 'Service-area businesses live or die by the map. See every neighbourhood you win and every one you miss.',
    sections: [] },
  { slug: '/local-seo-for-law-firms/', file: 'local-seo-for-law-firms/index.html',
    title: 'Local SEO for Law Firms — Map Rank Tracking | Eagle Eye',
    desc: 'Track where a law firm ranks for “near me” legal searches across its city on Google and Apple Maps, point by point, with competitor maps and reports.',
    h1: 'Local SEO for law firms',
    lede: 'Clients search for a lawyer near them. See which parts of the city find your firm and which find the competition.',
    sections: [] },
  { slug: '/local-seo-for-plumbers/', file: 'local-seo-for-plumbers/index.html',
    title: 'Local SEO for Plumbers — Map Rank Tracking | Eagle Eye',
    desc: 'See where a plumbing business ranks for “plumber near me” across its whole service area on Google and Apple Maps, point by point, with competitor maps.',
    h1: 'Local SEO for plumbers',
    lede: 'An emergency call goes to whoever shows up first on the map. See every block where a plumber wins that search and every block where a rival does.',
    sections: [] },
  { slug: '/local-seo-for-accountants/', file: 'local-seo-for-accountants/index.html',
    title: 'Local SEO for Accountants & CPAs — Eagle Eye',
    desc: 'Track where an accounting or CPA firm ranks for “accountant near me” across its city on Google and Apple Maps, point by point, with competitor maps.',
    h1: 'Local SEO for accountants & CPAs',
    lede: 'Tax-season searches pick the firm they can find. See where an accounting practice ranks on the map across its city, street by street.',
    sections: [] },
  { slug: '/local-seo-for-physical-therapy/', file: 'local-seo-for-physical-therapy/index.html',
    title: 'Local SEO for Physical Therapy Clinics — Eagle Eye',
    desc: 'See where a physical therapy clinic ranks for “physical therapy near me” across its catchment on Google and Apple Maps, point by point, with rival maps.',
    h1: 'Local SEO for physical therapy clinics',
    lede: 'Patients book the clinic they find first. See where a PT practice ranks across its catchment on the map, block by block.',
    sections: [] },
  { slug: '/local-seo-for-optometrists/', file: 'local-seo-for-optometrists/index.html',
    title: 'Local SEO for Optometrists & Eye Care — Eagle Eye',
    desc: 'See where an optometry or eye-care practice ranks for “eye doctor near me” across its area on Google and Apple Maps, point by point, with competitor maps.',
    h1: 'Local SEO for optometrists',
    lede: 'A new patient searches “eye doctor near me” and picks from the map. See which blocks find the practice and which find a rival.',
    sections: [] },
  { slug: '/local-seo-for-barbers/', file: 'local-seo-for-barbers/index.html',
    title: 'Local SEO for Barbershops — Map Rank Tracking | Eagle Eye',
    desc: 'See where a barbershop ranks for “barber near me” across its neighbourhood on Google and Apple Maps, point by point, with competitor maps and reports.',
    h1: 'Local SEO for barbershops',
    lede: 'A fresh cut is a map search away. See exactly which blocks find the shop first and which find the barber down the street.',
    sections: [] },
  { slug: '/local-seo-for-florists/', file: 'local-seo-for-florists/index.html',
    title: 'Local SEO for Florists — Map Rank Tracking | Eagle Eye',
    desc: 'Track where a florist ranks for “florist near me” and same-day delivery across its area on Google and Apple Maps, point by point, with competitor maps.',
    h1: 'Local SEO for florists',
    lede: 'Same-day flowers go to whoever ranks where the buyer is standing. See the florist’s rank across the whole delivery area, block by block.',
    sections: [] },
  { slug: '/local-seo-for-self-storage/', file: 'local-seo-for-self-storage/index.html',
    title: 'Local SEO for Self-Storage Facilities — Eagle Eye',
    desc: 'See where a self-storage facility ranks for “storage units near me” across its area on Google and Apple Maps, point by point, with competitor maps.',
    h1: 'Local SEO for self-storage',
    lede: 'Renters pick the facility they find nearby. See where a storage business ranks on the map across its whole catchment, street by street.',
    sections: [] },
  { slug: '/local-seo-for-locksmiths/', file: 'local-seo-for-locksmiths/index.html',
    title: 'Local SEO for Locksmiths — Map Rank Tracking | Eagle Eye',
    desc: 'See where a locksmith ranks for “locksmith near me” across its whole service area on Google and Apple Maps, point by point, with competitor maps.',
    h1: 'Local SEO for locksmiths',
    lede: 'A lockout call goes to the first name on the map. See every block where a locksmith wins that search and every block where a rival does.',
    sections: [] },

  // ── Feature deep-dives + learn ──
  { slug: '/what-is-geo-grid-rank-tracking/', file: 'what-is-geo-grid-rank-tracking/index.html',
    title: 'What Is Geo-Grid Rank Tracking? — Eagle Eye',
    desc: 'Geo-grid rank tracking lays a grid of points over a business and runs a real map search from each one — the rank street by street, not one number.',
    h1: 'What is geo-grid rank tracking?',
    lede: 'One rank for a keyword is true at one spot. A geo-grid shows the rank at every point of a neighbourhood — here is how it works and why it matters.',
    sections: [] },
  { slug: '/branded-reports/', file: 'branded-reports/index.html',
    title: 'Branded Local SEO Reports — White-Label | Eagle Eye',
    desc: 'Export every scan as a branded PDF or CSV with your own logo, colours and footer. Hand clients a map and the numbers, not a screenshot.',
    h1: 'Branded, white-label reports',
    lede: 'Your logo, your colours, your footer. Every scan exports as a report a client can read without you in the room.',
    sections: [] },
  { slug: '/scheduled-rank-tracking/', file: 'scheduled-rank-tracking/index.html',
    title: 'Scheduled Scans, Campaigns & Alerts — Eagle Eye',
    desc: 'Put scans on a schedule, group them into campaigns, and get alerted when LSOV falls, rank slips or a rival takes the top 3 — before the client does.',
    h1: 'Scheduled scans, campaigns and alerts',
    lede: 'Set it once. Eagle Eye runs the scan, builds the trend, and tells you the moment something moves.',
    sections: [] },
  { slug: '/api/', file: 'api/index.html',
    title: 'Eagle Eye API & Integrations — Rank Data by Code',
    desc: 'Start scans and read rank results from your own code with API keys. Pull LSOV, competitor maps and points into your own dashboards and workflows.',
    h1: 'Eagle Eye API & integrations',
    lede: 'Start a scan, read the points, pull the numbers — from your own code, with your own API keys.',
    sections: [] },
  { slug: '/local-seo-glossary/', file: 'local-seo-glossary/index.html',
    title: 'Local SEO Glossary — LSOV, ARP, ATRP, Geo-Grid',
    desc: 'Plain definitions of the terms behind local map rank tracking: geo-grid, LSOV, ARP, ATRP, local pack, share of voice, service-area business and more.',
    h1: 'Local SEO glossary',
    lede: 'The words behind the map, defined in plain language — no jargon left standing.',
    sections: [] },

  // ── Concept / keyword / learn (marketing voice, true-to-product) ──
  { slug: '/local-pack-tracking/', file: 'local-pack-tracking/index.html',
    title: 'Local Pack Rank Tracking — Eagle Eye Geo-Grid',
    desc: 'The map’s top 3 takes the clicks and the calls. Eagle Eye shows where a business holds the local pack across its whole area, point by point.',
    h1: 'Win the local 3-pack, block by block',
    lede: 'The top three results on the map take the clicks, the calls and the directions — Eagle Eye shows every block where a business makes that pack and every block where it doesn’t.',
    sections: [] },
  { slug: '/google-business-profile-rank-tracking/', file: 'google-business-profile-rank-tracking/index.html',
    title: 'Google Business Profile Rank Tracking — Eagle Eye',
    desc: 'See where a Google Business Profile ranks on the map across a whole area with Eagle Eye — point by point, on a real Google Maps search, not one number.',
    h1: 'Where your Business Profile ranks on the map',
    lede: 'Your Google Business Profile ranks high for some searchers and nowhere for others — Eagle Eye measures where it actually appears across a whole area, street by street.',
    sections: [] },
  { slug: '/near-me-rank-tracking/', file: 'near-me-rank-tracking/index.html',
    title: 'Near Me Rank Tracking — Eagle Eye Geo-Grid',
    desc: '“Near me” searches move with the searcher. Eagle Eye runs them from a grid across the whole area, so you see the rank customers really get.',
    h1: 'Map every “near me” rank',
    lede: '“Plumber near me” has a different answer on every block — Eagle Eye runs the search from a grid of real locations so you see the rank the way customers actually get it.',
    sections: [] },
  { slug: '/competitor-rank-tracking/', file: 'competitor-rank-tracking/index.html',
    title: 'Competitor Rank Tracking — Eagle Eye Geo-Grid',
    desc: 'Eagle Eye draws a competitor map for every rival that outranks you — their rank at every point of the grid, so you see exactly who wins each block.',
    h1: 'See which rival wins each block',
    lede: 'Knowing you rank #5 never tells you who holds the top 3 — Eagle Eye draws a competitor map for every rival, so you see exactly which one wins each block.',
    sections: [] },
  { slug: '/share-of-local-voice/', file: 'share-of-local-voice/index.html',
    title: 'Local Share of Voice (LSOV) — Eagle Eye',
    desc: 'LSOV is the share of the map where a business ranks in the top 3 — the one number to report to a client or boss. See it on every Eagle Eye scan.',
    h1: 'LSOV: one number to report',
    lede: 'A client doesn’t want forty rank changes — they want one number for whether the business is winning the map, and Local Share of Voice is it.',
    sections: [] },
  { slug: '/geo-grid-vs-keyword-rank-tracking/', file: 'geo-grid-vs-keyword-rank-tracking/index.html',
    title: 'Geo-Grid vs Keyword Rank Tracking — Eagle Eye',
    desc: 'A single keyword rank is true from one spot. A geo-grid maps the rank across a whole area. See why the grid wins for local, with Eagle Eye.',
    h1: 'Why a grid beats a single rank',
    lede: 'A single keyword rank is one position from one spot — a geo-grid maps the rank across a whole neighbourhood, because local results change with every block.',
    sections: [] },
  { slug: '/time-lapse-rank-tracking/', file: 'time-lapse-rank-tracking/index.html',
    title: 'Time-Lapse Rank Tracking — Eagle Eye Geo-Grid',
    desc: 'Eagle Eye stitches every run of a scan into a time-lapse GIF — a month of local-rank movement in three seconds, ready for a branded report.',
    h1: 'Watch your rankings move over time',
    lede: 'A single scan is a snapshot — Eagle Eye keeps every run and stitches them into a time-lapse GIF, so a month of movement reads in three seconds.',
    sections: [] },
  { slug: '/rank-tracking-for-google-and-apple-maps/', file: 'rank-tracking-for-google-and-apple-maps/index.html',
    title: 'Google & Apple Maps Rank Tracking — Eagle Eye',
    desc: 'Most rank tools watch Google only. Eagle Eye tracks both Google and Apple Maps the same way — same grid, same numbers, same price per point.',
    h1: 'Track Google and Apple Maps in one tool',
    lede: 'Most rank checkers watch Google and stop — Eagle Eye tracks Apple Maps the same way, at the same price, so you measure the whole local-search surface.',
    sections: [] },
  { slug: '/geo-grid-scan-sizes-explained/', file: 'geo-grid-scan-sizes-explained/index.html',
    title: 'Geo-Grid Scan Sizes Explained — Eagle Eye',
    desc: 'From 9x9 to 21x21 points, any radius from 0.1 mile, square or circle: how to size an Eagle Eye geo-grid scan and what each size costs in credits.',
    h1: 'What grid size should you run?',
    lede: 'A geo-grid scan is as wide and as fine as you set it — from 9 × 9 up to 21 × 21 points — and because every point is one credit, the size you pick is the price.',
    sections: [] },
  { slug: '/local-seo-reporting-guide/', file: 'local-seo-reporting-guide/index.html',
    title: 'Local SEO Reporting Guide — Eagle Eye Reports',
    desc: 'Turn a geo-grid scan into a branded PDF or CSV with your logo, colours and footer — the local SEO report that wins and keeps clients, from Eagle Eye.',
    h1: 'Turn scans into client-ready reports',
    lede: 'Clients renew on a clear picture of being found — Eagle Eye turns a scan into a branded report with your logo on it, built to win and keep the account.',
    sections: [] },

  // ── 20 industry verticals (marketing voice, true-to-product) ──
  { slug: "/local-seo-for-retail/", file: "local-seo-for-retail/index.html",
    title: "Local SEO for Retail Stores — Map Rank | Eagle Eye",
    desc: "See which blocks put a store in front of “near me” shoppers on Google and Apple Maps, point by point, with competitor maps and branded reports.",
    h1: "Local SEO for retail stores",
    lede: "Win the walk-ins your block is handing to the shop around the corner — see every street where a shopper finds a rival first.",
    sections: [] },
  { slug: "/local-seo-for-auto-repair/", file: "local-seo-for-auto-repair/index.html",
    title: "Local SEO for Auto Repair Shops | Eagle Eye",
    desc: "Track where an auto repair shop ranks for “mechanic near me” across its draw radius, point by point, with competitor maps and drop-out alerts.",
    h1: "Local SEO for auto repair shops",
    lede: "Catch the “mechanic near me” calls going to the shop down the road — see where you rank across every street a driver reaches you from.",
    sections: [] },
  { slug: "/local-seo-for-real-estate/", file: "local-seo-for-real-estate/index.html",
    title: "Local SEO for Real Estate Agents | Eagle Eye",
    desc: "See where an agent ranks by neighbourhood on the map across the farm area, point by point, with competitor maps and branded, white-label reports.",
    h1: "Local SEO for real estate agents",
    lede: "Own the neighbourhoods your listings depend on — see which farms put you on top of the map and which a rival agent is winning.",
    sections: [] },
  { slug: "/local-seo-for-gyms-and-fitness/", file: "local-seo-for-gyms-and-fitness/index.html",
    title: "Local SEO for Gyms & Fitness Studios | Eagle Eye",
    desc: "Track where a gym ranks across its membership catchment on Google and Apple Maps, point by point, with competitor maps and time-lapse of every scan.",
    h1: "Local SEO for gyms & fitness studios",
    lede: "Stop losing joiners to the studio nearer their door — see where your gym tops the map across its catchment and where it doesn't.",
    sections: [] },
  { slug: "/local-seo-for-salons-and-spas/", file: "local-seo-for-salons-and-spas/index.html",
    title: "Local SEO for Salons & Spas | Eagle Eye",
    desc: "See which blocks put a salon or spa top of the map when nearby clients book, point by point, on Google and Apple, with rival-takes-top-3 alerts.",
    h1: "Local SEO for salons & spas",
    lede: "Win the bookings your block is sending to the salon one street over — see which corners put you first when someone nearby decides to book.",
    sections: [] },
  { slug: "/local-seo-for-chiropractors/", file: "local-seo-for-chiropractors/index.html",
    title: "Local SEO for Chiropractors | Eagle Eye",
    desc: "Track where a chiropractic clinic ranks across its catchment on the map, point by point, with ATRP for the blocks it is missing and competitor maps.",
    h1: "Local SEO for chiropractors",
    lede: "Capture the patients in pain searching near home — see where your clinic tops the catchment and where it's invisible on the map.",
    sections: [] },
  { slug: "/local-seo-for-veterinarians/", file: "local-seo-for-veterinarians/index.html",
    title: "Local SEO for Veterinarians | Eagle Eye",
    desc: "See where a veterinary practice ranks for “emergency vet” across its catchment on Google and Apple Maps, point by point, with drop-out alerts.",
    h1: "Local SEO for veterinarians",
    lede: "Be the first practice a panicked owner finds — see where you rank for emergency searches and where they're going to a rival instead.",
    sections: [] },
  { slug: "/local-seo-for-roofers/", file: "local-seo-for-roofers/index.html",
    title: "Local SEO for Roofers — Service-Area Rank | Eagle Eye",
    desc: "Track where a roofing company ranks across its whole service area on the map, point by point — one pin hides it — with seasonal scheduled scans.",
    h1: "Local SEO for roofers",
    lede: "Win the storm calls across every neighbourhood, not just your own street — one map pin can't show where the demand actually finds you.",
    sections: [] },
  { slug: "/local-seo-for-med-spas/", file: "local-seo-for-med-spas/index.html",
    title: "Local SEO for Med Spas | Eagle Eye",
    desc: "See where a med spa ranks across a dense urban market on the map, point by point, with a competitor map of every rival and branded PDF reports.",
    h1: "Local SEO for med spas",
    lede: "Take the high-value bookings a rival is winning a few streets away — see who owns every block of a crowded, lucrative map.",
    sections: [] },
  { slug: "/local-seo-for-hotels/", file: "local-seo-for-hotels/index.html",
    title: "Local SEO for Hotels — Map Rank Tracking | Eagle Eye",
    desc: "Track where a hotel ranks for “hotels near me” from the airport, stations and sights on Google and Apple Maps, point by point, with competitor maps.",
    h1: "Local SEO for hotels",
    lede: "Win the room before a guest finds a rival — see where the hotel ranks from the airport, the highway and downtown, point by point.",
    sections: [] },
  { slug: "/local-seo-for-cleaning-services/", file: "local-seo-for-cleaning-services/index.html",
    title: "Local SEO for Cleaning Services | Eagle Eye",
    desc: "See where a cleaning company ranks across its whole service area on the map, point by point — no storefront, one pin hides it — with competitor maps.",
    h1: "Local SEO for cleaning services",
    lede: "Book the jobs across your whole service area, not just your home street — one pin can't show which suburbs actually find you.",
    sections: [] },
  { slug: "/local-seo-for-landscapers/", file: "local-seo-for-landscapers/index.html",
    title: "Local SEO for Landscapers | Eagle Eye",
    desc: "Track where a landscaper ranks across its service area through the seasons, point by point, with scheduled scans and per-rival competitor maps.",
    h1: "Local SEO for landscapers",
    lede: "Own the service area before the spring rush starts — see where you rank across every neighbourhood and watch demand climb.",
    sections: [] },
  { slug: "/local-seo-for-pest-control/", file: "local-seo-for-pest-control/index.html",
    title: "Local SEO for Pest Control | Eagle Eye",
    desc: "See where a pest control company ranks across its service area on the map, point by point, with rival-takes-top-3 alerts and competitor maps.",
    h1: "Local SEO for pest control",
    lede: "Win the urgent \"exterminator near me\" jobs across your whole area — see which blocks find you first and which find a rival.",
    sections: [] },
  { slug: "/local-seo-for-electricians/", file: "local-seo-for-electricians/index.html",
    title: "Local SEO for Electricians | Eagle Eye",
    desc: "Track where an electrician ranks across its service area for emergency searches, point by point, with drop-out alerts and competitor maps.",
    h1: "Local SEO for electricians",
    lede: "Catch the emergency calls the moment the power goes out — see where you rank across your service area and where a rival is winning.",
    sections: [] },
  { slug: "/local-seo-for-hvac/", file: "local-seo-for-hvac/index.html",
    title: "Local SEO for HVAC Companies | Eagle Eye",
    desc: "See where an HVAC company ranks across its service area through the season, point by point, with scheduled scans, demand alerts and ATRP.",
    h1: "Local SEO for HVAC companies",
    lede: "Own the map before the first heatwave rings every phone — see where you rank across the service area and watch demand shift.",
    sections: [] },
  { slug: "/local-seo-for-car-dealerships/", file: "local-seo-for-car-dealerships/index.html",
    title: "Local SEO for Car Dealerships | Eagle Eye",
    desc: "Track where a dealership ranks across a wide buyer catchment on a 21×21 grid, point by point, with ARP, competitor maps and both map surfaces.",
    h1: "Local SEO for car dealerships",
    lede: "Win buyers from across a wide catchment, not just your own town — see where the lot ranks everywhere a shopper searches from.",
    sections: [] },
  { slug: "/local-seo-for-urgent-care/", file: "local-seo-for-urgent-care/index.html",
    title: "Local SEO for Urgent Care Clinics | Eagle Eye",
    desc: "See where an urgent care clinic ranks for “near me now” across its catchment on Google and Apple Maps, point by point, with drop-out alerts.",
    h1: "Local SEO for urgent care",
    lede: "Be the clinic a \"near me now\" search finds first — see where you rank across the catchment and where patients are going instead.",
    sections: [] },
  { slug: "/local-seo-for-coffee-shops/", file: "local-seo-for-coffee-shops/index.html",
    title: "Local SEO for Coffee Shops | Eagle Eye",
    desc: "Track where a coffee shop ranks block by block from a 0.1-mile grid, point by point, on Apple Maps for commuters and Google, with competitor maps.",
    h1: "Local SEO for coffee shops",
    lede: "Win the morning rush a block at a time — see which corners put the café on top and which hand the regulars up the street.",
    sections: [] },
  { slug: "/local-seo-for-insurance-agents/", file: "local-seo-for-insurance-agents/index.html",
    title: "Local SEO for Insurance Agents | Eagle Eye",
    desc: "See where an insurance agency ranks across its local catchment, point by point, with LSOV, ARP, ATRP, competitor maps and branded reports.",
    h1: "Local SEO for insurance agents",
    lede: "Win the local buyers who want an agent they can meet — see where your office ranks across its catchment and where a rival shows first.",
    sections: [] },
  { slug: "/local-seo-for-moving-companies/", file: "local-seo-for-moving-companies/index.html",
    title: "Local SEO for Moving Companies | Eagle Eye",
    desc: "Track where a moving company ranks across its service area, local and long-haul, point by point, with competitor maps — one pin hides the area.",
    h1: "Local SEO for moving companies",
    lede: "Win both the local moves and the long-haul jobs — see where you rank across the whole service area, which one pin can never show.",
    sections: [] },
];

const slugTitle = (s) => s === '/' ? 'Home' : (ALLSET.find(n => n[0] === s)?.[1] || s);

// Rewrite in-page anchors + brand link in a fragment to the new page URLs.
// NO-RED (2026-11-19): inline rank-heat hexes in the captured fragments are literals,
// not tokens, so the pages.css token override can't reach them — remap them to the same
// green ramp here. Brightest red (rank 1) → brightest green, darker red → darker green.
const deRed = (html) => html
  .replace(/#FF4E52/gi, '#2BD48D').replace(/#FF2A2E/gi, '#12B877')
  .replace(/#E01E22/gi, '#0E9A68').replace(/#C8181C/gi, '#0B8057')
  .replace(/#A81418/gi, '#0A6E4A').replace(/#8E1114/gi, '#085939')
  .replace(/255, ?42, ?46/g, '18, 184, 119');
// CONTENT+SEO ONLY (2026-11-19): drop the decorative renders — inline SVG geo-grids/map
// mocks, <canvas>, and the empty grid-dot <i> — from captured fragments. Prose, headings,
// lists and links are untouched. The animated WebGL backdrop (wl-bg.js) and the .wl-anim
// gate are removed at the template level. Result: static, readable content pages.
// Remove a <div class="NAME ...">...</div> block whole, by balancing nested <div>s.
const dropBlocks = (html, names) => {
  for (const cn of names) {
    let idx;
    const open = new RegExp('<div class="' + cn + '(\\s|")');
    while ((idx = html.search(open)) !== -1) {
      let i = html.indexOf('>', idx) + 1, depth = 1;
      const re = /<div\b|<\/div>/g; re.lastIndex = i; let m;
      while ((m = re.exec(html))) {
        if (m[0] === '</div>') { depth--; if (depth === 0) { i = re.lastIndex; break; } } else depth++;
      }
      if (depth !== 0) break; // unbalanced — leave as-is rather than corrupt
      html = html.slice(0, idx) + html.slice(i);
    }
  }
  return html;
};
const stripRender = (html) => dropBlocks(html, ['wl-stage', 'wl-stages'])
  .replace(/<ol class="wl-stages"[\s\S]*?<\/ol>/gi, '')
  .replace(/<svg[\s\S]*?<\/svg>/gi, '')
  .replace(/<canvas[\s\S]*?<\/canvas>/gi, '')
  .replace(/<i(\s[^>]*)?><\/i>/gi, '');
const rewrite = (html) => stripRender(deRed(html))
  // EE-COPY-C2: the Apple Maps card uses a spaced hyphen where an em-dash reads clean.
  .replace(/searched on Apple Maps - run/g, 'searched on Apple Maps — run')
  .replace(/href="\/app\/welcome"/g, 'href="/"')
  .replace(/href="#how"/g, 'href="/how-it-works/"')
  .replace(/href="#details"/g, 'href="/features/"')
  .replace(/href="#exclusive"/g, 'href="/data-never-on-the-market/"')
  .replace(/href="#numbers"/g, 'href="/the-numbers/"')
  .replace(/href="#cost"/g, 'href="/pricing/"')
  .replace(/href="#plans"/g, 'href="/pricing/"')
  .replace(/href="#faq"/g, 'href="/faq/"');

// The app's brand: the logo mark + the EAGLE EYE wordmark (wlHeader, dashboard.js).
const BRAND = (tag = 'a') => `<${tag} class="wl-brand"${tag === 'a' ? ' href="/"' : ''}><img src="/app/logo.svg" alt="" width="30" height="30"><span class="mark-w"><span class="mark-1">EAGLE</span> <span class="mark-2">EYE</span></span></${tag}>`;

// Small line icons for the dropdown items (24-unit, stroked like the app's ICONS).
const SVG = (d) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

// One icon per dropdown item, each drawn for what that page is (24-unit line icons in the app's
// stroke). The build stops if a header item has no icon or two items share one.
const NAVICON = Object.fromEntries(Object.entries({
  // Product
  '/how-it-works/': '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h7a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h7"/>',
  '/features/': '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  '/the-numbers/': '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx=".5"/><rect x="12" y="8" width="3" height="10" rx=".5"/><rect x="17" y="5" width="3" height="13" rx=".5"/>',
  '/data-never-on-the-market/': '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.5"/>',
  '/google-maps-rank-tracking/': '<path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  '/apple-maps-rank-tracking/': '<path d="M3 11l18-8-8 18-2-8z"/>',
  // Solutions
  '/solutions/agencies/': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  '/solutions/multi-location/': '<path d="M7 17s-4-3.5-4-7a4 4 0 0 1 8 0c0 3.5-4 7-4 7z"/><circle cx="7" cy="10" r="1.3"/><path d="M17 21s-4-3.5-4-7a4 4 0 0 1 8 0c0 3.5-4 7-4 7z"/><circle cx="17" cy="14" r="1.3"/>',
  '/local-seo-for-restaurants/': '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11"/><path d="M18 21V3c-2.5 1.5-3.5 4.5-3.5 9H18"/>',
  '/local-seo-for-dentists/': '<path d="M7 3C4.5 3 3 5 3 7.5c0 3 1.5 4.5 2 7 .5 3 1 6.5 2.5 6.5S9.5 17 12 17s2.5 4 4.5 4 2-3.5 2.5-6.5c.5-2.5 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
  '/local-seo-for-home-services/': '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  '/local-seo-for-law-firms/': '<path d="M12 3v18M7 21h10M4 7h16"/><path d="M4 7l-2.5 6a3 3 0 0 0 5 0zM20 7l-2.5 6a3 3 0 0 0 5 0z"/>',
  // Tracking
  '/tracking/local-pack/': '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 4.5h1.5V9M3.5 9h3"/><path d="M3.5 14.5a1.5 1.5 0 1 1 2.5 1.2L3.5 19h3"/>',
  '/tracking/google-business-profile/': '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9M10 21v-5h4v5"/>',
  '/tracking/near-me/': '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  '/tracking/competitor/': '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  '/tracking/time-lapse/': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  '/tracking/google-and-apple-maps/': '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  '/tracking/scheduled/': '<rect x="3" y="5" width="13" height="13" rx="2"/><path d="M3 9h13M7 3v4M12 3v4"/><circle cx="17.5" cy="17.5" r="4"/><path d="M17.5 15.8v1.9l1.2.8"/>',
  // Learn
  '/learn/': '<path d="M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
  '/learn/what-is-geo-grid/': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  '/learn/geo-grid-vs-keyword/': '<path d="M12 3v18"/><circle cx="6.5" cy="12" r="2.5"/><path d="M15 8h6M15 12h6M15 16h6"/>',
  '/learn/grid-sizes/': '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  '/learn/share-of-local-voice/': '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  '/learn/reporting-guide/': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 13l2 2 4-4"/>',
  '/learn/branded-reports/': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 17v-3M12 17v-5M16 17v-2"/>',
  '/learn/api/': '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>',
  '/learn/glossary/': '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  // Compare (each rival drawn as it stands in the compare page's scales)
  '/compare/': '<path d="M7 4 3 8l4 4M3 8h13"/><path d="M17 12l4 4-4 4M21 16H8"/>',
  '/compare/eagle-eye-vs-brightlocal/': '<rect x="4" y="14" width="16" height="6" rx="1"/><rect x="6" y="8" width="12" height="5" rx="1"/><rect x="8" y="3" width="8" height="4" rx="1"/>',
  '/compare/eagle-eye-vs-whitespark/': '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
  '/compare/eagle-eye-vs-localviking/': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  '/compare/eagle-eye-vs-gridmybusiness/': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  // Free tools
  '/free-tools/': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  '/free-tools/geo-grid-checker/': '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  '/free-tools/scan-cost-calculator/': '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
  // Industries
  '/industries/retail/': '<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  '/industries/auto-repair/': '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><path d="M5 12h14"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>',
  '/industries/real-estate/': '<path d="M4 21V4h16"/><rect x="9" y="8" width="11" height="7" rx="1"/><path d="M12 4v4M17 4v4"/>',
  '/industries/gyms-and-fitness/': '<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/>',
  '/industries/salons-and-spas/': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
  '/industries/chiropractors/': '<path d="M12 2v20"/><path d="M9 5h6M8 9h8M8 13h8M9 17h6"/>',
  '/industries/veterinarians/': '<circle cx="12" cy="16" r="4"/><circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/>',
  '/industries/roofers/': '<path d="M2 14 12 5l10 9"/><path d="M6 14h12M8.5 11h7"/><path d="M17 8.5V4h2v6.3"/>',
  '/industries/med-spas/': '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  '/industries/hotels/': '<path d="M3 7v13M3 16h18v4M21 16v-4a3 3 0 0 0-3-3h-8v7"/><circle cx="7" cy="12" r="2"/>',
  '/industries/cleaning-services/': '<path d="M9 8h5v3l2 3v7H7v-7l2-3z"/><path d="M9 8V5h6l3 2M19 4h.01M21 6h.01"/>',
  '/industries/landscapers/': '<path d="M12 22v-6"/><path d="M12 3l6 8h-3l4 5H5l4-5H6z"/>',
  '/industries/pest-control/': '<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M12 7V5M9 3.5l1.5 1.5M15 3.5 13.5 5M8 11H4M8 15H4M16 11h4M16 15h4"/>',
  '/industries/electricians/': '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  '/industries/hvac/': '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="M9.5 4 12 6l2.5-2M9.5 20l2.5-2 2.5 2"/>',
  '/industries/car-dealerships/': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  '/industries/urgent-care/': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  '/industries/coffee-shops/': '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M8 2v3M12 2v3"/>',
  '/industries/insurance-agents/': '<path d="M2 12a10 10 0 0 1 20 0z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>',
  '/industries/moving-companies/': '<path d="M2 6h11v11H2zM13 10h5l3 3v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  '/industries/plumbers/': '<path d="M3 8h10a4 4 0 0 1 4 4v1"/><path d="M7 8V4M4 4h6"/><path d="M17 16.5s-2 2.2-2 3.5a2 2 0 0 0 4 0c0-1.3-2-3.5-2-3.5z"/>',
  '/industries/accountants/': '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  '/industries/physical-therapy/': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  '/industries/optometrists/': '<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M10 15a2 2 0 0 1 4 0M2 15l1.5-7M22 15l-1.5-7"/>',
  '/industries/barbers/': '<rect x="8" y="5" width="8" height="14" rx="1"/><path d="M8 9l8-3M8 13l8-3M8 17l8-3M7 3h10M7 21h10"/>',
  '/industries/florists/': '<circle cx="12" cy="4.5" r="2"/><circle cx="15.5" cy="8" r="2"/><circle cx="12" cy="11.5" r="2"/><circle cx="8.5" cy="8" r="2"/><path d="M12 13.5V22M12 18c-2 0-4-1-4-3"/>',
  '/industries/self-storage/': '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-9h10v9M7 15h10M7 18h10"/>',
  '/industries/locksmiths/': '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M17 6l3 3M14 9l2 2"/>',
}).map(([k, d]) => [k, SVG(d)]));
{ const seen = new Map(); for (const [k, v] of Object.entries(NAVICON)) { if (seen.has(v)) throw new Error(`${k} and ${seen.get(v)} share a header icon`); seen.set(v, k); } }

// Header IA: the same pillar hierarchy as before (every hub and every child page is linked
// from the header), set in the welcome page's bar. The bar has room for seven labels, so
// Learn, Compare and Free tools share one "Resources" panel under their own headings.
// [label, hub href, groups: [[heading|null, icon, items[[href, title]]]], panel class]
const HEADERGROUPS = () => [
  ['Product', '/how-it-works/', [[null, 'product', NAVSET.slice(0, 6)]], ''],
  ['Industries', '/industries/', [[null, null, VERTICALS]], 'wide'],
  ['Solutions', '/solutions/', [[null, 'solutions', SOLUTIONS]], 'sm'],
  ['Tracking', '/tracking/', [[null, 'tracking', TRACKING]], ''],
  ['Resources', '/learn/', [
    ['Learn', 'learn', [['/learn/', 'All guides'], ...LEARN]],
    ['Compare', 'compare', [['/compare/', 'All comparisons'], ...(COMPARE?.hub.items || []).map((it) => [it.slug, 'vs ' + it.name])]],
    ['Free tools', 'tools', [['/free-tools/', 'All free tools'], ...(typeof FREETOOLS !== 'undefined' ? FREETOOLS : []).filter((p) => p.slug !== '/free-tools/').map((p) => [p.slug, p.h1])]],
  ], 'r'],
  ['Pricing', '/pricing/', null, ''],
  ['FAQ', '/faq/', null, ''],
];
// The panel's closing "all" link to the pillar hub (Product's hub is How it works, already its first item;
// Resources lists each of its three hubs at the top of its own group).
const ALLLABEL = { Industries: 'All industries', Solutions: 'All solutions', Tracking: 'All tracking' };
const flItem = (href, title) => { const ic = NAVICON[href]; if (!ic) throw new Error(`header item ${href} has no icon (build.mjs NAVICON)`);
  return `<a class="wl-fl" href="${href}"><span class="wl-fl-i">${ic}</span><span>${title}</span></a>`; };
const NAV = (cur) => { const G = HEADERGROUPS(); return `<header class="wl-nav">
  ${BRAND()}
  <nav class="wl-links" aria-label="Site">${G.map(([label, href, groups, cls], gi) => groups
    ? `<div class="wl-drop-wrap"><a class="wl-drop-btn" href="${href}">${label}</a><button type="button" class="wl-drop-btn wl-drop-tog" aria-expanded="false" aria-haspopup="true" aria-label="${label} pages"><i class="wl-caret" aria-hidden="true"></i></button>`
      + `<div class="wl-drop${cls ? ' ' + cls : ''}"><div class="wl-drop-grid">`
      + groups.map(([h, ic, items]) => (h ? `<b class="wl-drop-h">${h}</b>` : '') + items.map(([u, t]) => flItem(u, t)).join('')).join('')
      + `</div>${ALLLABEL[label] ? `<a class="wl-drop-all" href="${href}">${ALLLABEL[label]} →</a>` : ''}</div></div>`
    : `<a href="${href}"${href === cur ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
  <div class="wl-acts"><a class="wl-link" href="${APP}/login">Sign in</a><a class="wl-btn" href="${APP}/signup">Get started</a>
    <button type="button" class="wl-menu-btn" aria-label="Menu" aria-expanded="false"><i></i><i></i></button></div>
  <nav class="wl-menu" aria-label="Site">${G.map(([label, href, groups]) => groups
    ? `<details><summary>${label}<i class="wl-caret" aria-hidden="true"></i></summary>${ALLLABEL[label] ? `<a class="all" href="${href}">${ALLLABEL[label]} →</a>` : ""}`
      + groups.map(([, , items]) => items.map(([u, t]) => `<a href="${u}">${t}</a>`).join('')).join('') + `</details>`
    : `<a href="${href}">${label}</a>`).join('')}<a href="${APP}/login">Sign in</a></nav>
</header>`; };

// The welcome page's footer (brand + columns + copyright row), with the site's full link set.
const FOOT = () => `<footer class="wl-foot">
  <div class="wl-foot-brand">${BRAND('div')}
    <p>Geo-grid rank tracking for Google Maps and Apple Maps — see where a business ranks street by street, and prove the lift to every client.</p>
    <a class="wl-btn" href="${APP}/signup">Start with 10 free scans</a><small>No card needed. Your first scan of your own site is free.</small></div>
  <div class="wl-foot-col"><b>Product</b>${NAVSET.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b><a href="/solutions/">Solutions</a></b>${SOLUTIONS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b><a href="/tracking/">Tracking</a></b>${TRACKING.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b><a href="/learn/">Learn</a></b>${LEARN.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b>Account</b><a href="${APP}/login">Sign in</a><a href="${APP}/signup">Create account</a></div>
  <div class="wl-foot-wide"><b><a href="/industries/">By industry</a></b><div class="wl-foot-ind">${VERTICALS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div></div>
  <div class="wl-copy"><small>© ${new Date().getFullYear()} Eagle Eye</small><span><a href="${APP}/login">Sign in</a> · <a href="${APP}/signup">Create account</a></span></div>
</footer>`;


const FINAL = () => rewrite(shell.final || '');

// Cross-link row: links to the sibling pages (internal linking for SEO).
const RELATED = (cur) => {
  // Rotate the sibling set by the current slug so each page surfaces a different slice
  // (spreads internal links across the whole set instead of always the first N).
  const all = [['/', 'Home'], ...ALLSET].filter(([h]) => h !== cur);
  const off = Math.abs([...cur].reduce((a, c) => a + c.charCodeAt(0), 0)) % all.length;
  const pick = [...all.slice(off), ...all.slice(0, off)].slice(0, 18);
  return `<section class="wl-sec wl-related"><div class="wl-head"><h2>Explore Eagle Eye</h2></div>
  <ul class="wl-related-list">${pick.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></section>`;
};

// Real plan prices (monthly) — drives the AggregateOffer. No fabricated ratings.
const PLANS = [
  ['Starter', '24.99'], ['Basic', '49.99'], ['Pro', '99.99'], ['Premium', '199.99'],
  ['Enterprise 1', '499.00'], ['Enterprise 2', '999.00'], ['Enterprise 3', '2499.00'], ['Enterprise 4', '4999.00'],
];
const ORG = { '@type': 'Organization', '@id': ORIGIN + '/#org', name: 'Eagle Eye', url: ORIGIN, logo: OGIMG };
const jsonLd = (p, c = {}) => {
  const base = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Eagle Eye',
    applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: ORIGIN + p.slug,
    description: p.desc, publisher: { '@id': ORIGIN + '/#org' },
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: '24.99', highPrice: '4999.00',
      offerCount: PLANS.length,
      offers: PLANS.map(([name, price]) => ({ '@type': 'Offer', name, price, priceCurrency: 'USD', availability: 'https://schema.org/InStock' })),
    } };
  const graph = [
    { '@context': 'https://schema.org', ...ORG },
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': ORIGIN + '/#site', name: 'Eagle Eye', url: ORIGIN, publisher: { '@id': ORIGIN + '/#org' } },
    base,
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }]
        .concat(p.slug === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: slugTitle(p.slug), item: ORIGIN + p.slug }]) },
  ];
  // Per-page FAQPage schema from the content entry's faq[] (AEO — answer-engine optimisation).
  if (Array.isArray(c.faq) && c.faq.length) {
    graph.push({ '@context': 'https://schema.org', '@type': 'FAQPage', '@id': ORIGIN + p.slug + '#faq',
      mainEntity: c.faq.map(([q, a]) => ({ '@type': 'Question', name: stripTags(q),
        acceptedAnswer: { '@type': 'Answer', text: stripTags(a) } })) });
  }
  return graph;
};

// Per-page AEO FAQ — a content entry may carry `faq: [[question, answer], ...]`.
// It renders as an on-page <details> accordion (so answer engines and readers both get it)
// AND drives a FAQPage JSON-LD node (see jsonLd). Answers are plain text; questions are the
// long-tail queries the page targets. HTML in an answer is allowed for the on-page render and
// stripped for the schema text.
const stripTags = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const faqSection = (faq) => !Array.isArray(faq) || !faq.length ? '' :
  `<section class="wl-sec wl-faqsec"><div class="wl-head"><h2>Questions, answered</h2></div>
  <div class="wl-faq">${faq.map(([q, a]) =>
    `<details class="wl-q"><summary><span>${q}</span><i class="wl-plus" aria-hidden="true"></i></summary><p>${a}</p></details>`).join('')}</div></section>`;

// Case-study pages (data-driven; empty until real scan data lands in casestudies.mjs).
PAGES.push(...caseStudyPages());

// ---- Full product-page furniture (Jerome 2026-11-19: "each page a full content page") ----
// A STATIC geo-grid card for the hero. Pure markup + the existing .wl-cell heat classes, so it
// renders without dashboard.js (the tilt/sweep are CSS-only and degrade to a flat card) and
// inherits whatever colour ramp the copied stylesheet carries. No fabricated client: the demo
// subject is a generic descriptor + the page's own "near me" query.
const DEMO = {
  '/local-seo-for-restaurants/': ['A restaurant', 'restaurants near me'],
  '/local-seo-for-dentists/': ['A dental clinic', 'dentist near me'],
  '/local-seo-for-home-services/': ['A home-services pro', 'plumber near me'],
  '/local-seo-for-law-firms/': ['A law firm', 'lawyer near me'],
  '/local-seo-for-retail/': ['A retail store', 'shop near me'],
  '/local-seo-for-auto-repair/': ['An auto shop', 'auto repair near me'],
  '/local-seo-for-real-estate/': ['A real-estate office', 'realtor near me'],
  '/local-seo-for-gyms-and-fitness/': ['A gym', 'gym near me'],
  '/local-seo-for-salons-and-spas/': ['A salon', 'salon near me'],
  '/local-seo-for-chiropractors/': ['A chiropractor', 'chiropractor near me'],
  '/local-seo-for-veterinarians/': ['A vet clinic', 'vet near me'],
  '/local-seo-for-roofers/': ['A roofing company', 'roofer near me'],
  '/local-seo-for-med-spas/': ['A med spa', 'med spa near me'],
  '/local-seo-for-hotels/': ['A hotel', 'hotels near me'],
  '/local-seo-for-cleaning-services/': ['A cleaning service', 'cleaners near me'],
  '/local-seo-for-landscapers/': ['A landscaper', 'landscaper near me'],
  '/local-seo-for-pest-control/': ['A pest-control firm', 'pest control near me'],
  '/local-seo-for-electricians/': ['An electrician', 'electrician near me'],
  '/local-seo-for-hvac/': ['An HVAC company', 'hvac near me'],
  '/local-seo-for-car-dealerships/': ['A car dealership', 'car dealer near me'],
  '/local-seo-for-urgent-care/': ['An urgent-care clinic', 'urgent care near me'],
  '/local-seo-for-coffee-shops/': ['A coffee shop', 'coffee near me'],
  '/local-seo-for-insurance-agents/': ['An insurance agent', 'insurance near me'],
  '/local-seo-for-moving-companies/': ['A moving company', 'movers near me'],
  '/local-seo-for-plumbers/': ['A plumbing business', 'plumber near me'],
  '/local-seo-for-accountants/': ['An accounting firm', 'accountant near me'],
  '/local-seo-for-physical-therapy/': ['A physio clinic', 'physical therapy near me'],
  '/local-seo-for-optometrists/': ['An eye-care practice', 'eye doctor near me'],
  '/local-seo-for-barbers/': ['A barbershop', 'barber near me'],
  '/local-seo-for-florists/': ['A florist', 'florist near me'],
  '/local-seo-for-self-storage/': ['A storage facility', 'storage units near me'],
  '/local-seo-for-locksmiths/': ['A locksmith', 'locksmith near me'],
};
const gridCard = (slug) => {
  const [biz, query] = DEMO[slug] || (slug === '/' ? ['Joe’s Pizza', 'pizza near me'] : ['A local business', 'service near me']);
  const seed = [...slug].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = (i) => (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
  const N = 9, mid = (N - 1) / 2;
  let cells = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, d = Math.hypot(x - mid, y - mid);
    if (x === mid && y === mid) { cells += `<i class="wl-cell r1 pin">1</i>`; continue; }
    const miss = d > 4.4 && Math.abs(rnd(i)) > 0.62;
    if (miss) { cells += `<i class="wl-cell rx"></i>`; continue; }
    const rank = Math.max(1, Math.round(1 + d * 2.0 + Math.abs(rnd(i + 99)) * 4));
    const cls = rank <= 3 ? 'r1' : rank <= 6 ? 'r2' : rank <= 10 ? 'r3' : rank <= 14 ? 'r4' : 'r5';
    cells += `<i class="wl-cell ${cls}">${rank}</i>`;
  }
  return `<div class="wl-hero-media"><div class="wl-visual">
    <div class="wl-visual-top"><b>${biz}</b><span>“${query}” · 9 × 9 grid</span><span class="wl-live"><i></i>Complete</span></div>
    <div class="wl-map"><div class="wl-grid">${cells}</div></div>
    <div class="wl-readout"><i class="wl-cell r1"></i><span>At the centre pin, ${biz.replace(/^An? /, '')} ranks <b>1</b> — the heat shows how fast that slips block by block.</span></div>
  </div></div>`;
};
// The three numbers every scan folds the grid into — definitions, no fabricated values.
const numbersSection = () => `<section class="wl-sec wl-numsec">${D.head('Three numbers, every scan',
  'Three numbers a client remembers and a trend that proves your work paid off. Every scan rolls the whole grid into them — no spreadsheet, no hand-waving.')}`
  + D.figs([
    { tag: 'Local Share of Voice', value: 'LSOV', label: 'Local Share of Voice', more: 'How much of the whole grid finds the business near the top — one number for the entire map.', art: 'fa-grid' },
    { tag: 'Average Rank, found', value: 'ARP', label: 'Average Rank, found', more: 'The mean position across only the points that return the business at all.', art: 'fa-list' },
    { tag: 'Average Total Rank', value: 'ATRP', label: 'Average Total Rank', more: 'The same average, counting every point that missed the business entirely — the honest one.', art: 'fa-one' },
  ], 'wl-figs-3') + `</section>`;
// Closing conversion band (every page; home keeps its captured FINAL instead).
// Set as the welcome page's closing call (.wl-final): back over the city, after the body band.
const ctaBand = () => `<section class="wl-final">
  <h2>See the blocks you're winning — and the ones you're not</h2>
  <p class="wl-lede">Run a real geo-grid scan on your own business, any size, no card. In minutes you'll see every block you own, every block a rival is taking, and the one number you can hand a client.</p>
  <div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a><a class="wl-btn ghost big" href="${APP}/login">Sign in</a></div>
</section>`;

// ---- nest flat pages under hubs ----
// Keep ckey (original slug) for CONTENT/FAQS lookup; move slug + file to the new nested URL.
for (const p of PAGES) {
  p.ckey = p.slug;
  const nu = REMAP[p.slug];
  if (nu) { p.slug = nu; p.file = nu.replace(/^\//, '') + 'index.html'; }
}
// Four pillar/hub landing pages. Opening copy grounded in competitor-IA research (2026-11-23):
// Yext /industries model, GridMyBusiness features, BrightLocal "one pin tells you nothing",
// Whitespark /guides — benefit-led, no invented stats.
const HUBPAGES = [
  { slug: '/industries/', file: 'industries/index.html', hub: '/industries/',
    title: 'Local Rank Tracking by Industry — Eagle Eye',
    desc: 'Pick your trade: see how Eagle Eye maps where that business ranks on Google and Apple Maps, block by block across the whole service area.',
    h1: 'Local rank tracking for your industry',
    lede: 'Local search behaves differently for every trade — the keywords, the service-area shape and the competitors all change. Pick your vertical and see where a business like yours wins the map and where it fades.',
    sections: [] },
  { slug: '/solutions/', file: 'solutions/index.html', hub: '/solutions/',
    title: 'Solutions — Agencies & Multi-Location | Eagle Eye',
    desc: 'Local rank tracking for agencies proving SEO to clients and brands watching every location — one account, one set of numbers, branded reports.',
    h1: 'Built for how you work',
    lede: 'One agency managing fifty clients, or one brand managing fifty locations — Eagle Eye turns scattered map rankings into one clear, shareable picture. Client workspaces, a grid per location, and branded reports that make progress obvious, without a spreadsheet.',
    sections: [] },
  { slug: '/tracking/', file: 'tracking/index.html', hub: '/tracking/',
    title: 'Local Rank Tracking Types — Geo-Grid | Eagle Eye',
    desc: 'Local pack, Business Profile, near-me, competitor, Google and Apple Maps tracking — one geo-grid scan measures them all, point by point, on a schedule.',
    h1: 'Every way to track local rank',
    lede: 'One pin tells you almost nothing. Eagle Eye checks hundreds of points across the service area, so you see where a business wins, where it fades, and who is taking the customers it can’t see — local pack, Google and Apple Maps, competitors and near-me, on a schedule.',
    sections: [] },
  { slug: '/learn/', file: 'learn/index.html', hub: '/learn/',
    title: 'Learn Geo-Grid Local SEO — Guides | Eagle Eye',
    desc: 'What geo-grid rank tracking is, how LSOV/ARP/ATRP work, grid sizes, reporting and branded PDFs — the guides behind every Eagle Eye scan.',
    h1: 'Learn geo-grid local SEO',
    lede: 'New to geo-grid tracking, or explaining it to a client? Plain-English guides to how the grid works, what size to choose, how share-of-local-voice and ARP/ATRP are calculated, and how to turn a colour-coded map into a plan.',
    sections: [] },
];
for (const p of HUBPAGES) p.ckey = p.slug;
PAGES.push(...HUBPAGES);

// Comparison hub + vs-pages (compare.mjs). Each carries its grounded data on p.compare.
if (COMPARE) {
  const hubE = { slug: '/compare/', file: 'compare/index.html', comparehub: true, ckey: '/compare/',
    title: COMPARE.hub.title, desc: COMPARE.hub.desc, h1: COMPARE.hub.h1, lede: COMPARE.hub.lede, sections: [] };
  PAGES.push(hubE);
  for (const cp of COMPARE.pages) {
    PAGES.push({ slug: cp.slug, file: cp.slug.replace(/^\//, '') + 'index.html', compare: cp, ckey: cp.slug,
      title: cp.title, desc: cp.desc, h1: cp.h1, lede: cp.lede, sections: [] });
  }
}

// Free, no-account tools. The geo-grid checker routes to the app's real free-first-scan (no card);
// the credit calculator is a genuine static client-side tool — 1 credit per grid point, no backend, no spend.
const FREETOOLS = [
  { slug: '/free-tools/', file: 'free-tools/index.html',
    title: 'Free Local SEO Tools — Geo-Grid Check | Eagle Eye',
    desc: 'Free, no-account tools: run your first geo-grid rank scan free, and work out exactly how many credits a scan costs before you sign up.',
    h1: 'Free local rank tools',
    lede: 'Start free, no card. Run a real geo-grid scan on your own business, or work out what a scan will cost — before you sign up.',
    sections: [],
    _intro: `<div class="wl-hubgrid">`
      + `<a class="wl-hubcard wl-glow" href="/free-tools/geo-grid-checker/"><b>Free geo-grid check</b><span>Run your first scan on your own business — any grid size, no card.</span></a>`
      + `<a class="wl-hubcard wl-glow" href="/free-tools/scan-cost-calculator/"><b>Scan credit calculator</b><span>See exactly how many credits a grid size and schedule costs — before you sign up.</span></a>`
      + `</div>` },
  { slug: '/free-tools/geo-grid-checker/', file: 'free-tools/geo-grid-checker/index.html',
    title: 'Free Geo-Grid Rank Check — No Card | Eagle Eye',
    desc: 'See where a business ranks across its whole area on Google and Apple Maps — free. Your first geo-grid scan is free at any size, no card needed.',
    h1: 'Free geo-grid rank check',
    lede: 'See where a business really ranks on the map — your first scan is free, at any grid size, no card.',
    sections: [],
    _intro: `<p>Eagle Eye lays a grid over the whole service area and runs a real Google and Apple Maps search from every point, then rolls it into one number you can act on. Your first scan of your own business is free at any grid size, and no card is needed to run it.</p>`
      + `<p>What the free scan shows you: your rank at every grid point, your Local Share of Voice, and the competitor map for every rival that outranks you on the map.</p>` },
  { slug: '/free-tools/scan-cost-calculator/', file: 'free-tools/scan-cost-calculator/index.html',
    title: 'Scan Credit Calculator — Geo-Grid | Eagle Eye',
    desc: 'Work out how many credits a geo-grid scan costs: pick a grid size and how often it runs. One credit per grid point, no account needed.',
    h1: 'Scan credit calculator',
    lede: 'One credit scans one grid point. Pick a grid and a schedule to see the credits — no account needed.',
    sections: [],
    _intro: `<p>A scan spends one credit per grid point, so the credits depend only on the grid size and how often it runs. Pick both to see the cost. For the dollar price, see <a href="/pricing/">the plans</a> — credits you buy never expire.</p>`
      + `<div class="wl-tcalc wl-glow">`
      + `<label>Grid size <select id="eeGrid">`
      + `<option value="3">3 × 3 (9 points)</option><option value="5">5 × 5 (25 points)</option>`
      + `<option value="7">7 × 7 (49 points)</option><option value="9" selected>9 × 9 (81 points)</option>`
      + `<option value="11">11 × 11 (121 points)</option><option value="13">13 × 13 (169 points)</option>`
      + `<option value="15">15 × 15 (225 points)</option><option value="21">21 × 21 (441 points)</option>`
      + `</select></label>`
      + `<label>How often <select id="eeFreq"><option value="1">Once</option><option value="4">Weekly (×4 / month)</option><option value="30">Daily (×30 / month)</option></select></label>`
      + `<p class="wl-tcalc-out" id="eeOut"></p></div>`,
    script: `<script>(function(){var g=document.getElementById('eeGrid'),f=document.getElementById('eeFreq'),o=document.getElementById('eeOut');function calc(){var n=+g.value,pts=n*n,mo=pts*(+f.value);o.textContent=pts+' credits per scan'+((+f.value>1)?' \\u00b7 '+mo+' credits per month':'')+' \\u2014 1 credit per grid point.';}g.onchange=f.onchange=calc;calc();})();</script>` },
];
for (const p of FREETOOLS) p.ckey = p.slug;
PAGES.push(...FREETOOLS);

// Programmatic {industry}-in-{metro} pages. Tight scope (Jerome 2026-11-23): top-10 US metros
// x 5 flagship trades = 50 pages. Each page's copy is varied by BOTH the trade pain and a true
// per-metro geography descriptor, so no two pages read as token-swapped duplicates.
const METROS = [
  ['new-york', 'New York', 'dense and walkable, where your rank can flip two avenues over and the pin radius is tight'],
  ['los-angeles', 'Los Angeles', 'sprawling and car-first — a customer in Pasadena searches a different map than one in Santa Monica'],
  ['chicago', 'Chicago', 'split neighborhood by neighborhood, where the Loop and the North Side are two separate search markets'],
  ['houston', 'Houston', 'one of the largest, unzoned metro footprints in the country, where coverage gaps hide between suburbs'],
  ['phoenix', 'Phoenix', 'a wide Sunbelt grid of suburbs, where ranking in Scottsdale tells you nothing about Mesa'],
  ['philadelphia', 'Philadelphia', 'tight rowhouse neighborhoods where a few blocks separate the top of the pack from invisible'],
  ['san-antonio', 'San Antonio', 'spread across a large, fast-growing footprint where the loop highways carve up the market'],
  ['san-diego', 'San Diego', 'strung along the coast and inland valleys — North County and downtown are separate map battles'],
  ['dallas', 'Dallas', 'a sprawling metroplex where Fort Worth, Plano and the core each rank on their own'],
  ['austin', 'Austin', 'growing fast and spreading outward, where the suburbs are catching up to downtown demand'],
];
const FLAGSHIP = [
  ['plumbers', 'Plumbers', 'an emergency call goes to whoever shows up first on the map'],
  ['hvac', 'HVAC companies', 'in peak season the top three pins take the calls and the rest wait'],
  ['roofers', 'Roofers', 'after a storm the business goes to whoever ranks where the damage is'],
  ['electricians', 'Electricians', 'homeowners pick from the map pack, not from page two'],
  ['med-spas', 'Med spas', 'clients book the closest highly-rated name they see on the map'],
];
const CITYCHILDREN = {};
const CITYPAGES = [];
for (const [ik, ilabel, pain] of FLAGSHIP) {
  const parent = '/industries/' + ik + '/';
  CITYCHILDREN[parent] = [];
  for (const [ck, city, geo] of METROS) {
    const slug = parent + ck + '/';
    CITYCHILDREN[parent].push([slug, city]);
    CITYPAGES.push({
      slug, file: slug.replace(/^\//, '') + 'index.html', ckey: slug, sections: [], crumbLeaf: city,
      title: `${ilabel} Local SEO in ${city} | Eagle Eye`,
      desc: `See where ${ilabel.toLowerCase()} rank across ${city} on the Google and Apple map — a geo-grid scan of the whole metro, first scan free, no card.`,
      h1: `${ilabel} local rank tracking in ${city}`,
      lede: `For ${ilabel.toLowerCase()} in ${city}, ${pain}. Eagle Eye grids the whole metro on Google and Apple Maps and shows exactly where you own the pin — and where a rival takes it.`,
      _intro: `<p>${city} is ${geo}. A single rank for "${ilabel.toLowerCase()} near me" hides that completely — you can sit first downtown and be nowhere three neighborhoods out, which is where half the calls come from. Eagle Eye lays a grid across the whole ${city} market and runs a real search from every point, so you see the map the way your customers actually do.</p>`
        + `<p>Every scan rolls ${city} into three numbers — your Local Share of Voice, average rank and the share of points where you crack the top three — plus a competitor map naming whoever outranks you at each pin. Run your first ${city} scan free, at any grid size, with no card.</p>` });
  }
}
PAGES.push(...CITYPAGES);

// Hub landing lists every child in its cluster as a card grid.
const HUBICON = { '/industries/': 'pin', '/solutions/': 'members', '/tracking/': 'target', '/learn/': 'guide' };
const hubGrid = (hub) => `<section class="wl-sec">${D.excl((HUBSETS[hub] || []).map(([h, t]) => ({ href: h, title: t, svg: NAVICON[RM(h)] && NAVICON[RM(h)].replace('<svg ', '<svg class="ic" ').replace(/ width="15" height="15"/, '') })), { iconName: HUBICON[hub] || 'pin' })}</section>`;
// Two-way breadcrumb: every nested leaf links back up to its hub and home.
const HUBLABEL = { industries: 'Industries', solutions: 'Solutions', tracking: 'Tracking', learn: 'Learn', compare: 'Compare', 'free-tools': 'Free tools' };
const CRUMBHUBS = new Set(['/compare/', '/free-tools/']);
const LABELBYSLUG = {};
for (const set of Object.values(HUBSETS)) for (const [h, t] of set) LABELBYSLUG[h] = t;
const CRUMB = (p) => {
  const segs = p.slug.split('/').filter(Boolean);
  if (segs.length < 2) return '';
  const hub = '/' + segs[0] + '/';
  if (!HUBSETS[hub] && !CRUMBHUBS.has(hub)) return '';
  const parts = [`<a href="/">Home</a>`, `<a href="${hub}">${HUBLABEL[segs[0]] || segs[0]}</a>`];
  if (segs.length >= 3) {
    const mid = '/' + segs[0] + '/' + segs[1] + '/';
    parts.push(`<a href="${mid}">${LABELBYSLUG[mid] || segs[1]}</a>`);
  }
  parts.push(`<span>${p.crumbLeaf || p.h1}</span>`);
  return `<nav class="wl-crumb" aria-label="Breadcrumb">` + parts.join(' <span>›</span> ') + `</nav>`;
};
// Metro grid shown on a flagship-trade industry page, linking its {trade}-in-{metro} children.
const cityGrid = (kids) => `<section class="wl-sec">${D.head('By metro', '')}${D.excl(kids.map(([h, t]) => ({ href: h, title: t })), { iconName: 'pin' })}</section>`;
// Comparison hub card grid (with per-competitor blurb) and vs-page body (table + prose).
const compareHubGrid = () => `<section class="wl-sec">${D.excl((COMPARE?.hub.items || []).map(it => ({ href: it.slug, title: 'vs ' + it.name, desc: it.blurb, more: 'Compare' })), { iconName: 'reports' })}</section>`;
const compareBody = (cp) => {
  const table = `<section class="wl-sec"><div class="wl-cmp-wrap wl-glow"><table class="wl-cmp">`
    + `<thead><tr><th></th><th>Eagle Eye</th><th>${cp.competitor}</th></tr></thead><tbody>`
    + cp.table.map(([d, a, b]) => `<tr><th>${d}</th><td>${a}</td><td>${b}</td></tr>`).join('')
    + `</tbody></table><p class="wl-cmp-note">${cp.competitor} details as published on their own site, November 2026 — check their current plan before quoting.</p></div></section>`;
  const secs = (cp.sections || []).map(s =>
    `<section class="wl-sec"><div class="wl-prose"><h2>${s.h}</h2>${s.html}</div></section>`).join('');
  return table + secs;
};

// Home enrichment: benefit-led depth between the hero and the numbers. Every claim traces to a
// capability already asserted on a cluster page; cards link down into the hierarchy. The hero,
// intro, numbers, FAQ and final CTA that James approved are untouched — this only adds between.
const HOMEEXTRA = () => [
  `<section class="wl-sec wl-how">${D.eyebrow('How it works')}${D.head('From invisible to undeniable, in three moves',
    'Local SEO is abstract until a client sees it on a map. Eagle Eye makes the whole job visible — the gap, the lift, and the win — so the work sells itself.')}`
  + D.steps([
    { stage: 'Find the gap', art: 'heat', href: '/how-it-works/', more: 'How it works', text: 'One scan shows every block where a business is invisible — and who is taking those customers instead.' },
    { stage: 'Prove the lift', art: 'proof', href: '/tracking/scheduled/', more: 'Scheduled scans', text: 'Put the scan on a schedule and watch Local Share of Voice climb, run after run.' },
    { stage: 'Report the win', art: 'report', href: '/learn/branded-reports/', more: 'Branded reports', text: 'Hand over a branded PDF with your name on it and the map that proves the result.' },
  ]) + `</section>`,
  D.showcase('Everything one scan gives you', [
    { title: 'Rank at every point', href: '/features/', art: 'grid', desc: 'A real Google and Apple Maps search from up to 441 points across the whole area.' },
    { title: 'LSOV, ARP &amp; ATRP', href: '/the-numbers/', art: 'gauge', desc: 'Three numbers that turn a grid of pins into an answer a client remembers.' },
    { title: 'Competitor map', href: '/tracking/competitor/', art: 'comp', desc: 'Every rival that outranks you, named point by point across the grid.' },
    { title: 'Scheduled scans', href: '/tracking/scheduled/', art: 'cal', desc: 'Set a rhythm and the trend builds itself — nobody has to remember to run it.' },
    { title: 'Branded reports', href: '/learn/branded-reports/', art: 'pdf', desc: 'White-label PDF and CSV with your logo, ready to send.' },
    { title: 'Google + Apple', href: '/tracking/google-and-apple-maps/', art: 'maps', desc: 'Both maps, same grid, same price — the Apple surface most tools ignore.' },
  ]),
  `<section class="wl-sec"><div class="wl-prose"><h2>Data a rank checker never shows you</h2>`
  + `<p>Every rival's map, open-or-closed point by point, review counts moving between scans, the full top 20 everywhere — up to 8,820 listings from a single 21 × 21 scan. <a href="/data-never-on-the-market/">See the six things only a geo-grid records →</a></p></div></section>`,
  `<section class="wl-sec">${D.eyebrow('Who it is for')}${D.head('Built for the people who have to prove it', '')}`
  + D.wins([
    { icon: 'members', title: 'Agencies', href: '/solutions/agencies/', desc: 'Show every client where they rank — and exactly what your work moved.' },
    { icon: 'pin', title: 'Multi-location brands', href: '/solutions/multi-location/', desc: 'One grid per location, every market on the same dashboard.' },
    { icon: 'org', title: '28 local industries', href: '/industries/', desc: 'From plumbers to med spas — the map pack is where the calls start.' },
  ]) + `</section>`,
  `<section class="wl-sec"><div class="wl-prose"><h2>Why teams move to Eagle Eye</h2>`
  + `<p>Most geo-grid tools stop at Google and reset your credits every month. Eagle Eye grids <b>Google and Apple at the same price</b>, your <b>credits never expire</b>, and your <b>first scan is free</b> — no card. See it next to the tool you run now.</p>`
  + `<p><a class="wl-btn" href="/compare/">Compare Eagle Eye to Local Falcon, BrightLocal &amp; more →</a></p></div></section>`,
];
// The eyebrow over a page's prose sections: its pillar, or nothing on a top-level page.
// One Blender model per page, no two pages alike (tools/blender/make_objects.py OBJECTS): a trade's
// shop carries that trade's emblem, a trade-in-metro page adds the metro's landmark, every other
// page has its own. The build stops if two pages would share a model.
const OBJBYSLUG = {
  '/how-it-works/': 'stairs', '/features/': 'featureset', '/the-numbers/': 'gauge', '/data-never-on-the-market/': 'vault',
  '/apple-maps-rank-tracking/': 'maptile-apple', '/google-maps-rank-tracking/': 'maptile-google', '/pricing/': 'coins', '/faq/': 'bubble',
  '/solutions/': 'signpost', '/solutions/agencies/': 'agency', '/solutions/multi-location/': 'multiloc',
  '/tracking/': 'radar', '/tracking/local-pack/': 'localpack', '/tracking/google-business-profile/': 'profilecard', '/tracking/near-me/': 'phone',
  '/tracking/competitor/': 'podium', '/tracking/scheduled/': 'calendar', '/tracking/time-lapse/': 'film', '/tracking/google-and-apple-maps/': 'twomaps',
  '/learn/': 'book', '/learn/glossary/': 'glossary', '/learn/what-is-geo-grid/': 'scangrid', '/learn/grid-sizes/': 'gridsizes',
  '/learn/geo-grid-vs-keyword/': 'pinvsgrid', '/learn/share-of-local-voice/': 'pie', '/learn/branded-reports/': 'report',
  '/learn/reporting-guide/': 'clipboard', '/learn/api/': 'api',
  '/industries/': 'storefront',
  '/compare/': 'scales', '/compare/eagle-eye-vs-brightlocal/': 'scales-stack', '/compare/eagle-eye-vs-whitespark/': 'scales-tile',
  '/compare/eagle-eye-vs-localviking/': 'scales-shield', '/compare/eagle-eye-vs-gridmybusiness/': 'scales-grid',
  '/free-tools/': 'toolbox', '/free-tools/geo-grid-checker/': 'magnifier', '/free-tools/scan-cost-calculator/': 'calculator',
};
// STORIES: the pinned, letterboxed 3D scroll story on every page but home. Off: the inner pages open
// with the plain hero (crumb, title, lede, call) and go straight into their copy — the reading comes
// first. The models, world.js and the story code stay in the repo; set true to bring the story back.
const STORIES = false;
const OBJFOR = (p) => {
  if (p.home || !STORIES) return null;
  if (OBJBYSLUG[p.slug]) return OBJBYSLUG[p.slug];
  let m = p.slug.match(/^\/industries\/([^/]+)\/([^/]+)\/$/);
  if (m) return `city-${m[1]}-${m[2]}`;
  m = p.slug.match(/^\/industries\/([^/]+)\/$/) || p.slug.match(/^\/local-seo-for-([^/]+)\/$/);
  if (m) return `shop-${m[1]}`;
  throw new Error(`${p.slug}: no hero model assigned (build.mjs OBJBYSLUG)`);
};
const OBJSEEN = new Map();
// How each of the four stages of a page's object arrives in its story (the shader's effects:
// 0 dropped in, 1 risen up, 2 scaled up, 3 spun in, 4 swept in sideways, 6 radial reveal),
// varied by page so no two neighbouring pages build the same way.
const FXSETS = ['6,2,3,0', '2,0,3,4', '6,1,2,3', '4,3,0,2', '2,3,1,0', '6,4,2,1'];
// the import map's URLs are page-relative (the site is served under a sub-path on Pages)
const IMPORTBASE = (p) => p.slug === '/' ? './' : '../'.repeat(p.slug.split('/').filter(Boolean).length);
const SEEDOF = (p) => [...p.slug].reduce((a, ch) => (a * 33 + ch.charCodeAt(0)) >>> 0, 5381) % 997;
const FXFOR = (p) => FXSETS[[...p.slug].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % FXSETS.length];
const PROSELABEL = (p) => { const seg = p.slug.split('/').filter(Boolean)[0]; return HUBLABEL[seg] && p.slug !== '/' + seg + '/' ? HUBLABEL[seg] : ''; };
const PAGE = async (p) => {
  const c = { ...(CONTENT[p.ckey] || {}) };
  if (!c.faq && FAQS[p.ckey]) c.faq = FAQS[p.ckey];
  const bodySecs = [];
  if (p.home) bodySecs.push(D.demo(APP));
  if (p.hub) bodySecs.push(hubGrid(p.hub));
  if (p.comparehub) bodySecs.push(compareHubGrid());
  if (p.compare) { if (p.compare.faq) c.faq = p.compare.faq; bodySecs.push(compareBody(p.compare)); }
  if (p._intro) bodySecs.push(`<section class="wl-sec"><div class="wl-prose">${p._intro}</div></section>`);
  if (CITYCHILDREN[p.slug]) bodySecs.push(cityGrid(CITYCHILDREN[p.slug]));
  if (c.introHtml) bodySecs.push(c.introHtml);
  if (p.home) for (const s of HOMEEXTRA()) bodySecs.push(s);
  for (const s of p.sections) bodySecs.push(D.WELCOME_SECTIONS[s] ? D.WELCOME_SECTIONS[s](PLANS) : rewrite(await readFrag(`sec-${s}.html`)));
  if (c.afterHtml) bodySecs.push(c.afterHtml);
  // Numbers reinforcement on every page except the one that already is the numbers page.
  if (p.slug !== '/the-numbers/') bodySecs.push(numbersSection());
  if (c.faq) bodySecs.push(faqSection(c.faq));
  // (the closing call is set after the body band, as .wl-final — see the template)
  const ld = jsonLd(p, c);
  const obj = OBJFOR(p);
  if (obj) { if (OBJSEEN.has(obj)) throw new Error(`${p.slug} and ${OBJSEEN.get(obj)} would share the model ${obj}`); OBJSEEN.set(obj, p.slug); }
  if (obj && !existsSync(join(ROOT, 'src/app/obj', obj + '.eeq'))) throw new Error(`hero object ${obj}.eeq missing — run tools/blender/make_objects.py`);
  // The scroll story's chapters, from this page's own copy (design.mjs chaptersFrom).
  // A hub's story walks through its first child pages, each with that page's own lede.
  const kids = p.hub ? (HUBSETS[p.hub] || []).map(([h, t]) => { const q = PAGES.find(x => x.slug === RM(h) || x.ckey === h); return [t, q ? q.lede : '']; })
    : p.slug === '/free-tools/' ? FREETOOLS.filter(x => x.slug !== '/free-tools/').map(x => [x.h1, x.lede]) : [];
  const story = obj ? D.chaptersFrom(bodySecs.join('\n'), c.faq || [], kids) : null;
  if (process.env.EE_DEBUG && p.slug === process.env.EE_DEBUG) console.log(bodySecs.join('\n').slice(0, 1200), story);
  if (obj && story.length < 3) throw new Error(`${p.slug}: only ${story.length} chapters found for its story`);
  const head = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title}</title>
<meta name="description" content="${p.desc}">
<link rel="canonical" href="${ORIGIN}${p.slug}">
<meta name="robots" content="noindex,nofollow">
<meta property="og:type" content="website"><meta property="og:site_name" content="Eagle Eye">
<meta property="og:url" content="${ORIGIN}${p.slug}"><meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.desc}"><meta property="og:image" content="${OGIMG}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${p.title}">
<meta name="twitter:description" content="${p.desc}"><meta name="twitter:image" content="${OGIMG}">
<link rel="icon" href="/app/logo.svg" type="image/svg+xml">
${ASSETS_HEAD()}
${obj ? `<script type="importmap">{"imports":{"three":"${IMPORTBASE(p)}app/vendor/three/three.module.js","three/addons/":"${IMPORTBASE(p)}app/vendor/three/addons/"}}</script>
<link rel="preload" href="/app/obj/${obj}.eeq" as="fetch" type="application/octet-stream" crossorigin="anonymous">
<script src="/app/wl-obj.js?v=${ASSETVER}" defer></script>` : ''}
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
</head><body>
<div class="wl wl-anim wl-site" data-app="${APP}"${p.home ? ' data-xp' : ''}>
${NAV(p.slug)}
<main>
${story ? D.fxStory({ obj, label: PROSELABEL(p) || HUBLABEL[p.slug.split('/').filter(Boolean)[0]] || '', h1: p.h1, lede: p.lede, crumb: CRUMB(p), chapters: story, fx: FXFOR(p), seed: SEEDOF(p), v: ASSETVER,
  ctas: `<div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a></div>` }) : `<section class="wl-hero${p.home ? '' : ' wl-hero-sub'}">
  <div class="wl-hero-copy">
    ${p.home ? `<div class="wl-maps"><span class="on"><i></i>Google Maps</span><span class="on"><i></i>Apple Maps</span></div>` : CRUMB(p)}
    ${p.home
      ? `<h1><span class="wl-line">Every street has a #1.</span><span class="wl-line wl-line-hot">Make it you.</span></h1>`
      : `<h1><span class="wl-line">${p.h1}</span></h1>`}
    <p class="wl-lede">${p.lede}</p>
    ${p.home ? `<div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a><a class="wl-btn ghost big" href="${APP}/login">Sign in</a></div>
    <p class="wl-note">No card needed. Your first scan of your own website is free at any size.</p>` :
    `<div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a></div>`}
  </div>
  ${p.home ? `<div class="wl-scroll" aria-hidden="true"><i></i></div>` : ''}
</section>`}
<div class="wl-body">
${(D.resetProse(), D.transformProse(bodySecs.join('\n'), PROSELABEL(p)))}
${RELATED(p.slug)}
</div>
${p.home ? FINAL() : ctaBand()}
</main>
${FOOT()}
</div>
${p.script || ''}
</body></html>`;
  return localize(head, p.slug);
};

// GitHub Pages serves this repo under a sub-path (/eagleeye-content/), while the production
// origin serves it at root. Root-absolute internal links (href="/how-it-works/") 404 on the
// sub-path. Rewrite every internal root-relative href/src to a PAGE-RELATIVE path, which
// resolves correctly on BOTH the preview sub-path and the production root. Every slug is a
// single segment (/x/) or the home root (/), so a sub-page needs one "../" and home needs none.
// Absolute https:// links (canonical, OG, JSON-LD, the /app SaaS) start with a scheme, not "/",
// so they are untouched.
const localize = (html, slug) => {
  // Rewrite any in-body link still pointing at an OLD flat slug to its new nested URL.
  for (const [o, n] of Object.entries(REMAP)) html = html.split(`"${o}"`).join(`"${n}"`);
  // Page-relative prefix = one "../" per path segment of this page's slug (home = none,
  // /x/ = one, /industries/plumbers/ = two). Resolves on both the preview sub-path and root.
  const depth = slug === '/' ? 0 : slug.split('/').filter(Boolean).length;
  const prefix = '../'.repeat(depth);
  return html.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, (_m, attr, rest) => {
    const to = rest === '' ? (prefix || './') : prefix + rest; // href="/" -> home
    return `${attr}="${to}"`;
  });
};

// ---- build ----
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
// assets the fragments reference: /app/*
await mkdir(join(DIST, 'app'), { recursive: true });
// NO-RED (2026-11-19): dashboard.css carries ~99 literal red hexes/rgb triples that no token
// override can reach (mark-1, the hero grid, plan badges, ambient glows). Transform the COPIED
// stylesheet (dist only — never the source app file): every brand-red literal → the same green
// heat ramp / steel accent the pages.css token override already uses. Dark text literals
// (#140000/#1A0000) stay — dark on bright green is high-contrast. One pass, deterministic.
// Algorithmic, not a lookup: parse EVERY colour in the copied CSS/SVG, and if it is
// red-family (hue ~335–18°, meaningfully saturated) rotate its hue to green (158°),
// preserving lightness and alpha. Catches every red variant in one pass — no per-hex
// chase. Greens/steels/whites/greys/blues (S≈0 or hue outside the red zone) untouched;
// orange (hue ~33°) is deliberately out of the red zone and left alone.
const GREEN_HUE = 158;
const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
};
const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};
const isRedFamily = (h, s) => s > 0.22 && (h >= 335 || h <= 18);
const greenify = (r, g, b) => {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (!isRedFamily(h, s)) return null;
  return hslToRgb(GREEN_HUE, s, l);
};
const toHex = (n) => n.toString(16).padStart(2, '0');
const deCssRed = (css) => {
  // #rrggbb and #rgb
  css = css.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m, hx) => {
    const full = hx.length === 3 ? hx.split('').map(c => c + c).join('') : hx;
    const out = greenify(parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16));
    return out ? '#' + out.map(toHex).join('') : m;
  });
  // rgb()/rgba()
  css = css.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)/g,
    (m, r, g, b, a) => {
      const out = greenify(+r, +g, +b);
      if (!out) return m;
      return (a ? 'rgba(' : 'rgb(') + out.join(', ') + (a ? ',' + a.replace(/^,/, '') : '') + ')';
    });
  return css;
};
for (const f of ['dashboard.css', 'site.css', 'site.js', 'wl-obj.js', 'world.js', 'logo.svg', 'eagle.svg', 'sgen-logo.png', 'og-eagleeye.png', 'city.bin', 'emblem.bin', 'pin.bin', 'person.bin'])
  if (existsSync(join(ROOT, 'src/app', f))) {
    // Original design preserved verbatim — copy CSS/SVG as-is (no recolour). The only
    // change in this reforge is copy/content, not the brand design (Jerome, 2026-11-19).
    await cp(join(ROOT, 'src/app', f), join(DIST, 'app', f));
  }

// The city backdrop (wl-bg.js) is the app's code verbatim, which fetches its models from the
// root-absolute /app/. These pages are also served under a sub-path (GitHub Pages), so the
// dist copy resolves those few asset URLs from the script's own folder (ABASE) instead.
{
  const bg = readFileSync(join(ROOT, 'src/app/wl-bg.js'), 'utf8')
    .replace(/"\/app\/(logo\.svg|sgen-logo\.png|emblem\.bin|pin\.bin|person\.bin|city\.bin)"/g, '(ABASE + "$1")')
    // The scan story's last chapter has two buttons: sign-up goes to the real app, and its
    // "How it works" (an in-page #how jump on the welcome page) opens this site's page.
    .replace('h("a", { class: "wl-btn", href: "/app/signup" }', `h("a", { class: "wl-btn", href: "${APP}/signup" }`)
    .replace('h("a", { class: "wl-btn ghost", href: "#how", onclick: wlJump }', 'h("a", { class: "wl-btn ghost", href: ABASE + "../how-it-works/" }')
    // the city can be paused while a page's world covers it (world.js sets canvas.__paused)
    .replace('if (still || raf || document.hidden) return;', 'if (still || raf || document.hidden || canvas.__paused) return;')
    .replace('const onVis = () => schedule();', 'const onVis = () => schedule(); canvas.__resume = schedule;');
  if (/"\/app\/[^"]+\.(bin|svg|png)"/.test(bg)) throw new Error('wl-bg.js: an /app/ asset URL was left root-absolute');
  if (bg.includes('href: "/app/signup"') || bg.includes('href: "#how"')) throw new Error('wl-bg.js: scan-story links not rewritten');
  if (!bg.includes('canvas.__paused') || !bg.includes('canvas.__resume = schedule')) throw new Error('wl-bg.js: city pause hook not applied');
  await writeFile(join(DIST, 'app', 'wl-bg.js'), bg, 'utf8');
}
// SYNTAX GATE: every shipped script is parsed before it is copied, so a broken edit fails the
// build instead of silently dropping a page to its fallback in the browser.
{
  const { execFileSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  for (const [f, ext] of [['world.js', '.mjs'], ['wl-obj.js', '.cjs'], ['site.js', '.cjs'], ['wl-bg.js', '.cjs']]) {
    const tmp = join(tmpdir(), 'ee-check-' + f.replace(/.js$/, '') + ext);
    await writeFile(tmp, readFileSync(join(ROOT, 'src/app', f), 'utf8'));
    try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
    catch (e) { throw new Error('src/app/' + f + ' does not parse: ' + String(e.stderr || e.message)); }
  }
}
// The hero objects (Blender, tools/blender/make_objects.py), and three.js for their worlds.
if (STORIES) {
  await cp(join(ROOT, 'src/app/obj'), join(DIST, 'app', 'obj'), { recursive: true });
  await cp(join(ROOT, 'src/app/vendor/three'), join(DIST, 'app', 'vendor', 'three'), { recursive: true });
}

let count = 0;
for (const p of PAGES) {
  const html = await PAGE(p);
  const out = join(DIST, p.file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html, 'utf8');
  count++;
  // Redirect stub at the OLD flat URL so a shared/indexed old link never 404s.
  if (p.ckey && p.ckey !== p.slug) {
    const oldFile = p.ckey.replace(/^\//, '') + 'index.html';
    const oldDepth = p.ckey.split('/').filter(Boolean).length;
    const rel = '../'.repeat(oldDepth) + p.slug.replace(/^\//, '');
    const stub = `<!doctype html><html lang="en"><head><meta charset="utf-8">`
      + `<title>Moved — Eagle Eye</title><meta name="robots" content="noindex,follow">`
      + `<link rel="canonical" href="${ORIGIN}${p.slug}">`
      + `<meta http-equiv="refresh" content="0; url=${rel}">`
      + `<link rel="icon" href="${ORIGIN}/app/logo.svg" type="image/svg+xml"></head>`
      + `<body><p>This page moved to <a href="${rel}">${p.slug}</a>.</p></body></html>`;
    const oldOut = join(DIST, oldFile);
    await mkdir(dirname(oldOut), { recursive: true });
    await writeFile(oldOut, stub, 'utf8');
  }
}
// sitemap + robots
const now = new Date().toISOString().slice(0, 10);
await writeFile(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  PAGES.map(p => `  <url><loc>${ORIGIN}${p.slug}</loc><lastmod>${now}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`, 'utf8');
// EE-ROBOTS-CONFIRM: noindex for now (Jerome, 2026-11-19) — the build stays out of the
// index until the carry-back ship decision. Flip to `Allow: /` + per-page index,follow at ship.
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nDisallow: /\n`, 'utf8');
// Plain 404 (same document style) so a bad path still lands on a branded, navigable page.
// A 404 is served for an unknown path, so the browser URL is not /404.html — page-relative
// links cannot be resolved against it. Its internal links are made ABSOLUTE to the production
// origin, which is correct from any path on either host.
const page404 = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page not found — Eagle Eye</title><meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/app/logo.svg" type="image/svg+xml">
${FONTS}
<script>(function(){var b=/github\\.io$/.test(location.hostname)?'/'+location.pathname.split('/')[1]+'/':'/',v='${ASSETVER}';
document.write('<link rel="stylesheet" href="'+b+'app/dashboard.css?v='+v+'"><link rel="stylesheet" href="'+b+'app/site.css?v='+v+'">'
+'<script src="'+b+'app/wl-bg.js?v='+v+'" defer><\\/script><script src="'+b+'app/site.js?v='+v+'" defer><\\/script>');})();</script>
</head><body>
<div class="wl wl-anim wl-site">
${NAV('/404')}
<main><section class="wl-hero wl-hero-sub"><div class="wl-hero-copy">
<h1><span class="wl-line">That page isn’t here</span></h1>
<p class="wl-lede">The link may be old or mistyped. Try the pages below, or head back to the start.</p>
<div class="wl-ctas"><a class="wl-btn big" href="/">Back to home</a></div>
</div></section>
<div class="wl-body">${RELATED('/404')}</div></main>
${FOOT()}
</div>
</body></html>`;
await writeFile(join(DIST, '404.html'),
  page404.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, (_m, attr, rest) => `${attr}="${ORIGIN}/${rest}"`),
  'utf8');
// GitHub Pages serves raw files only when Jekyll is disabled — the build rm's dist each run,
// so re-write .nojekyll every build (otherwise underscore/paths get Jekyll-processed).
await writeFile(join(DIST, '.nojekyll'), '', 'utf8');
// SPEED IS RANKING: the shipped dashboard.css keeps only the rules these pages can use (it is the
// whole app's stylesheet, and it blocks the first paint). tools/prune-css.mjs says how it decides.
{
  const { pruneCss, usedTokens } = await import('./tools/prune-css.mjs');
  const { readdirSync } = await import('node:fs');
  const htmls = [];
  (function walk(d) { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) htmls.push(readFileSync(p, 'utf8')); } })(DIST);
  const scripts = ['site.js', 'wl-bg.js', 'wl-obj.js', 'world.js'].map(f => readFileSync(join(DIST, 'app', f), 'utf8'));
  const full = readFileSync(join(ROOT, 'src/app/dashboard.css'), 'utf8');
  const { css, kept, dropped } = pruneCss(full, usedTokens(htmls, scripts));
  await writeFile(join(DIST, 'app', 'dashboard.css'), css, 'utf8');
  console.log(`dashboard.css: ${Math.round(full.length / 1024)} KB -> ${Math.round(css.length / 1024)} KB (${kept} rules kept, ${dropped} not used by these pages)`);
}
console.log(`built ${count} pages + sitemap + robots + .nojekyll -> dist/`);
// SEO GATE: the build fails if any page breaks the SEO audit (tools/seo-audit.mjs).
{
  const { execFileSync } = await import('node:child_process');
  try { console.log(execFileSync(process.execPath, [join(ROOT, 'tools/seo-audit.mjs'), DIST], { encoding: 'utf8' }).trim()); }
  catch (e) { console.error(String(e.stdout || '') + String(e.stderr || '')); throw new Error('SEO audit failed — see above'); }
}
