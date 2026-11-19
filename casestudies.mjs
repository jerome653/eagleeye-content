// casestudies.mjs — the case-study MACHINE for the Eagle Eye marketing build.
//
// WHY THIS IS EMPTY: case studies prove value with REAL scan numbers from REAL businesses.
// Those numbers are client data. They are NOT fabricated here. Each record below must be
// filled from an actual Eagle Eye scan history (an export, or a read of the signed-in app),
// AND cleared for publication (see `consent`). Until James/Jerome hand over real scan data
// + the consent call, CASE_STUDIES stays [], and build.mjs emits NO /case-studies/ pages
// (no thin or fake proof ships). The moment the array has entries, the index + one detail
// page per entry build automatically and join the nav, sitemap and footer.
//
// Intake spec (what each record needs, and the consent decision): audit/case-studies-intake-spec.md

/**
 * @typedef {Object} Metrics
 * @property {number} lsov  Local Share of Voice — % of grid points in the top 3 (0–100).
 * @property {number} arp   Average Rank where Present (1–20).
 * @property {number} atrp  Average Total Rank, missing counted as 21 (1–21).
 * @property {string} date  ISO date of the scan these numbers came from (YYYY-MM-DD).
 *
 * @typedef {Object} CaseStudy
 * @property {string} slug        URL slug, e.g. 'brightsmile-dental-austin'. No leading/trailing slash.
 * @property {'named'|'anonymized'} consent  'named' = the client approved using their real name/quote.
 *                                            'anonymized' = publish industry + metro only, never the name.
 * @property {string} business    Real business name (consent 'named') OR an honest label
 *                                 (consent 'anonymized', e.g. 'A multi-location dental group').
 * @property {string} industry    e.g. 'Dental', 'HVAC', 'Law firm'.
 * @property {string} area        Metro/area the grid covered, e.g. 'Austin, TX'.
 * @property {string} grid        Grid used, e.g. '15×15 (225 points)'.
 * @property {string} map         'Google Maps' | 'Apple Maps' | 'Google & Apple Maps'.
 * @property {string} window      The real time span the before/after spans, e.g. 'Mar–Aug 2026'.
 * @property {Metrics} before     Baseline scan metrics (REAL).
 * @property {Metrics} after      Latest scan metrics (REAL).
 * @property {string} challenge   1–2 sentences: the real local-visibility problem.
 * @property {string} tracked     1–2 sentences: what Eagle Eye measured (grid, cadence, rivals).
 * @property {string} result      1–2 sentences: what the numbers moved to — descriptive, no causal
 *                                 over-claim (Eagle Eye MEASURED the change; it did not perform the SEO).
 * @property {{quote:string, attribution:string}} [testimonial]  Only if consent === 'named'.
 */

/** @type {CaseStudy[]} */
export const CASE_STUDIES = [
  // ── Fill from REAL Eagle Eye scan data. No entry here until the numbers are real
  //    AND the `consent` field reflects a real decision. Example of the SHAPE (do NOT ship):
  // {
  //   slug: 'example-dental-metro', consent: 'anonymized',
  //   business: 'A single-location dental practice', industry: 'Dental', area: 'a US metro',
  //   grid: '13×13 (169 points)', map: 'Google & Apple Maps', window: '<real span>',
  //   before: { lsov: 0, arp: 0, atrp: 0, date: 'YYYY-MM-DD' },
  //   after:  { lsov: 0, arp: 0, atrp: 0, date: 'YYYY-MM-DD' },
  //   challenge: '<real>', tracked: '<real>', result: '<real, descriptive>',
  // },
];

// ── Render helpers ────────────────────────────────────────────────────────────
const pct = (n) => `${n}%`;
const delta = (a, b, lowerIsBetter = false) => {
  const d = +(b - a).toFixed(1);
  const better = lowerIsBetter ? d < 0 : d > 0;
  const sign = d > 0 ? '+' : '';
  return `<b class="${better ? 'cs-up' : 'cs-flat'}">${sign}${d}</b>`;
};

