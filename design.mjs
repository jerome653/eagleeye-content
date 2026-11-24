// design.mjs — the Eagle Eye welcome page's components, as static HTML for the content pages.
//
// The markup mirrors welcomeView() in the app (eagleeyes/ui/app/dashboard.js) class for class,
// so the app's own dashboard.css styles it. All TEXT is in the HTML (crawlable); the decorative
// pictures inside the cards are drawn at runtime by src/app/site.js from a data-art placeholder
// (aria-hidden), with the same code the welcome page uses.
//
// Two kinds of export:
//  - components (showcase, steps, wins, excl, figs, proseTwo, …) that take THIS site's content;
//  - WELCOME_SECTIONS: the welcome page's own sections (how, showcase, details, numbers,
//    exclusive, cost, plans, faq) that the product pages were built to carry (PAGES[].sections).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
export const ICONS = JSON.parse(readFileSync(join(ROOT, 'src/icons.json'), 'utf8'));

// The app's icon(): a lucide line icon from the ICONS table.
export const icon = (name) => {
  const d = ICONS[name]; if (!d) throw new Error('design.mjs: no icon ' + name);
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + d.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('') + '</svg>';
};
const esc = (s) => String(s).replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// A runtime-drawn picture (site.js ART[kind]); the wrapper class sets its frame.
export const art = (kind, cls = 'hs-art') => `<div class="${cls}" data-art="${kind}" aria-hidden="true"></div>`;

// The section head: the headline on the left, the lede on the right (welcomeView head()).
export const head = (title, lede, extra = '') => `<div class="wl-head"><h2>${title}</h2>`
  + (lede || extra ? `<div class="wl-head-r">${lede ? `<p class="wl-lede">${lede}</p>` : ''}${extra}</div>` : '') + `</div>`;
export const eyebrow = (t) => `<span class="wl-eyebrow"><i></i>${t}</span>`;

