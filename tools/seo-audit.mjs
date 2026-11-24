// SEO audit of the built site (dist/): every page's title, description, canonical, one H1, heading
// order, valid JSON-LD, image alts, link text, lang, viewport, robots, and the story's SEO hygiene
// (captions kept out of snippets, no render-blocking 3D). Exits non-zero on any failure, so the
// build can run it as a gate.  usage: node tools/seo-audit.mjs [dist]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] || 'dist';
const files = [];
(function walk(d) { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) files.push(p); } })(DIST);

const issues = {};
const add = (k, v) => { (issues[k] = issues[k] || []).push(v); };
let pages = 0;
const titles = new Map(), descs = new Map();
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  if (/http-equiv="refresh"/.test(s)) continue;          // the old-URL redirect stubs
  const rel = f.split('\\').join('/');
  const is404 = rel.endsWith('/404.html');
  pages++;
  const t = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!t) add('no title', rel); else if (t.length > 60) add('title > 60 chars', `${rel} (${t.length})`);
  const d = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!is404) {
    if (!d) add('no description', rel); else if (d.length > 155) add('description > 155 chars', `${rel} (${d.length})`);
    if (titles.has(t)) add('duplicate title', `${rel} = ${titles.get(t)}`); else titles.set(t, rel);
    if (descs.has(d)) add('duplicate description', `${rel} = ${descs.get(d)}`); else descs.set(d, rel);
    if (!/<link rel="canonical" href="https:\/\/[^"]+"/.test(s)) add('no canonical', rel);
    if (!/<meta property="og:title"/.test(s) || !/<meta property="og:image"/.test(s)) add('no Open Graph', rel);
    if (!/<meta name="twitter:card"/.test(s)) add('no Twitter card', rel);
  }
  const h1 = (s.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) add('H1 count is not 1', `${rel} (${h1})`);
  let lds = 0;
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { lds++; try { JSON.parse(m[1]); } catch (e) { add('invalid JSON-LD', rel); } }
  if (!is404 && !lds) add('no JSON-LD', rel);
  const hs = [...s.matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1]);
  let prev = 0;
  for (const h of hs) { if (prev && h > prev + 1) { add('heading level skipped', `${rel} h${prev}->h${h}`); break; } prev = h; }
  for (const m of s.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) add('img without alt', rel);
  for (const m of s.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const txt = m[2].replace(/<[^>]+>/g, '').trim();
    if (!txt && !/aria-label=/.test(m[1]) && !/<img[^>]*alt="[^"]+"/.test(m[2])) add('link without text', rel);
  }
  if (!/<html lang="/.test(s)) add('no lang', rel);
  if (!/name="viewport"/.test(s)) add('no viewport', rel);
  // the story: its captions repeat the page's own copy, so they are kept out of search snippets,
  // and the 3D library must not be fetched ahead of the page's own content
  if (/class="fx"/.test(s)) {
    if (!/class="wl-xp-caps fx-caps" data-nosnippet/.test(s)) add('story captions not data-nosnippet', rel);
    if (/rel="modulepreload"[^>]*three/.test(s)) add('three.js preloaded (render competition)', rel);
  }
}
console.log(`audited ${pages} pages`);
const n = Object.keys(issues).length;
for (const [k, v] of Object.entries(issues)) console.log(`FAIL ${k}: ${v.length}  e.g. ${v.slice(0, 3).join(' | ')}`);
if (!n) console.log('PASS: no SEO issues');
process.exit(n ? 1 : 0);