/** One case study → the introHtml body (same wl-prose shape as content.mjs sec()). */
export function renderCaseStudy(cs) {
  const name = cs.business;
  const t = cs.testimonial && cs.consent === 'named'
    ? `<blockquote class="cs-quote">“${cs.testimonial.quote}”<cite>— ${cs.testimonial.attribution}</cite></blockquote>` : '';
  return `
    <h2>${cs.industry} · ${cs.area}</h2>
    <p><b>The challenge.</b> ${cs.challenge}</p>
    <h3>What Eagle Eye tracked</h3>
    <p>${cs.tracked} The scan ran a <b>${cs.grid}</b> geo-grid on <b>${cs.map}</b> across ${cs.window}, so the result is the rank at every point of the area — not a single number.</p>
    <table class="cs-table">
      <thead><tr><th>Metric</th><th>Start (${cs.before.date})</th><th>Latest (${cs.after.date})</th><th>Change</th></tr></thead>
      <tbody>
        <tr><td><a href="/the-numbers/">LSOV</a> — grid points in the top 3</td><td>${pct(cs.before.lsov)}</td><td>${pct(cs.after.lsov)}</td><td>${delta(cs.before.lsov, cs.after.lsov)}</td></tr>
        <tr><td>ARP — avg rank where present</td><td>${cs.before.arp}</td><td>${cs.after.arp}</td><td>${delta(cs.before.arp, cs.after.arp, true)}</td></tr>
        <tr><td>ATRP — avg total rank (missing = 21)</td><td>${cs.before.atrp}</td><td>${cs.after.atrp}</td><td>${delta(cs.before.atrp, cs.after.atrp, true)}</td></tr>
      </tbody>
    </table>
    <h3>The result</h3>
    <p>${cs.result}</p>
    ${t}
    <p>Every figure above is a real Eagle Eye scan — the kind of before-and-after you can run on your own business for free. <a href="/how-it-works/">See how it works</a> · <a href="/pricing/">start free — your first scan is on us</a>.</p>`;
}

/** The /case-studies/ index body — lists whatever real studies exist. */
export function renderIndex(list) {
  if (!list.length) return '';
  const cards = list.map(cs => {
    const lift = +(cs.after.lsov - cs.before.lsov).toFixed(1);
    return `<li><a href="/case-studies/${cs.slug}/"><b>${cs.business}</b> — ${cs.industry}, ${cs.area}<span class="cs-lift">LSOV ${cs.before.lsov}% → ${cs.after.lsov}% (${lift > 0 ? '+' : ''}${lift})</span></a></li>`;
  }).join('\n      ');
  return `
    <h2>Real businesses, measured on the map</h2>
    <p>Every case study here is a real Eagle Eye scan history — the actual LSOV, ARP and ATRP a business moved, point by point across its area, on Google and Apple Maps. No mock-ups, no rounded-up marketing numbers.</p>
    <ul class="cs-index">
      ${cards}
    </ul>
    <p>Want your own before-and-after? <a href="/pricing/">Start free</a> — new accounts get 10 free scans and the first scan of your own site is free up to 21×21.</p>`;
}

/** Build the PAGES entries for the case-study section. Empty when CASE_STUDIES is empty. */
export function caseStudyPages() {
  if (!CASE_STUDIES.length) return [];
  const index = {
    slug: '/case-studies/', file: 'case-studies/index.html',
    title: 'Eagle Eye Case Studies — Real Local Rank Lifts',
    desc: 'Real Eagle Eye scan histories: the LSOV, ARP and ATRP local businesses moved on Google and Apple Maps, point by point across their area.',
    h1: 'Local SEO proof, measured on the map',
    lede: 'Real businesses, real geo-grid scans, real before-and-after — see what Eagle Eye measured.',
    sections: [], _intro: renderIndex(CASE_STUDIES),
  };
  const details = CASE_STUDIES.map(cs => ({
    slug: `/case-studies/${cs.slug}/`, file: `case-studies/${cs.slug}/index.html`,
    title: `${cs.business} — Eagle Eye Case Study`.slice(0, 60),
    desc: `${cs.industry} in ${cs.area}: LSOV ${cs.before.lsov}%→${cs.after.lsov}% on ${cs.map}, measured point-by-point with an Eagle Eye geo-grid scan.`.slice(0, 155),
    h1: `${cs.industry}, ${cs.area}`.slice(0, 48),
    lede: `How a ${cs.industry.toLowerCase()} business tracked its real local rank across ${cs.area} with a geo-grid.`,
    sections: [], _intro: renderCaseStudy(cs),
  }));
  return [index, ...details];
}
