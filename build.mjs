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
const ASSETVER = createHash('sha1').update(readFileSync(join(ROOT, 'src/app/pages.css'))).digest('hex').slice(0, 10);

const readFrag = async (f) => existsSync(join(FRG, f)) ? await readFile(join(FRG, f), 'utf8') : '';
// Fragments are optional: this build renders plain, self-contained document pages from
// content.mjs + faqs.mjs + the page map alone, so it runs with no captured SPA fragments.
const shell = existsSync(join(FRG, '_shell.json')) ? JSON.parse(readFileSync(join(FRG, '_shell.json'), 'utf8')) : {};

// PLAIN document stylesheet (Jerome 2026-11-23: "plain content like word"). Inlined per page
// so every page is fully self-contained — no external CSS/JS/font, nothing to break on Pages.
// Readable single-column document: clean headings, body prose, lists, simple tables. The old
// wl-* app classes stay in the markup and are styled plainly here; decorative blocks are hidden.
const PLAINCSS = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:#1b1b1b;font:400 18px/1.7 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wl{max-width:820px;margin:0 auto;padding:0 24px}
a{color:#0b5fb0;text-decoration:underline;text-underline-offset:2px}
a:hover{color:#063e74}
/* header */
.wl-nav{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding:20px 0 14px;border-bottom:1px solid #e3e3e3;margin-bottom:8px}
.wl-brand{font-weight:700;font-size:19px;letter-spacing:.02em;text-decoration:none;color:#1b1b1b}
.wl-brand .mark-2{color:#0b8057}
.wl-links{display:flex;flex-wrap:wrap;gap:6px 16px}
.wl-links a,.wl-acts a{font-size:15px}
.wl-acts{margin-left:auto;display:flex;gap:14px;align-items:center}
.wl-menu-btn,.wl-menu,.wl-maps,.wl-hero-media,.wl-visual,.wl-map,.wl-grid,.wl-cell,.wl-readout,.wl-live,.wl-plus,.wl-squah{display:none!important}
/* hero */
main{display:block}
.wl-hero{padding:26px 0 6px}
h1{font-size:34px;line-height:1.2;font-weight:700;margin:.2em 0 .35em}
.wl-line{display:block}
.wl-lede{font-size:20px;line-height:1.55;color:#333;margin:.4em 0 1em}
.wl-ctas{margin:14px 0}
.wl-btn,.wl-btn.big{display:inline-block;background:#0b8057;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:16px;margin-right:10px}
.wl-btn.ghost{background:#fff;color:#0b8057;border:1px solid #0b8057}
.wl-note{font-size:14px;color:#666}
/* body sections */
.wl-body{padding:6px 0 10px}
.wl-sec{padding:18px 0;border-top:1px solid #ececec}
.wl-sec:first-child{border-top:0}
.wl-prose,.wl-head{max-width:none}
h2{font-size:25px;line-height:1.25;font-weight:700;margin:1.1em 0 .4em}
h3{font-size:20px;font-weight:700;margin:1.2em 0 .3em}
p{margin:.6em 0}
ul,ol{margin:.6em 0;padding-left:1.3em}
li{margin:.3em 0}
b,strong{font-weight:700}
.wl-k{font-weight:600;color:#0b8057}
/* numbers */
.wl-nums{display:block;margin:.4em 0}
.wl-numcard{padding:10px 0;border-top:1px dotted #ddd}
.wl-numcard b{font-size:17px}
.wl-numname{color:#555;font-style:italic;margin-left:8px}
/* faq */
.wl-faq .wl-q{border-bottom:1px solid #eaeaea;padding:8px 0}
.wl-q summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none}
.wl-q summary::-webkit-details-marker{display:none}
.wl-q[open] summary{margin-bottom:6px}
.wl-q p{color:#333}
/* related */
.wl-related-list{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px}
.wl-related-list a{font-size:15px}
/* cta band */
.wl-cta{background:#f3f7f5;border:1px solid #d9e6e0;border-radius:8px;padding:20px 22px;margin:16px 0}
.wl-cta h2{margin-top:0}
/* tables */
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:16px}
th,td{border:1px solid #d7d7d7;padding:8px 10px;text-align:left}
th{background:#f4f4f4}
/* footer */
.wl-foot{border-top:1px solid #e3e3e3;margin-top:28px;padding:24px 0 48px;display:flex;flex-wrap:wrap;gap:22px 36px;font-size:14px}
.wl-foot-col{display:flex;flex-direction:column;gap:5px;flex:0 1 auto;min-width:140px}
.wl-foot-col b{color:#1b1b1b;margin-bottom:5px;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.wl-foot-col a{color:#555;font-size:13.5px}
.wl-foot-brand{flex:1 1 100%;margin-bottom:4px}
.wl-foot-brand p{color:#555;margin:.35em 0 0;max-width:46ch}
/* the long by-industry list tiles into columns instead of one tall tower */
.wl-foot-col-wide{flex:1 1 100%;display:block;columns:4 160px;column-gap:28px;margin-top:4px}
.wl-foot-col-wide b{display:block;margin-bottom:8px;column-span:all;color:#1b1b1b;font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
.wl-foot-col-wide a{display:block;color:#555;font-size:13.5px;margin:4px 0;break-inside:avoid}
.wl-copy{flex-basis:100%;color:#888;border-top:1px solid #eee;padding-top:14px;margin-top:10px}
@media(max-width:600px){h1{font-size:28px}.wl-lede{font-size:18px}.wl{padding:0 18px}}
`;

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

// Enrichment copy (Phase 2) is authored per-page in content.mjs and merged here.
let CONTENT = {};
if (existsSync(join(ROOT, 'content.mjs'))) CONTENT = (await import('./content.mjs')).default;
// Per-page AEO FAQ sets (faqs.mjs) — merged per slug; renders an on-page accordion + FAQPage schema.
let FAQS = {};
if (existsSync(join(ROOT, 'faqs.mjs'))) FAQS = (await import('./faqs.mjs')).default;
let caseStudyPages = () => [];
if (existsSync(join(ROOT, 'casestudies.mjs'))) ({ caseStudyPages } = await import('./casestudies.mjs'));

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

// Faithful nav built from real wl-* classes, linking the full page set.
const NAV = (cur) => `<header class="wl-nav" data-static="1">
  <a class="wl-brand" href="/"><span class="mark-w"><span class="mark-1">EAGLE</span> <span class="mark-2">EYE</span></span></a>
  <nav class="wl-links" aria-label="Pages">${PRIMARY_NAV.map(([h, t]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <div class="wl-acts"><a class="wl-link" href="${APP}/login">Sign in</a><a class="wl-btn" href="${APP}/signup">Get started</a>
    <button type="button" class="wl-menu-btn" aria-label="Menu" aria-expanded="false" onclick="var n=this.closest('.wl-nav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o)"><i></i><i></i></button></div>
  <nav class="wl-menu" aria-label="Pages">${NAVSET.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}<a href="${APP}/login">Sign in</a></nav>
</header>`;

// Faithful footer with full product column.
const FOOT = () => `<footer class="wl-foot">
  <div class="wl-foot-brand"><div class="wl-brand"><span class="mark-w"><span class="mark-1">EAGLE</span> <span class="mark-2">EYE</span></span></div>
    <p>Geo-grid rank tracking for Google Maps and Apple Maps.</p></div>
  <div class="wl-foot-col"><b>Product</b>${NAVSET.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b>Solutions</b>${SOLUTIONS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b>Tracking</b>${TRACKING.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col wl-foot-col-wide"><b>By industry</b>${VERTICALS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b>Learn</b>${LEARN.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
  <div class="wl-foot-col"><b>Account</b><a href="${APP}/login">Sign in</a><a href="${APP}/signup">Create account</a></div>
  <div class="wl-copy"><small>© ${new Date().getFullYear()} Eagle Eye</small><span class="wl-squah">Kind of service that makes you <b>SQUAHHH!</b></span></div>
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
const numbersSection = () => `<section class="wl-sec wl-numsec"><div class="wl-head"><h2>Three numbers, every scan</h2>
  <div class="wl-head-r"><p class="wl-lede">The whole grid rolls up into the figures a client actually remembers — tracked every run so the trend is the proof.</p></div></div>
  <div class="wl-nums">
    <div class="wl-numcard"><b>LSOV</b><span class="wl-numname">Local Share of Voice</span><p>How much of the whole grid finds the business near the top — one number for the entire map.</p></div>
    <div class="wl-numcard"><b>ARP</b><span class="wl-numname">Average Rank, found</span><p>The mean position across only the points that return the business at all.</p></div>
    <div class="wl-numcard"><b>ATRP</b><span class="wl-numname">Average Total Rank</span><p>The same average, counting every point that missed the business entirely — the honest one.</p></div>
  </div></section>`;
// Closing conversion band (every page; home keeps its captured FINAL instead).
const ctaBand = () => `<section class="wl-sec wl-ctasec"><div class="wl-cta">
  <h2>Find out where you really rank</h2>
  <p>Your first scan of your own site is free, at any grid size. No card needed.</p>
  <div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a></div>
</div></section>`;

const PAGE = async (p) => {
  const c = { ...(CONTENT[p.slug] || {}) };
  if (!c.faq && FAQS[p.slug]) c.faq = FAQS[p.slug];
  const bodySecs = [];
  if (p._intro) bodySecs.push(`<section class="wl-sec"><div class="wl-prose">${p._intro}</div></section>`);
  if (c.introHtml) bodySecs.push(c.introHtml);
  for (const s of p.sections) bodySecs.push(rewrite(await readFrag(`sec-${s}.html`)));
  if (c.afterHtml) bodySecs.push(c.afterHtml);
  // Numbers reinforcement on every page except the one that already is the numbers page.
  if (p.slug !== '/the-numbers/') bodySecs.push(numbersSection());
  if (c.faq) bodySecs.push(faqSection(c.faq));
  if (!p.home) bodySecs.push(ctaBand());
  const ld = jsonLd(p, c);
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
<style>${PLAINCSS}</style>
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
</head><body>
<div class="wl">
${NAV(p.slug)}
<main>
<section class="wl-hero${p.home ? '' : ' wl-hero-sm'}">
  <div class="wl-hero-copy">
    ${p.home
      ? `<h1><span class="wl-line">Every street has a #1.</span><span class="wl-line wl-line-hot">Make it you.</span></h1>`
      : `<h1>${p.h1}</h1>`}
    <p class="wl-lede">${p.lede}</p>
    ${p.home ? `<div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a><a class="wl-btn ghost big" href="${APP}/login">Sign in</a></div>
    <p class="wl-note">No card needed. Your first scan of your own website is free at any size.</p>` :
    `<div class="wl-ctas"><a class="wl-btn big" href="${APP}/signup">Start with 10 free scans</a></div>`}
  </div>
</section>
<div class="wl-body">
${bodySecs.join('\n')}
${RELATED(p.slug)}
</div>
${p.home ? FINAL() : ''}
</main>
${FOOT()}
</div>
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
  const prefix = slug === '/' ? '' : '../';
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
for (const f of ['dashboard.css', 'pages.css', 'theme.js', 'logo.svg', 'eagle.svg', 'sgen-logo.png', 'og-eagleeye.png'])
  if (existsSync(join(ROOT, 'src/app', f))) {
    // Original design preserved verbatim — copy CSS/SVG as-is (no recolour). The only
    // change in this reforge is copy/content, not the brand design (Jerome, 2026-11-19).
    await cp(join(ROOT, 'src/app', f), join(DIST, 'app', f));
  }

let count = 0;
for (const p of PAGES) {
  const html = await PAGE(p);
  const out = join(DIST, p.file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html, 'utf8');
  count++;
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
<style>${PLAINCSS}</style></head><body><div class="wl">
${NAV('/404')}
<main><section class="wl-hero"><div class="wl-hero-copy">
<h1>That page isn’t here</h1>
<p class="wl-lede">The link may be old or mistyped. Try the pages below, or head back to the start.</p>
<div class="wl-ctas"><a class="wl-btn big" href="/">Back to home</a></div>
</div></section>
<div class="wl-body">${RELATED('/404')}</div></main>
${FOOT()}
</div></body></html>`;
await writeFile(join(DIST, '404.html'),
  page404.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, (_m, attr, rest) => `${attr}="${ORIGIN}/${rest}"`),
  'utf8');
// GitHub Pages serves raw files only when Jekyll is disabled — the build rm's dist each run,
// so re-write .nojekyll every build (otherwise underscore/paths get Jekyll-processed).
await writeFile(join(DIST, '.nojekyll'), '', 'utf8');
console.log(`built ${count} pages + sitemap + robots + .nojekyll -> dist/`);
