import fs from 'node:fs';
const src = fs.readFileSync('audit/staging-capture/app/dashboard.js', 'utf8');
const lines = src.split('\n');
// Extract a top-level function starting at 1-indexed `startLine` by brace matching.
function sliceFn(startLine) {
  let i = startLine - 1, depth = 0, started = false, out = [];
  for (; i < lines.length; i++) {
    const L = lines[i]; out.push(L);
    for (const ch of L) { if (ch === '{') { depth++; started = true; } else if (ch === '}') depth--; }
    if (started && depth === 0) break;
  }
  return out.join('\n');
}
// Function start lines (from grep): h, motionOff, rankCity, rankCityGL, wlScanStory, wlParallax
const starts = [111, 508, 894, 1087, 2102, 2355, 2392];
const fns = starts.map(sliceFn);
// sanity: each must start with "function "
fns.forEach((f, i) => { if (!/^function /.test(f.trim())) console.log('WARN start', starts[i], '->', f.slice(0, 40)); });
const header = `/* wl-bg.js — EXACT Eagle Eye welcome background, extracted verbatim from the staging
   console bundle (dashboard.js: h, motionOff, rankCity, rankCityGL, wlScanStory, wlParallax).
   Same WebGL city model + 2D fallback + parallax + scan story. Assets served from /app/.
   Mounts a fixed .wl-city canvas + .wl-shade behind the static page, as welcomeView() does. */
(function () {
'use strict';
`;
const mount = `
// ---- mount (mirrors dashboard.js welcomeView bg wiring, :2789-2806) ----
function mountWlBg() {
  var page = document.querySelector('.wl'); if (!page || page._wlbg) return; page._wlbg = 1;
  var reduce = (typeof motionOff === 'function') && motionOff();
  var fieldCanvas = h('canvas', { class: 'wl-city', 'aria-hidden': 'true' });
  var story = wlScanStory();
  var shade = h('div', { class: 'wl-shade', 'aria-hidden': 'true' });
  // canvas + shade + story are all position:fixed (dashboard.css) — DOM order does not
  // affect document flow or the parallax camera (wlParallax reads scroll + the hero's
  // rect, dashboard.js:2355). Canvas + shade as first children (behind), story appended.
  page.insertBefore(shade, page.firstChild);
  page.insertBefore(fieldCanvas, page.firstChild);
  page.appendChild(story.el);
  requestAnimationFrame(function () {
    if (!page.isConnected) return;
    var hero = page.querySelector('.wl-hero');
    var camOf = function () { return page._pp || 0; };
    if (reduce) { try { rankCity(fieldCanvas, camOf); } catch (e) { console.warn('wl-bg 2D', e); } return; }
    if (!rankCityGL(fieldCanvas, camOf, null, story)) { rankCity(fieldCanvas, camOf); story.el.classList.add('flat'); }
    wlParallax(page, hero, shade, story);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWlBg);
else mountWlBg();
})();
`;
fs.writeFileSync('src/app/wl-bg.js', header + fns.join('\n\n') + '\n' + mount);
console.log('wrote src/app/wl-bg.js', (header + fns.join('\n\n') + mount).length, 'chars from', starts.length, 'functions');
fns.forEach((f, i) => console.log('  fn@' + starts[i], f.split('\n').length, 'lines'));