// Pick a picture for a block of copy by what it talks about (first match wins).
const ART_RULES = [
  [/apple maps|google and apple|google \+ apple|both maps/i, 'maps'],
  [/competitor|rival|outrank|who.?s beating/i, 'comp'],
  [/time-?lapse|animated gif|film/i, 'lapse'],
  [/schedul|every week|weekly|rhythm|recurring/i, 'cal'],
  [/report|pdf|white-label|branded/i, 'pdf'],
  [/\bapi\b|webhook|integration|developer/i, 'code'],
  [/team|seat|members|invite/i, 'team'],
  [/campaign|multi-location|locations|franchise/i, 'camp'],
  [/\blsov\b|share of (local )?voice/i, 'gauge'],
  [/\barp\b|\batrp\b|average rank/i, 'pair'],
  [/credit|price|pricing|cost|plan/i, 'ten'],
  [/top 20|listings|every point|grid point|geo-grid|grid/i, 'grid'],
];
export const artFor = (text, fallback = 'heat') => (ART_RULES.find(([re]) => re.test(text)) || [, fallback])[1];
// A prose block's picture follows its heading first; only a heading that names nothing falls
// back to the body (whose first match is often an aside, e.g. "on both maps").
const artForProse = (inner) => {
  const h2 = (inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '';
  const byHead = ART_RULES.find(([re]) => re.test(h2));
  return byHead ? byHead[1] : artFor(inner.replace(/<[^>]+>/g, ' ').slice(0, 400), 'heat');
};

// ---------------------------------------------------------------------------------------------
// PROSE, in the welcome page's two-column rhythm: the copy on one side, a lit picture panel on
// the other, alternating sides down the page. Prose that holds a table stays full width.
let proseN = 0;
export const resetProse = () => { proseN = 0; };
export const proseTwo = (inner, label) => {
  const txt = inner.replace(/<[^>]+>/g, ' ');
  if (/<table/i.test(inner) || txt.replace(/\s+/g, ' ').trim().length < 220)
    return `<section class="wl-sec wl-psec">${label ? eyebrow(label) : ''}<div class="wl-prose">${inner}</div></section>`;
  const flip = proseN++ % 2 === 1;
  return `<section class="wl-sec wl-psec">${label ? eyebrow(label) : ''}<div class="wl-ptwo${flip ? ' flip' : ''}">`
    + `<div class="wl-prose">${inner}</div>`
    + `<aside class="wl-part wl-glow" aria-hidden="true">${art(artForProse(inner))}</aside></div></section>`;
};
// Re-set every simple prose section of a page body (no nested blocks) as proseTwo.
export const transformProse = (html, label) => html.replace(
  /<section class="wl-sec"><div class="wl-prose">((?:(?!<div|<section)[\s\S])*?)<\/div><\/section>/g,
  (_m, inner) => proseTwo(inner, label));

// ---------------------------------------------------------------------------------------------
// CARD GRID (.wl-excl, the "Only in Eagle Eye" cards): a lettered or icon badge, a title, a line,
// and the whole card is the link. items: [{ href, title, desc?, icon?, more? }]
export const excl = (items, { letters = false, iconName = null } = {}) =>
  `<ol class="wl-excl wl-cards">${items.map((it, i) => `<li class="wl-glow" style="--i:${i % 9}">`
    + `<span class="wl-excl-k" aria-hidden="true">${letters ? String.fromCharCode(65 + (i % 26)) : (it.svg || icon(it.icon || iconName || 'pin'))}</span>`
    + `<b>${it.href ? `<a class="wl-card-link" href="${it.href}">${it.title}</a>` : it.title}</b>`
    + (it.desc ? `<p>${it.desc}</p>` : '')
    + (it.href ? `<span class="wl-new-more" aria-hidden="true">${it.more || 'Open'} →</span>` : '')
    + `</li>`).join('')}</ol>`;

// THE SHOWCASE: a row of cards the page's own scroll drives sideways while the section is pinned
// (site.js drives it; on a phone it is a row you swipe). cards: [{ title, desc, art, href?, tag? }]
export const showcase = (title, cards, label = 'What a scan gives you') =>
  `<section class="wl-hs" aria-label="${esc(label)}"><div class="hs-pin">`
  + `<div class="hs-top"><h2>${title}</h2><div class="hs-prog" aria-hidden="true"><i></i></div></div>`
  + `<div class="hs-track">${cards.map((c, i) => `<article class="hs-card wl-glow" style="--k:${i}">`
    + art(c.art) + (c.tag ? `<span class="hs-tag">${c.tag}</span>` : '')
    + `<h3>${c.href ? `<a class="wl-card-link" href="${c.href}">${c.title}</a>` : c.title}</h3><p>${c.desc}</p></article>`).join('')}</div>`
  + `</div></section>`;

// HOW IT WORKS: numbered stages, then a step card each with its own picture and facts.
// steps: [{ stage, title?, text, art, facts?: [[b, t]], href? }]
export const steps = (steps) =>
  `<ol class="wl-stages" aria-hidden="true">${steps.map((s, i) => `<li style="--i:${i}"><b>0${i + 1}</b><span>${s.stage}</span></li>`).join('')}</ol>`
  + `<div class="wl-steps">${steps.map((s, i) => `<article class="wl-step wl-glow">${art(s.art, 'wl-art')}`
    + `<span class="wl-step-n"><i>0${i + 1}</i>${s.stage}</span>`
    + (s.title ? `<h3>${s.title}</h3>` : '') + `<p>${s.text}</p>`
    + (s.facts ? `<ul class="wl-facts">${s.facts.map(([b, t]) => `<li><b>${b}</b> <span>${t}</span></li>`).join('')}</ul>` : '')
    + (s.href ? `<a class="wl-new-more" href="${s.href}">${s.more || 'How it works'} →</a>` : '')
    + `</article>`).join('')}</div>`;

// WINS: icon cards in threes. items: [{ icon, title, desc, href? }]
export const wins = (items) => `<ul class="wl-wins">${items.map((w, i) => `<li class="wl-glow" style="--i:${i}">`
  + `<span class="wl-win-i" aria-hidden="true">${icon(w.icon)}</span>`
  + `<b>${w.href ? `<a class="wl-card-link" href="${w.href}">${w.title}</a>` : w.title}</b><span>${w.desc}</span></li>`).join('')}</ul>`;

// FIGURES: the welcome page's number cards — a tag, a picture, the figure (counted up when it is
// a number), the label and the detail. items: [{ tag, value, count?, label, more, art }]
export const figs = (items, cls = '') => `<div class="wl-figs${cls ? ' ' + cls : ''}">${items.map((f) =>
  `<div class="wl-fig wl-glow"><em class="wl-fig-tag">${f.tag}</em>${art(f.art, 'wl-fig-art')}`
  + `<b${f.count != null ? ` data-count="${f.count}"` : ''}>${f.value}</b><span>${f.label}</span>`
  + (f.more ? `<p class="wl-fig-more">${f.more}</p>` : '') + `</div>`).join('')}</div>`;

// THE PRODUCT SHOT ("Point at any street"): the app's scan screen, built from its own pieces.
// site.js fills the grid (cells ring by ring out of the pin) and wires the hover read-out.
export const demo = (APP) => `<section class="wl-sec wl-demo">`
  + head('Point at any street', 'Every square is one search from that spot. Tap or hover one to read it.')
  + `<div class="wl-stage"><div class="wl-device wl-tilt"><div class="wl-screen">`
  + `<aside class="wl-rail"><img src="/app/logo.svg" alt="">${['overview', 'scans', 'new', 'reports', 'credits'].map(k => `<span>${icon(k)}</span>`).join('')}</aside>`
  + `<div class="wl-app"><div class="wl-app-top"><b>Joe's Pizza</b><span>“pizza near me” · 9 × 9 grid · 2 mi</span><span class="wl-live"><i></i>Complete</span></div>`
  + `<div class="wl-app-body"><div class="wl-mapcol"><div class="wl-map"><div class="wl-sweep"></div><div class="wl-grid" data-art="shot"></div></div>`
  + `<div class="wl-readout"><i class="wl-cell r1"></i><span>Point at the pin: Joe's Pizza ranks <b>1</b>.</span></div></div>`
  + `<div class="wl-stats">`
  + `<div class="wl-stat"><small>LSOV</small><b data-count="38.3" data-dec="1" data-suffix="%" data-delay="1500">38.3%</b><em class="up">▲ 6.1 on last scan</em></div>`
  + `<div class="wl-stat"><small>ARP</small><b data-count="4.6" data-dec="1" data-delay="1600">4.6</b><em>average rank where found</em></div>`
  + `<div class="wl-stat"><small>ATRP</small><b data-count="7.9" data-dec="1" data-delay="1700">7.9</b><em>counting points it missed</em></div>`
  + `<div class="wl-stat wl-bars"><small>LSOV over 8 scans</small><div class="wl-spark">${[14, 18, 17, 22, 26, 29, 32, 38].map((v, i) => `<i style="--h:${v * 2.4}%;--i:${i}"></i>`).join('')}</div></div>`
  + `<div class="wl-stat wl-bars wl-comp"><small>Ahead of you most often</small><ol>${[['Napoli Express', 52, 3.1], ['Slice House', 47, 4.4], ["Tony's Brick Oven", 31, 6.8]].map(([n, pts, arp], i) =>
    `<li style="--i:${i}"><span class="wl-comp-n">${i + 1}</span><b>${n}</b><span class="wl-comp-bar"><i style="width:${(pts / 0.81).toFixed(2)}%"></i></span><em>${pts} pts · ARP ${arp}</em></li>`).join('')}</ol></div>`
  + `</div></div></div></div></div></div></section>`;

// ---------------------------------------------------------------------------------------------
// THE EXPERIENCE: four chapters for a page's scroll story, taken from the page's OWN copy, in
// this order of preference: its bolded list points ("<b>Rank at every point</b> — …"), its
// section headings with their first sentence, its sub-headings, then its questions. No new claims.
const strip = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const firstSentences = (t, max = 170) => {
  t = t.replace(/^[\s—–:,-]+/, '');
  const parts = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t];
  let out = '';
  for (const p of parts) { if ((out + p).length > max && out) break; out += p; }
  out = out.trim();
  return out.length > max + 40 ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
};
const STOP = new Set(['the', 'a', 'an', 'your', 'every', 'what', 'how', 'why', 'one', 'it', 'its', 'in', 'on', 'of', 'to', 'and', 'for', 'is', 'see', 'with', 'where', 'who', 'that', 'from', 'by', 'at', 'when', 'do', 'does', 'can', 'my', 'i']);
export const bigWord = (title) => {
  const num = title.match(/\b\d[\d,.]*\s*(?:×|x)?\s*\d*%?/);
  if (num && num[0].trim().length <= 8) return num[0].replace(/\s+/g, '').toUpperCase();
  const w = (title.replace(/<[^>]+>/g, '').match(/[A-Za-z][A-Za-z'’-]*/g) || []).find(x => !STOP.has(x.toLowerCase()) && x.length > 1) || '';
  return w.toUpperCase().slice(0, 9);
};
// extra: [[title, line]] the page links to (a hub's child pages, with their own ledes), used
// after the page's own copy and before the shared number cards.
export const chaptersFrom = (html, faq = [], extra = [], min = 4) => {
  const out = [], seen = new Set();
  const add = (t, d, maxT = 56) => {
    t = strip(t).replace(/[:.—–-]+$/, '').trim(); d = firstSentences(strip(d));
    const k = t.toLowerCase();
    if (!t || t.length > maxT || t.length < 3 || seen.has(k) || d.length < 25) return;
    seen.add(k); out.push([t, d]);
  };
  // The story opens on what is particular to this page — its own headline and its own first
  // question — before the points many pages share (the bolded list), then everything else.
  // (tempered: a heading's text never runs past its own closing tag into the next one)
  const H2 = [...html.matchAll(/<h2[^>]*>((?:(?!<\/?h2)[\s\S])*?)<\/h2>\s*(?:<(?!\/?h2)[^>]+>\s*)*?<p>((?:(?!<\/p>)[\s\S])*)<\/p>/g)].map(m => [m[1], m[2]]);
  // A list point that runs on from its bold lead ("<b>Rank at every point</b> of the service
  // area — …") reads as one sentence; one that stands apart ("<b>LSOV</b> — the share …") keeps its own line.
  const LI = [...html.matchAll(/<li>\s*<b[^>]*>((?:(?!<\/b>)[\s\S])*)<\/b>((?:(?!<\/?li)[\s\S])*)<\/li>/g)].map(m => {
    const rest = strip(m[2]);
    return /^[a-z(“"]/.test(rest) && !/^[—–:-]/.test(rest) ? [m[1], strip(m[1]) + ' ' + rest] : [m[1], rest.replace(/^[—–:-]\s*/, '').replace(/^./, (x) => x.toUpperCase())];
  });
  const H3 = [...html.matchAll(/<h3[^>]*>((?:(?!<\/?h3)[\s\S])*?)<\/h3>\s*(?:<(?!\/?h3)[^>]+>\s*)*?<p>((?:(?!<\/p>)[\s\S])*)<\/p>/g)].map(m => [m[1], m[2]]);
  const take = (list, n) => { let k = 0; for (const [t, d] of list) { if (k >= n || out.length >= min) break; const before = out.length; add(t, d); if (out.length > before) k++; } };
  take(H2, 1); take(LI, 1); take(faq, 1); take(LI, 1);
  for (const list of [H2, LI, H3, faq]) take(list, 99);
  // cards with a line of their own (compare, welcome sections)
  for (const m of html.matchAll(/<li class="wl-glow"[^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>\s*<p>([\s\S]*?)<\/p>/g)) add(m[1], m[2]);
  // a page whose copy is plain paragraphs (the city pages): each sentence's opening clause is
  // its chapter title and the rest of the sentence its line — the page's own words, split
  if (out.length < min) for (const m of html.matchAll(/<div class="wl-prose">([\s\S]*?)<\/div>/g))
    for (const p of m[1].matchAll(/<p>([\s\S]*?)<\/p>/g))
      for (const sent of strip(p[1]).match(/[^.!?]+[.!?]+/g) || []) {
        const cut = sent.match(/^(.{12,66}?)(?:,\s|\s[—–]\s|:\s)(.+)$/);
        if (cut) add(cut[1].replace(/^(and|but|so)\s+/i, '').replace(/^./, (x) => x.toUpperCase()), cut[2].replace(/^./, (x) => x.toUpperCase()), 66);
      }
  for (const [t, d] of extra) if (out.length < min) add(t, d);
  // last, the page's number cards
  for (const m of html.matchAll(/<div class="wl-fig wl-glow">[\s\S]*?<b[^>]*>[\s\S]*?<\/b><span>([\s\S]*?)<\/span>\s*<p class="wl-fig-more">([\s\S]*?)<\/p>/g)) add(m[1], m[2]);
  return out.slice(0, min);
};
// The story section that opens a page (replaces the plain hero). intro: crumb, h1, lede, ctas.
export const fxStory = ({ obj, label, h1, lede, crumb, ctas, chapters, fx, seed = 0, v = '' }) => {
  const C = chapters.length;
  // The cinema around it: letterbox bars, a vignette with a little film grain, a scene counter,
  // a "skip the trailer" for anyone in a hurry, and an end card that hands over to the page.
  return `<section class="fx" data-fx="${fx || '6,2,3,0'}" data-seed="${seed}" data-v="${v}" aria-label="${esc(strip(h1))}, in ${C} steps"><div class="fx-stage">`
    + `<div class="fx-glow" aria-hidden="true"></div><div class="wl-xp-big fx-big" aria-hidden="true"></div>`
    + `<canvas class="fx-gl" data-obj="${obj}" aria-hidden="true"></canvas><div class="fx-flash" aria-hidden="true"></div>`
    + `<div class="fx-vig" aria-hidden="true"></div><div class="fx-lb" aria-hidden="true"></div>`
    + `<span class="fx-scene" aria-hidden="true">Scene <b>00</b> / 0${C}</span>`
    + `<button type="button" class="fx-skip">Skip the trailer <i aria-hidden="true">→</i></button>`
    + `<div class="fx-intro">${crumb || ''}${label ? eyebrow(label) : ''}<h1><span class="wl-line">${h1}</span></h1><p class="wl-lede">${lede}</p>`
    + `${ctas || ''}<span class="fx-cue" aria-hidden="true"><i></i>Scroll. We'll roll the film.</span></div>`
    + `<div class="fx-end" aria-hidden="true" data-nosnippet><small>That was the trailer.</small><b>The full story is right below.</b><button type="button" tabindex="-1">Roll it <i>↓</i></button></div>`
    // The captions repeat the page's own copy, so they are kept out of search snippets (data-nosnippet)
    // and are not headings (the page's own H2s carry its structure; a caption H3 under the H1 skipped a level).
    + `<div class="wl-xp-caps fx-caps" data-nosnippet>${chapters.map(([t, d], i) => `<article class="wl-xp-cap" data-i="${i}" data-big="${esc(bigWord(t))}">`
      + `<span class="wl-xp-n"><b>0${i + 1}</b><i></i>of 0${C}</span>`
      + `<p class="wl-xp-t">${t.split(' ').map((w, j) => `<span class="wl-xp-w" style="--w:${j}">${w}</span>`).join(' ')}</p><p>${d}</p></article>`).join('')}</div>`
    + `<ol class="wl-xp-rail fx-rail">${chapters.map(([t], i) => `<li><button type="button" title="${esc(t)}" aria-label="Step ${i + 1}: ${esc(t)}"><i></i></button></li>`).join('')}</ol>`
    + `<div class="fx-prog" aria-hidden="true"><i></i></div></div></section>`;
};

// ---------------------------------------------------------------------------------------------
// THE WELCOME PAGE'S OWN SECTIONS, as the product pages were built to carry them. Copy is the
// welcome page's (welcomeView), every claim from the app's user guide.
const STAGES = ['Find the gap', 'Prove the lift', 'Report the win'];
const FEATS = [
  ['Rank at every grid point', 'Up to 21 × 21 points around the business, each one its own Google Maps search.', 'grid'],
  ['LSOV', 'The share of grid points where you rank in the top 3, as one number to watch.', 'gauge'],
  ['ARP and ATRP', 'Your average rank where you are found, and again with every missed point counted as 21.', 'pair'],
  ['Competitors at each point', 'Who sits above you, point by point, and who does it most often.', 'comp'],
  ['Scheduled scans', 'Put any scan on a timetable. Every run is kept, so the trend builds itself.', 'cal'],
  ['Campaigns', 'Group scans together and follow them as one.', 'camp'],
  ['Branded PDF reports', 'Send a report with your own logo, on a timetable or whenever you need one.', 'pdf'],
  ['Time-lapse', 'Every run of a scan, oldest first, as one animated GIF.', 'lapse'],
  ['API keys', 'Start scans and read the results from your own code.', 'code'],
  ['Team seats', 'Invite your team into one organisation, each with their own sign-in.', 'team'],
];
const tags = (items, cls = '') => `<span class="wl-dt-tags ${cls}">${items.map(t => `<i>${t}</i>`).join('')}</span>`;
const metric = (k, t) => `<span class="wl-dt-m"><b>${k}</b><span>${t}</span></span>`;
const GRID_SIZES = [9, 11, 13, 15, 17, 19, 21];
const SPEC = [
  ['search', 'What it searches', [
    ['Maps', 'Google Maps and Apple Maps, each its own scan at the same price.'],
    ['At every point', 'The top 20 listings for your keyword, as someone standing there would see them.'],
    ['Grid size', `<span>Always odd, so the business sits on the centre point.${tags(GRID_SIZES.map(n => `${n}×${n}`))}</span>`],
    ['Radius', 'From 0.1 mile, in miles or kilometres, measured from the centre to the edge.'],
    ['Shape', `<span class="wl-dt-inline"><span class="wl-dt-shapes" aria-hidden="true"><i class="sq"></i><i class="ci"></i><i class="dr"></i></span>A square, a circle, or an area you draw. Points outside it are not searched or charged.</span>`]]],
  ['reports', 'What you get back', [
    ['Three numbers', `<span class="wl-dt-ms">${metric('LSOV', 'share of points in the top 3')}${metric('ARP', 'average rank where found')}${metric('ATRP', 'average, a missed point counted as 21')}</span>`],
    ['The map', 'Every point coloured by your rank. Click one to see the 20 listings there and who sits above you.'],
    ['Competitors', 'Every business that ranks above you, how often, how high, and where on the map.'],
    ['The trend', 'Each business keeps every run, with LSOV over time, filtered by keyword and grid size.'],
    ['Downloads', `<span>Listings, reports and every run as a time-lapse.${tags(['CSV', 'PDF', 'GIF'], 'dl')}</span>`]]],
  ['clock', 'What keeps it running', [
    ['Run again', 'Any scan, with the same settings, in one click.'],
    ['Schedules', 'Once, daily, weekdays, chosen days, monthly or every N days, in your own time zone.'],
    ['Campaigns', 'Many locations and keywords on one schedule.'],
    ['Alerts', 'When LSOV falls, rank worsens, points drop out of the top 20, or a rival takes the top 3.']]],
  ['members', 'Team and cost', [
    ['Your team', 'Owners, admins and members in each organisation, and API keys for your own code.'],
    ['Per scan', `<span>1 credit per point searched.${tags(['9×9 = 81', '11×11 = 121', '21×21 = 441'])}</span>`],
    ['Credits', 'Credits you buy never expire. Reward and referral credits last 90 days.'],
    ['To start', '10 free scans for a new organisation, and your own website\'s first scan free.']]],
];
const NUMS = [
  [441, 'searches in one 21 × 21 scan', 'From 81 at 9 × 9. Each one is a real Google Maps search from that spot.', 'Coverage', 'fa-grid'],
  [20, 'listings read at every point', 'Up to 8,820 in a 21 × 21 scan. Your place among them is your rank there.', 'Depth', 'fa-list'],
  [1, 'credit per point searched', 'Switched-off points cost nothing, and a scan that cannot start is refunded.', 'Price', 'fa-one'],
  [10, 'free scans for a new organisation', 'Plus the first scan of your own website, free at any size up to 21 × 21.', 'To start', 'fa-ten']];
const EXCL = [
  ['Every rival\'s map, from your scan', 'Click any competitor in a result and the map redraws with their rank at every point. One scan maps the whole market, not just you.'],
  ['Open or closed, point by point', 'Who was open at the moment each point was searched, and how many top-3 spots went to open businesses against closed ones.'],
  ['Review moves, as they happen', 'An alert when a rival gains reviews between two scans of the same setup, with the count.'],
  ['The invisible, as a number', 'ATRP counts every point where you are missing as 21, so “not in the top 20” becomes a figure that can improve.'],
  ['Twenty deep, everywhere', 'The full top 20 at every point, with rating, reviews, category and address: up to 8,820 listings from one 21 × 21 scan, as CSV.'],
  ['Every run, as a film', 'A time-lapse GIF of a business\'s runs, so a client watches their map turn red square by square.']];
export const WELCOME_FAQ = [
  ['How is a rank measured?', 'From each point of the grid, a browser searches Google Maps for your keyword and reads the top 20 listings. Your rank at that point is where your business appears in them.'],
  ['Why do grid sizes go up in odd numbers?', 'So the grid has a centre point on the business and the same number of points on every side.'],
  ['What does a scan cost?', 'One credit per point searched: a 9 × 9 grid is 81 credits. A new organisation starts with 10 free scans, and your first scan of the website you sign up with is free at any size.'],
  ['Can I compare two scans of the same business?', 'Yes. A campaign does it on every run, and Run again repeats any scan with the same settings, so the trend builds up on its own.'],
  ['Does it search Apple Maps?', 'Yes. Each scan reads one map, Google Maps or Apple Maps, at the same price: one credit a point. Run a business on both to compare them. Apple Maps shows no review counts, so none are shown for an Apple scan.'],
  ['Do unused credits expire?', 'No. Credits stay in your organisation\'s balance until you spend them, whichever plan you are on.'],
  ['Can I schedule scans?', 'Yes. Any scan can run once, daily, weekly or monthly, and every run is kept so you can see the trend.'],
  ['Is my first scan free?', 'Yes. When you sign up with your website, your first scan of that business is free at any grid size up to 21 × 21. Each website gets it once. A new organisation also starts with 10 free scans.'],
  ['What if a scheduled scan runs out of credits?', 'It still runs, so no point in your history is missed, but the result stays locked until you top up or subscribe. Up to 5 scans can wait locked at once, for 30 days. The Spending page shows who spent the last credits.'],
  ['Can results go straight into our own tools?', 'Yes. Set a webhook in Settings and each finished scan and scheduled report is posted to your https address, signed so you can check it came from Eagle Eye. API keys let your own code start scans and read results.'],
  ['What can I download?', 'A scan\'s listings as a CSV, reports as PDF or CSV, and a time-lapse GIF of every run of a scan.'],
];

export const WELCOME_SECTIONS = {
  how: () => `<section class="wl-sec wl-how" id="how">${eyebrow('For agencies and marketers')}`
    + head('Prove your work to every client', "Clients don't buy rankings. They buy being found. Show them where that happens, what you changed, and what it's worth.")
    + steps([
      { stage: STAGES[0], title: "Show them where they're invisible", art: 'heat',
        text: "One scan maps their rank on every street around them. The dark squares are the neighbourhoods where customers search and find a competitor instead. That's the brief, in one picture.",
        facts: [['9 × 9 to 21 × 21', 'grid over the radius you choose, up to 441 searches in one sweep.'], ['Top 20 listings', 'read at every point, exactly as a person standing there sees them.'], ['LSOV, ARP, ATRP', 'turn the whole map into three numbers a client can remember.']] },
      { stage: STAGES[1], title: 'Prove the work moved it', art: 'proof',
        text: "Scan on a schedule and every run is kept. LSOV, the share of the map where they're in the top 3, climbs as one number the client can follow month to month.",
        facts: [['Any rhythm', 'daily, weekdays, weekly on chosen days, monthly or every N days.'], ['Like for like', "each business's runs filter by keyword and grid size, so a trend never mixes setups."], ['Campaigns', 'repeat many locations and keywords in one schedule, for multi-site clients.']] },
      { stage: STAGES[2], title: 'Hand over a report with your name on it', art: 'report',
        text: 'A PDF in your colours, with your logo and footer: every scan, the trend, and each competitor still outranking them. Schedule it to their inbox and the update writes itself.',
        facts: [['Your brand', 'name, logo, accent colour and footer line on every PDF.'], ['Seven reports', 'scans, competitors, campaigns, trends, keywords, locations, opening hours. Each also exports to CSV.'], ['On a timetable', "weekly by default, emailed to the client's inbox, the last 60 kept."]] }])
    + wins([
      { icon: 'folder', title: 'One workspace per client', desc: 'Every client is its own organisation: scans, reports and schedules kept apart, one credit balance paying for all.' },
      { icon: 'members', title: 'The team on board', desc: "Invite colleagues into a client's organisation, and plug scans into your own tools with API keys." },
      { icon: 'credits', title: 'One point, one credit', desc: "A 9 × 9 scan is 81 credits, so a client's monthly tracking is quoted before it runs." },
      { icon: 'target', title: "Who's beating them, by name", desc: 'Every competitor that outranks them, how often, and where on the map it wins.' },
      { icon: 'alerts', title: 'Bad news before the client sees it', desc: 'Alerts flag a fall in LSOV, lost grid points or a rival taking the top 3 as soon as a scan finds it.' },
      { icon: 'clock', title: 'Runs without you', desc: 'Scheduled scans and emailed reports keep every client current on a timetable.' }])
    + `</section>`,
  'everything-one-scan-gives-you': () => showcase('Everything one scan gives you',
    [...FEATS.map(([title, desc, a]) => ({ title, desc, art: a })),
      { title: 'Apple Maps', tag: 'New', art: 'maps', desc: 'The same grid, the same numbers, searched on Apple Maps — run a business on both and see the two maps side by side.' }]),
  details: () => `<section class="wl-sec" id="details">` + head('The details', 'What you can set, what you get back, and what it costs.')
    + `<div class="wl-dt">${SPEC.map(([ic, title, rows], i) => `<section class="wl-dt-card wl-glow" style="--i:${i}"><div class="wl-dt-h"><span class="wl-win-i" aria-hidden="true">${icon(ic)}</span><h3>${title}</h3></div>`
      + `<dl>${rows.map(([k, v]) => `<div class="wl-dt-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`).join('')}</div></section>`,
  numbers: () => `<section class="wl-sec" id="numbers">` + head('The numbers behind a scan', 'Four figures that decide what a scan tells you, and what it costs.')
    + figs(NUMS.map(([n, label, more, tag, a]) => ({ tag, value: n.toLocaleString('en-US'), count: n, label, more, art: a }))) + `</section>`,
  exclusive: () => `<section class="wl-sec wl-excl-sec" id="exclusive">${eyebrow('Only in Eagle Eye')}`
    + head('Data that has never been on the market', 'Use us and see data that has never been on the market. Six things a scan records that a rank checker never shows you.')
    + `<ol class="wl-excl">${EXCL.map(([t, d], i) => `<li class="wl-glow" style="--i:${i}"><span class="wl-excl-k" aria-hidden="true">${String.fromCharCode(65 + i)}</span><b>${t}</b><p>${d}</p></li>`).join('')}</ol></section>`,
  // The calculator and the plan cards are interactive: site.js builds them into these slots from
  // the app's plan table (billing.py SEED_PLANS). The static fallback lists every plan.
  cost: () => `<section class="wl-sec" id="cost">` + head('What will my scans cost?', 'Pick a grid and how often it runs. One point is one search is one credit.')
    + `<div data-ee="calc"></div></section>`,
  plans: (PLANS) => `<section class="wl-sec" id="plans">` + head('Pay for the points you search', 'Every plan is credits: one per grid point. Unused credits never expire.', '<div class="wl-plan-ctl" data-ee="plan-ctl"></div>')
    + `<div data-ee="plans"><ul class="wl-plan-static">${PLANS.map(([n, p]) => `<li><b>${n}</b> $${p} / month</li>`).join('')}</ul></div></section>`,
  faq: () => `<section class="wl-sec wl-faqsec" id="faq"><div class="wl-head"><h2>Asked before you sign up</h2><div class="wl-head-r"><p class="wl-lede">Anything else is in the user guide inside the app.</p></div></div>`
    + `<div class="wl-faq">${WELCOME_FAQ.map(([q, a], i) => `<details class="wl-q"${i === 0 ? ' open' : ''}><summary><span>${q}</span><i class="wl-plus" aria-hidden="true"></i></summary><p>${a}</p></details>`).join('')}</div></section>`,
};
