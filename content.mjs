// Enrichment copy for the multi-page build. EVERY claim here traces to a feature already
// asserted on the live /app/welcome page (welcomeView, dashboard.js) — this expands and
// keyword-targets it for SEO, it does not introduce new claims. Keyword focus per page is
// noted in comments; the prose stays in Eagle Eye's voice.
const sec = (inner) => `<section class="wl-sec"><div class="wl-prose">${inner}</div></section>`;

// FAQPage schema from the extra Q&As (plus the on-page ones already rendered).
const extraFaq = [
  ['What is geo-grid rank tracking?', 'Instead of one rank for a keyword, Eagle Eye lays a grid of points over a business’s neighbourhood and runs a real Google Maps or Apple Maps search from each one. You see your rank street by street, because local results change with every block the searcher stands on.'],
  ['What grid sizes can I run?', 'From 9 × 9 up to 21 × 21 points. Sizes are always odd so the business sits on the exact centre point, with the same number of points on every side. A 21 × 21 grid is 441 searches in one sweep.'],
  ['Can I limit the scan to an area?', 'Yes. Set a radius from 0.1 mile and up, in miles or kilometres, and shape the scan as a square, a circle, or an area you draw. Points outside the shape are not searched and not charged.'],
  ['What alerts can I set?', 'Eagle Eye flags a fall in LSOV, a worsening rank, grid points dropping out of the top 20, or a rival taking the top 3 — as soon as a scan finds it, before the client does.'],
  ['What can I export?', 'A scan’s listings as CSV, your reports as PDF or CSV, and a time-lapse GIF of every run of a scan. Reports carry your own logo, colours and footer.'],
  ['Who can I add to an account?', 'Each organisation has owners, admins and members, and API keys so you can start scans and read results from your own code. Agencies keep one organisation per client, with a single credit balance paying for all.'],
];
const faqSchema = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: extraFaq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};
const faqDetails = extraFaq.map(([q, a]) =>
  `<details class="wl-q"><summary><span>${q}</span><i class="wl-plus" aria-hidden="true"></i></summary><p>${a}</p></details>`).join('');

export default {
  // keywords: geo-grid local rank tracking, local map rank tracker, Google & Apple Maps
  '/': { introHtml: sec(`
    <h2>Local map rank tracking, point by point</h2>
    <p>One rank for “pizza near me” is true from exactly one spot: your desk. On Google Maps and Apple Maps the top three change with every block the searcher is standing on, so a single number is a figure you can’t defend to a client. <b>Eagle Eye</b> is a <span class="wl-k">geo-grid rank tracker</span>: it lays a grid of up to 441 points over a business’s neighbourhood and runs a real map search from every one. You get the rank street by street — where it wins, where it drops off the map, and which rival is taking its customers there.</p>
    <p>Every scan folds the whole grid into three numbers a client actually remembers — <b>LSOV</b>, <b>ARP</b> and <b>ATRP</b> — maps every competitor that outranks you point by point, and keeps every run, so the trend builds itself. Built for the agencies and marketers who have to <a href="/how-it-works/">prove local SEO</a> to the people paying for it.</p>`) },

  // keywords: prove local SEO to clients, local rank tracking for agencies
  '/how-it-works/': { introHtml: sec(`
    <h2>Prove local SEO work, in three steps</h2>
    <p>Rankings are abstract; being found is not. Eagle Eye turns local SEO into something a client can see on a map: <b>find the gap</b> (where they’re invisible), <b>prove the lift</b> (the same scan on a schedule, LSOV climbing), and <b>report the win</b> (a branded PDF with your name on it). The steps below walk through each one.</p>`) },

  // keywords: geo-grid scan features, local rank tracking features
  '/features/': { introHtml: sec(`
    <h2>Everything a geo-grid scan gives you</h2>
    <p>One scan is a rank at every grid point, your <a href="/the-numbers/">LSOV, ARP and ATRP</a>, a competitor map for every rival, scheduled runs, campaigns, branded PDF and CSV reports, time-lapse GIFs, API keys and team seats — on <a href="/apple-maps-rank-tracking/">Google Maps and Apple Maps alike</a>. Below: what you can set, what you get back, and what keeps it running.</p>`) },

  // keywords: LSOV, ARP, ATRP, share of local voice
  '/the-numbers/': { afterHtml: sec(`
    <h2>What LSOV, ARP and ATRP mean</h2>
    <p><b class="wl-k">LSOV — Local Share of Voice.</b> The share of your grid points where you rank in the top 3. One number for how much of the neighbourhood actually sees the business near the top of the map. It’s the figure a client follows month to month.</p>
    <p><b class="wl-k">ARP — Average Rank where Present.</b> Your average position across only the points where you were found in the top 20. It tells you how high you rank where you rank at all.</p>
    <p><b class="wl-k">ATRP — Average Total Rank Position.</b> The same average, but every point where you’re missing counts as 21. It turns “not in the top 20” into a number that can improve — so the invisible parts of the map are measured, not ignored.</p>
    <p>A fourth figure is simply what the scan costs: one credit per grid point searched — 81 at 9 × 9, 441 at 21 × 21. Together they turn a grid of pins into an answer: how wide a business wins, how high it ranks, and what it costs to watch.</p>`) },

  // keywords: competitor map tracking, local search visibility data
  '/data-never-on-the-market/': { introHtml: sec(`
    <h2>The data an ordinary rank checker can’t show</h2>
    <p>Most rank tools give you a position and stop. A geo-grid scan records the ground-level map of a neighbourhood: every rival’s rank at every point, who was open when each point was searched, review counts moving between scans, and the full top 20 at each point with rating, category and address — up to 8,820 listings from one 21 × 21 scan. The six below come with every scan.</p>`) },

  // keywords: Apple Maps rank tracking, Apple Maps local SEO, Apple Business Connect
  '/apple-maps-rank-tracking/': { introHtml: sec(`
    <h2>Track Apple Maps the same way you track Google</h2>
    <p>Apple Maps sends real customers to local businesses, and almost no rank tool watches it. Eagle Eye does: the <b>same geo-grid</b>, the <b>same numbers</b>, at the <b>same price</b> as Google Maps — one credit per point, up to 441 points in a 21 × 21 scan.</p>
    <h3>One scan reads one map</h3>
    <p>Each scan searches a single map — Google Maps or Apple Maps — so your credits and your results stay clean and comparable. Run a business on both and you get two maps side by side: where it ranks on Google, where it ranks on Apple, and where the two disagree. For many local businesses the Apple picture is the one nobody has ever measured.</p>
    <h3>What’s the same, and the one difference</h3>
    <ul>
      <li><b>Same grid and shapes:</b> 9 × 9 to 21 × 21, any radius from 0.1 mile, square, circle or a drawn area.</li>
      <li><b>Same numbers:</b> LSOV, ARP and ATRP, the competitor map, the trend over time, and every export.</li>
      <li><b>Same automation:</b> schedules, campaigns, alerts and branded reports all run on Apple scans too.</li>
      <li><b>One difference:</b> Apple Maps doesn’t publish review counts, so none are shown for an Apple scan. Everything else is there.</li>
    </ul>
    <p>Put both maps on a schedule and prove your work across the whole local-search surface, not just half of it. <a href="/pricing/">See what Apple and Google scans cost</a> — they’re priced identically.</p>`) },

  // keywords: rank tracking pricing, pay per scan credits
  '/pricing/': { introHtml: sec(`
    <h2>One point, one search, one credit</h2>
    <p>Eagle Eye pricing is simple: every plan is a bucket of credits, and a scan spends one credit per grid point. A 9 × 9 scan is 81 credits; a 21 × 21 scan is 441. Points you switch off or cut outside a shape cost nothing, and a scan that can’t start is refunded. <b>Credits you buy never expire.</b> A new organisation starts with 10 free scans, and your first scan of your own website is free at any size up to 21 × 21. Set a grid and a rhythm below to see the cost and the plan that fits.</p>`) },

  // keywords: local rank tracking FAQ (long-tail)
  '/faq/': {
    afterHtml: sec(`<h2>More questions</h2>`) + `<section class="wl-sec wl-faqsec"><div class="wl-faq">${faqDetails}</div></section>`
      + `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`,
  },

  // keywords: Google Maps rank tracking, Google Maps local SEO, geo-grid Google
  '/google-maps-rank-tracking/': { introHtml: sec(`
    <h2>Where a business ranks on Google Maps, point by point</h2>
    <p>On Google Maps the three results in the local pack change with every block the searcher is standing on. One rank for “coffee near me” is true at one spot and nowhere else. <b>Eagle Eye</b> lays a grid of up to 441 points over a business and runs a real Google Maps search from every one, so you get the rank street by street — where it wins the pack, where it slips, and which rival is sitting in its place.</p>
    <h3>What one Google Maps scan gives you</h3>
    <ul>
      <li><b>Rank at every grid point</b>, 9 × 9 up to 21 × 21, on a real Google Maps search.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">the three numbers</a> that turn the grid into an answer a client remembers.</li>
      <li><b>A competitor map for every rival</b> that outranks you, point by point.</li>
      <li><b>Scheduled scans, branded reports, time-lapse and alerts</b> — the full toolkit, on Google.</li>
    </ul>
    <p>Prefer the other map? Eagle Eye tracks <a href="/apple-maps-rank-tracking/">Apple Maps</a> the same way, at the same price — run a business on both and compare them side by side. <a href="/pricing/">See what a scan costs</a>.</p>`) },

  // keywords: local rank tracking for agencies, white-label local SEO, agency geo-grid
  '/for-agencies/': { introHtml: sec(`
    <h2>Prove local SEO to every client</h2>
    <p>Clients don’t buy rankings; they buy being found. Eagle Eye turns that into something you can put in front of them: a map of where they show up across their whole neighbourhood, the share of it they own, and the lift you made month over month.</p>
    <h3>Built for the agency workflow</h3>
    <ul>
      <li><b>One organisation per client</b>, each with its own credit balance — never a client’s scans mixed with another’s.</li>
      <li><b>Team seats</b> — owners, admins and members, so your whole team works from the same scans.</li>
      <li><b>Branded, white-label reports</b> — every export carries <a href="/branded-reports/">your logo, colours and footer</a>, not ours.</li>
      <li><b>Scheduled scans and alerts</b> — <a href="/scheduled-rank-tracking/">set the cadence once</a> and get told when a client’s LSOV falls or a rival takes the top 3.</li>
      <li><b>An API</b> — <a href="/api/">pull the numbers</a> into your own dashboards and client portals.</li>
    </ul>
    <p>Managing more than one location per client? <a href="/multi-location-rank-tracking/">Track every branch on its own grid</a>. <a href="/pricing/">See the plans</a> — credits never expire, so a quiet month isn’t wasted.</p>`) },

  // keywords: multi-location rank tracking, franchise local SEO, chain geo-grid
  '/multi-location-rank-tracking/': { introHtml: sec(`
    <h2>Every location on its own grid</h2>
    <p>A chain doesn’t rank as one business — each location wins or loses its own neighbourhood. Eagle Eye scans every location on its own geo-grid and reports each on the same three numbers, so you can line them up and see at a glance which branches own their area and which are invisible a few blocks out.</p>
    <h3>Run a whole portfolio</h3>
    <ul>
      <li><b>A separate grid per location</b>, each with its own LSOV, ARP and ATRP.</li>
      <li><b>Competitor maps per location</b> — the rival beating you in one suburb is rarely the one beating you across town.</li>
      <li><b>Scheduled scans across the portfolio</b>, grouped into campaigns, with alerts when any location slips.</li>
      <li><b>Branded reports</b> per location, or rolled up for the brand.</li>
    </ul>
    <p>Running this for clients? <a href="/for-agencies/">Eagle Eye for agencies</a> keeps one organisation and one credit balance per client. <a href="/pricing/">See what scanning at scale costs</a> — one credit per grid point, nothing hidden.</p>`) },

  // keywords: local SEO for restaurants, restaurant map rank tracking, near me restaurants
  '/local-seo-for-restaurants/': { introHtml: sec(`
    <h2>Diners search on the map</h2>
    <p>“Pizza near me,” “best brunch,” “open now” — restaurant discovery happens on Google and Apple Maps, and the winner changes block by block. Eagle Eye shows you exactly which parts of an area find the restaurant first, and which hand the table to a competitor down the street.</p>
    <h3>What a scan tells a restaurant</h3>
    <ul>
      <li><b>Rank across the whole area</b> — not one pin, a grid of up to 441 points.</li>
      <li><b>LSOV</b> — the share of the neighbourhood that sees the restaurant in the top 3.</li>
      <li><b>A competitor map</b> — the rival restaurants taking the searches you’re missing, point by point.</li>
      <li><b>Both maps</b> — <a href="/google-maps-rank-tracking/">Google</a> and <a href="/apple-maps-rank-tracking/">Apple</a>, since diners use both.</li>
    </ul>
    <p>Put it on a <a href="/scheduled-rank-tracking/">schedule</a> and watch the map move as reviews come in and the listing is tuned. <a href="/pricing/">See what it costs</a>.</p>`) },

  // keywords: local SEO for dentists, dental practice map rank, medical local SEO
  '/local-seo-for-dentists/': { introHtml: sec(`
    <h2>Patients choose the practice they can find</h2>
    <p>When someone searches “dentist near me” or “emergency dentist,” the map decides who gets the call. Eagle Eye shows a dental or medical practice exactly where it ranks across its catchment — street by street — and where a competing clinic is being found instead.</p>
    <h3>What a scan tells a practice</h3>
    <ul>
      <li><b>Rank at every point</b> of the area patients actually search from.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">how much of the catchment</a> finds the practice near the top.</li>
      <li><b>Competitor maps</b> — which clinics win the blocks you don’t.</li>
      <li><b>Patient-ready branded reports</b> — a clean map and the numbers, with the practice’s own branding.</li>
    </ul>
    <p>Several clinics? <a href="/multi-location-rank-tracking/">Track each on its own grid</a>. <a href="/pricing/">See the plans</a>.</p>`) },

  // keywords: local SEO for home services, service area business, plumber HVAC contractor SEO
  '/local-seo-for-home-services/': { introHtml: sec(`
    <h2>Service-area businesses live on the map</h2>
    <p>A plumber, an HVAC company or a contractor has no storefront customers walk past — they have a service area, and the only thing that matters is which parts of it find them first on the map. Eagle Eye scans that whole area on a grid and shows, point by point, where the business ranks and where a competitor owns the call.</p>
    <h3>Why geo-grid matters for home services</h3>
    <ul>
      <li><b>No single pin tells the story</b> — a service-area business can rank #1 at its base and vanish three suburbs out. A grid shows both.</li>
      <li><b>LSOV</b> — the share of the service area that finds you in the top 3.</li>
      <li><b>Competitor maps</b> — the rival winning the neighbourhoods you’re not.</li>
      <li><b>Scheduled monitoring and alerts</b> — <a href="/scheduled-rank-tracking/">know the moment</a> you drop out of the pack in a key area.</li>
    </ul>
    <p>Covering a big region or several trades? <a href="/multi-location-rank-tracking/">Run each area on its own grid</a>. <a href="/pricing/">See what it costs</a>.</p>`) },

  // keywords: local SEO for law firms, attorney near me, legal map rank tracking
  '/local-seo-for-law-firms/': { introHtml: sec(`
    <h2>Clients search for a lawyer near them</h2>
    <p>“Personal injury lawyer near me,” “divorce attorney,” “DUI lawyer” — legal searches are intensely local, and the map pack is where the first calls come from. Eagle Eye shows a firm exactly which parts of its city find it on the map and which find a competitor instead.</p>
    <h3>What a scan tells a firm</h3>
    <ul>
      <li><b>Rank across the city</b> on a grid of up to 441 points, not a single position.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">the reach</a>, in numbers a partner can read.</li>
      <li><b>Competitor maps</b> — the firms taking the searches you’re missing, block by block.</li>
      <li><b>Both maps</b> — <a href="/google-maps-rank-tracking/">Google</a> and <a href="/apple-maps-rank-tracking/">Apple</a>.</li>
    </ul>
    <p>Report it with the firm’s branding using <a href="/branded-reports/">white-label reports</a>. <a href="/pricing/">See the plans</a>.</p>`) },

  '/local-seo-for-retail/': { introHtml: sec(`
    <h2>Win the walk-ins, don’t lose them next door</h2>
    <p>Every “shoe store near me” or “gift shop open now” that finds a competitor first is a sale that walked past your door. A one-number rank tool can’t tell you where that’s happening — retail is won block by block, and the map pack reorders with every corner a shopper stands on. <b>Eagle Eye</b> shows the exact streets where the store wins foot traffic and the ones handing it to the shop around the corner, on <b>both Google and Apple Maps</b> — the surface iPhone shoppers use and most stores never check.</p>
    <h3>Beat a generic rank checker</h3>
    <ul>
      <li><b>Rank on every block, not one number</b> — a tight grid from a 0.1-mile radius, so you see each street a shopper actually searches from.</li>
      <li><b>LSOV</b> — the share of the surrounding blocks that put the store in the top 3, one figure to grow.</li>
      <li><b>A competitor map for every rival</b> — exactly which shops are catching the “near me” searches you’re missing.</li>
      <li><b>Both maps, one price</b> — Google and Apple, so you win the shoppers a Google-only tool never sees.</li>
    </ul>
    <p>Start free: a new account gets 10 free scans, and your first scan of your own store is free up to 21 × 21 — no card, and credits you buy never expire. <a href="/pricing/">See what scanning costs</a> or track the iPhone side on <a href="/apple-maps-rank-tracking/">Apple Maps</a>.</p>`) },

  '/local-seo-for-auto-repair/': { introHtml: sec(`
    <h2>Catch the calls going to the shop down the road</h2>
    <p>A driver with a dead battery or a grinding brake doesn’t scroll — they call one of the first shops on the map and that’s the job. Every “mechanic near me” that ranks a competitor ahead of you is a tow-in you’ll never hear about, and a single rank number can’t show you where it’s slipping. <b>Eagle Eye</b> maps your rank across the whole radius drivers reach you from and names the shop winning the calls you’re losing, street by street.</p>
    <h3>See where you’re losing the job</h3>
    <ul>
      <li><b>Rank across your draw radius</b> — set the grid to the distance drivers come from: square, circle, or drawn to your area.</li>
      <li><b>A competitor map per rival</b> — the shops taking the urgent searches on the roads you don’t own.</li>
      <li><b>ATRP</b> — <a href="/the-numbers/">one number</a> for the stretches where you’re off the map entirely, so the gaps are measured, not guessed.</li>
      <li><b>Instant alerts</b> — hear it the moment you drop out of the top 20 on a route that feeds you work.</li>
    </ul>
    <p>Start free with 10 scans and a free first scan of your own shop up to 21 × 21 — credits never expire, so a slow month is never wasted. <a href="/scheduled-rank-tracking/">Put it on a schedule</a> or <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-real-estate/': { introHtml: sec(`
    <h2>Own the neighbourhoods your listings depend on</h2>
    <p>Sellers pick the agent who looks like they own the area — and the map pack decides who that is, differently in every farm. A single ranking hides the blocks where a rival working the same streets is being found first. <b>Eagle Eye</b> shows exactly which neighbourhoods put you on top of the map and which belong to the competition, so you win the listing calls instead of watching them go elsewhere.</p>
    <h3>See every farm you win and lose</h3>
    <ul>
      <li><b>Rank by neighbourhood, not one city-wide number</b> — a grid over each farm you work, you on the centre point.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">reach, height and gaps</a> in three numbers a brokerage understands.</li>
      <li><b>A competitor map per rival</b> — the agents owning the listings-rich blocks you want next.</li>
      <li><b>Branded, white-label reports</b> — hand a seller a clean map with your own logo and colours, not ours.</li>
    </ul>
    <p>Start free: 10 scans to begin, your first scan free up to 21 × 21, and credits that never expire. Working several farms or an office of agents? <a href="/multi-location-rank-tracking/">Run each on its own grid</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-gyms-and-fitness/': { introHtml: sec(`
    <h2>Stop losing joiners to the gym nearer their door</h2>
    <p>Nobody drives across town to work out, so every “gym near me” you lose goes to a studio a few blocks closer to someone’s home or work. One rank number can’t show you which blocks those are. <b>Eagle Eye</b> maps your whole membership catchment point by point and names the rival catching the joiners, so you can see — on <b>Google and Apple Maps alike</b> — exactly where the sign-ups are slipping away.</p>
    <h3>Win the catchment, not a single pin</h3>
    <ul>
      <li><b>Catchment rank</b> — a grid sized to the radius members actually travel, in miles or kilometres.</li>
      <li><b>LSOV</b> — the share of that catchment that sees the gym in the top 3, the number a push should move.</li>
      <li><b>A competitor map per rival</b> — the studios and franchises winning the blocks around you.</li>
      <li><b>Time-lapse GIF</b> — every scan stitched into a short clip, so a membership drive shows up as movement on the map.</li>
    </ul>
    <p>Start free with 10 scans and a free first scan of your own gym up to 21 × 21 — no card, credits never expire. See every rival with <a href="/competitor-rank-tracking/">competitor rank tracking</a> or <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-salons-and-spas/': { introHtml: sec(`
    <h2>Win the booking your block sends one street over</h2>
    <p>Beauty is booked by whoever’s nearby and whoever shows up first on the phone — usually an iPhone. Every “hair salon near me” or “balayage near me” that ranks the spa down the street ahead of you is a chair you didn’t fill. A single rank can’t show which blocks are costing you bookings. <b>Eagle Eye</b> shows the exact corners where you win and lose, and tracks <b>Apple Maps</b> — where iPhone clients book and almost no salon ever looks.</p>
    <h3>See where the bookings go</h3>
    <ul>
      <li><b>Hyperlocal rank</b> — a dense grid from a 0.1-mile radius, because a salon wins its own blocks, not the whole city.</li>
      <li><b>Both maps</b> — Apple as well as Google, so you win the iPhone bookers a Google-only tool misses.</li>
      <li><b>LSOV</b> — the share of those blocks that find the salon in the top 3.</li>
      <li><b>Rival alerts</b> — know the moment a competitor takes the top 3 on a block that fills your chairs.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own salon up to 21 × 21, and credits that never expire. Track the iPhone side on <a href="/apple-maps-rank-tracking/">Apple Maps</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-chiropractors/': { introHtml: sec(`
    <h2>Capture the patients searching in pain</h2>
    <p>Someone with a bad back picks a clinic near them off the map and books — usually before they scroll past the top three. Every “chiropractor near me” that ranks a competing clinic first is a new patient you lost without knowing. A one-number rank tool can’t find those gaps. <b>Eagle Eye</b> shows where your practice tops the catchment and, just as important, every block where it’s missing from the map entirely.</p>
    <h3>Find the patients you’re missing</h3>
    <ul>
      <li><b>Catchment rank</b> — a grid over the area patients search from, the clinic on the centre point.</li>
      <li><b>ATRP</b> — <a href="/the-numbers/">a single number</a> for the blocks where you don’t appear at all, turned into something you can watch move.</li>
      <li><b>A competitor map per rival</b> — the clinics taking the searches on the streets you don’t cover.</li>
      <li><b>Scheduled scans</b> — the same grid run monthly, so the catchment’s trend builds itself.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own clinic up to 21 × 21, and credits that never expire. See who wins each block with <a href="/competitor-rank-tracking/">competitor rank tracking</a>, then <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-veterinarians/': { introHtml: sec(`
    <h2>Be the first practice a panicked owner finds</h2>
    <p>A sick or injured pet turns an owner into an emergency caller, and they ring the first practice the map shows. Every “emergency vet” or “24 hour animal hospital” that ranks a clinic across town ahead of you is a visit — and a lifetime client — lost in seconds. A single rank can’t warn you when it slips. <b>Eagle Eye</b> shows where you rank across the catchment on <b>both Google and Apple Maps</b>, and tells you the instant you drop off the map on a block.</p>
    <h3>Never quietly fall off the map</h3>
    <ul>
      <li><b>Rank across the catchment</b> — a grid over the area owners search from, not one city-wide number.</li>
      <li><b>Drop-out alerts</b> — hear it the moment you fall out of the top 20 on a block, before a weekend of emergencies passes you by.</li>
      <li><b>A competitor map per rival</b> — the clinics winning the urgent searches you’re missing.</li>
      <li><b>Both maps</b> — owners search on Google and Apple alike when a pet is in trouble.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own practice up to 21 × 21, and credits that never expire. Set the watch with <a href="/scheduled-rank-tracking/">scheduled scans and alerts</a> or <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-roofers/': { introHtml: sec(`
    <h2>Win the storm calls across every neighbourhood</h2>
    <p>When weather moves through, “roofer near me” and “storm damage” spike across whole neighbourhoods at once — and they all go to whoever ranks first on the map. A roofer has no storefront, and a single map pin can’t show which of those neighbourhoods can actually find you, so the backlog goes to a rival. <b>Eagle Eye</b> scans your entire service area on a grid of up to 441 points and shows, block by block, where you win the calls and where you don’t.</p>
    <h3>See the whole service area, not one pin</h3>
    <ul>
      <li><b>One pin hides the area</b> — you can rank first at the yard and vanish in the suburbs the storm hit. A grid shows both.</li>
      <li><b>LSOV</b> — the share of the whole service area that finds you in the top 3.</li>
      <li><b>Seasonal scheduled scans</b> — run the grid through storm season and see demand shift before the backlog does.</li>
      <li><b>A competitor map per rival</b> — the roofers owning the neighbourhoods you’re invisible in.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own company up to 21 × 21, and credits that never expire — ready when the next storm hits. Roofing is a <a href="/local-seo-for-home-services/">service-area business</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-med-spas/': { introHtml: sec(`
    <h2>Take the high-value bookings a rival is winning</h2>
    <p>“Botox near me,” “lip filler near me,” “medspa” — these are urban, lucrative and brutally contested searches, and losing one by a few streets means losing a client worth thousands over time. A single rank tells you nothing about the block you’re losing a few corners away. <b>Eagle Eye</b> lays a tight grid over your market and shows exactly which competitor owns each street — so you compete where the money is, not where you guessed.</p>
    <h3>Out-rank a crowded map</h3>
    <ul>
      <li><b>Dense urban rank</b> — a grid tight enough to read a packed market block by block.</li>
      <li><b>A competitor map for every rival</b> — see who outranks you on which streets, no guessing.</li>
      <li><b>ARP</b> — <a href="/the-numbers/">how high you place</a> where you appear, the number that decides a high-value category.</li>
      <li><b>Branded PDF reports</b> — a clean map with your own logo, for a business where presentation sells.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own med spa up to 21 × 21, and credits that never expire. See the full field with <a href="/competitor-rank-tracking/">competitor rank tracking</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-hotels/': { introHtml: sec(`
    <h2>Win the room before a guest finds a rival</h2>
    <p>A traveller searching “hotels near me” is on the road, often on an iPhone, and the map answers differently from the airport, the highway and the city centre. Every search that ranks another property first is a booking — and the whole stay — gone. A single rank from your desk can’t see any of it. <b>Eagle Eye</b> shows where you rank from every place guests arrive, on <b>Google and Apple Maps alike</b>, so you win the room instead of the hotel next door.</p>
    <h3>Rank from every arrival point</h3>
    <ul>
      <li><b>Rank across the whole travel area</b> — a grid over the airport, the stations and the sights, not one position.</li>
      <li><b>Both maps, side by side</b> — travellers lean on Apple as much as Google; run both and compare.</li>
      <li><b>ARP</b> — <a href="/the-numbers/">how high the hotel places</a> where it appears across that area.</li>
      <li><b>A competitor map per rival</b> — the properties winning the searches from where your guests land.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own hotel up to 21 × 21, and credits that never expire. Track both surfaces on <a href="/apple-maps-rank-tracking/">Apple Maps</a> — then <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-cleaning-services/': { introHtml: sec(`
    <h2>Book the whole service area, not one street</h2>
    <p>A cleaning company never sees a walk-in — every job comes from a “house cleaning near me” or “maid service” search somewhere across its service area. A single map pin can’t tell you which suburbs actually find you, so the bookings you’re missing quietly go to a competitor. <b>Eagle Eye</b> scans the whole area on a grid and shows, point by point, where you win the booking and where a rival does.</p>
    <h3>See every suburb you win and lose</h3>
    <ul>
      <li><b>One pin hides the area</b> — rank first at your address and still be invisible in the suburbs you serve. A grid shows every one.</li>
      <li><b>LSOV</b> — the share of the whole service area that finds you in the top 3.</li>
      <li><b>A competitor map per rival</b> — the services winning the neighbourhoods you’re not.</li>
      <li><b>Drawn service area</b> — shape the scan to the exact area you cover: square, circle, or drawn by hand.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own company up to 21 × 21, and credits that never expire. Cleaning is a <a href="/local-seo-for-home-services/">service-area business</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-landscapers/': { introHtml: sec(`
    <h2>Own the service area before the spring rush</h2>
    <p>Landscaping demand swings hard with the seasons, and when “landscaper near me” and “lawn care service” start climbing, the calls go to whoever ranks first across the area. A single map pin can’t show which neighbourhoods find you when the phone wakes up — so a rival takes the season’s best jobs. <b>Eagle Eye</b> scans the whole service area on a grid and tracks it run after run, so you see the rush coming and own the map before it arrives.</p>
    <h3>Be ready when demand climbs</h3>
    <ul>
      <li><b>Service-area rank</b> — a grid over the whole area you cover, not one position at the yard.</li>
      <li><b>Scheduled scans</b> — run the grid monthly and watch rank build into spring and ease off after.</li>
      <li><b>LSOV</b> — the share of the service area that finds you in the top 3.</li>
      <li><b>A competitor map per rival</b> — the crews winning the neighbourhoods as the season turns.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own company up to 21 × 21, and credits that never expire — so a season you skip costs nothing. Catch the swing with <a href="/scheduled-rank-tracking/">scheduled scans</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-pest-control/': { introHtml: sec(`
    <h2>Win the jobs booked the same day</h2>
    <p>Someone who just found pests books fast and books local, from whichever company the map shows first. Every “exterminator” or “bed bug treatment” search that ranks a rival ahead of you is a same-day job gone. Pest control is a service area with no storefront, and one pin can’t tell you which neighbourhoods find you. <b>Eagle Eye</b> scans the whole area on a grid and shows where you win the urgent call and where a competitor takes it.</p>
    <h3>Don’t lose the urgent call</h3>
    <ul>
      <li><b>Service-area rank</b> — a grid across every neighbourhood you treat, not a single number.</li>
      <li><b>Rival alerts</b> — hear it the moment a competitor takes the top 3 on a block that sends you jobs.</li>
      <li><b>A competitor map per rival</b> — the companies winning the urgent searches you’re missing.</li>
      <li><b>ATRP</b> — <a href="/the-numbers/">the parts of the area</a> you’re invisible in, measured instead of ignored.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own company up to 21 × 21, and credits that never expire. Pest control is a <a href="/local-seo-for-home-services/">service-area business</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-electricians/': { introHtml: sec(`
    <h2>Catch the call the moment the power goes out</h2>
    <p>An electrical emergency is booked in minutes from the top of the map — nobody shops around when the lights are off. Every “emergency electrician” that ranks a rival first is urgent, well-paid work you never heard about. A service-area electrician has no storefront, and a single rank can’t show which neighbourhoods find you. <b>Eagle Eye</b> scans the whole area on a grid and shows, point by point, where you win the call and where a competitor does.</p>
    <h3>See where the emergency work goes</h3>
    <ul>
      <li><b>Service-area rank</b> — a grid across every area you cover, you on the centre point.</li>
      <li><b>Drop-out alerts</b> — know the instant you fall out of the top 20 on a block, before a night of emergencies.</li>
      <li><b>A competitor map per rival</b> — the electricians winning the urgent searches on streets you’re not on.</li>
      <li><b>LSOV</b> — the share of the service area that finds you in the top 3.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own business up to 21 × 21, and credits that never expire. Trades like this are classic <a href="/local-seo-for-home-services/">service-area businesses</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-hvac/': { introHtml: sec(`
    <h2>Own the map before the first heatwave</h2>
    <p>The day the weather breaks, “AC repair near me” and “furnace repair” spike at once — and they fall on whichever company ranks first across a whole service area. A single map pin can’t show which neighbourhoods find you when the rush hits, so a rival banks the overflow. <b>Eagle Eye</b> scans the area on a grid and tracks it over time, so you see the demand shift coming and hold the top of the map through the season.</p>
    <h3>Be first when demand spikes</h3>
    <ul>
      <li><b>Service-area rank</b> — a grid over every neighbourhood you serve, not one city-wide position.</li>
      <li><b>Scheduled scans</b> — run the grid through the season and watch rank move with the weather.</li>
      <li><b>Demand alerts</b> — hear it when LSOV falls or a rival takes the top 3 as the rush builds.</li>
      <li><b>ATRP</b> — <a href="/the-numbers/">where you’re off the map</a> across the area, as a number that can move.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own company up to 21 × 21, and credits that never expire — ready for the next season, not just this one. Catch the swing with <a href="/scheduled-rank-tracking/">scheduled scans</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-car-dealerships/': { introHtml: sec(`
    <h2>Win buyers from across the whole catchment</h2>
    <p>A car is worth a long drive, so a dealership pulls buyers from far wider than any coffee shop — and the map ranks it differently from every town in that reach. Every “Toyota dealer” or “used cars near me” that ranks a rival lot first in one of those towns is a sale that drove somewhere else. A single rank number can’t see across that catchment. <b>Eagle Eye</b> lays a wide grid over the whole reach and shows where you win and where you don’t.</p>
    <h3>Cover the reach a car buyer travels</h3>
    <ul>
      <li><b>Wide-catchment rank</b> — a 21 × 21 grid of up to 441 points, set to the real distance buyers come from.</li>
      <li><b>ARP</b> — <a href="/the-numbers/">how high the lot places</a> on the points where it appears across that reach.</li>
      <li><b>A competitor map per rival</b> — the dealerships winning the towns on the edge of your catchment.</li>
      <li><b>Both maps</b> — buyers research on Google and Apple long before they drive in.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own lot up to 21 × 21, and credits that never expire. Running a group of lots? <a href="/multi-location-rank-tracking/">Track each on its own grid</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-urgent-care/': { introHtml: sec(`
    <h2>Be the clinic “near me now” finds first</h2>
    <p>A worried patient searching “urgent care near me” or “walk in clinic open now” goes to the nearest one the map shows — a block too far down the pack and they’re at the clinic across the road instead. A single rank can’t warn you when you slip. <b>Eagle Eye</b> shows where you rank across the catchment on <b>both Google and Apple Maps</b>, and alerts you the instant you fall off the map on a block, before the walk-ins do.</p>
    <h3>Hold the top when it counts</h3>
    <ul>
      <li><b>Catchment rank</b> — a grid over the area patients search from, the clinic on the centre point.</li>
      <li><b>Drop-out alerts</b> — hear it the moment you fall out of the top 20 on a block.</li>
      <li><b>Both maps</b> — patients search on whichever phone is in their hand, Google or Apple.</li>
      <li><b>LSOV</b> — the share of the catchment that sees the clinic in the top 3 when it’s needed.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own clinic up to 21 × 21, and credits that never expire. Several sites? <a href="/multi-location-rank-tracking/">Track each on its own grid</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-coffee-shops/': { introHtml: sec(`
    <h2>Win the morning rush a block at a time</h2>
    <p>Nobody crosses town for a flat white — a café wins the people already on its block and the commuters passing it, and the map reorders at every corner. Every “coffee near me” that ranks the shop up the street first is a regular you never got. A single rank number can’t show you which corners you’re losing. <b>Eagle Eye</b> lays a tight grid over the immediate area and tracks <b>Apple Maps</b>, where commuters navigate and few cafés ever check.</p>
    <h3>Own the corners around you</h3>
    <ul>
      <li><b>Block-level rank</b> — the tightest grid, from a 0.1-mile radius, because coffee is won a block at a time.</li>
      <li><b>Both maps</b> — commuters run Apple Maps and CarPlay; win the ones a Google-only tool never sees.</li>
      <li><b>LSOV</b> — the share of the surrounding blocks that put the café in the top 3.</li>
      <li><b>A competitor map per rival</b> — the shops catching the walk-ins on the corners you don’t own.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own café up to 21 × 21, and credits that never expire — and a tight grid is a cheaper scan. Measure the commuter side on <a href="/apple-maps-rank-tracking/">Apple Maps</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-insurance-agents/': { introHtml: sec(`
    <h2>Win the local buyers who want a real agent</h2>
    <p>People buying insurance want a local agent they can sit across from — and the map pack decides which office they find across a town or two. Every “insurance agent near me” or “car insurance near me” that ranks a competing agent first is a quote that started somewhere else. A single rank can’t show where it’s happening. <b>Eagle Eye</b> shows where your agency ranks across its catchment and which rival is being found on the blocks it isn’t.</p>
    <h3>See every block you win and lose</h3>
    <ul>
      <li><b>Catchment rank</b> — a grid over the area the office serves, not one position for the whole metro.</li>
      <li><b>A competitor map per rival</b> — the agents winning the quote searches on streets you’re missing.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">reach, height and gaps</a> in three numbers a principal can read.</li>
      <li><b>Branded reports</b> — a clean map with your agency’s own logo and colours.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own agency up to 21 × 21, and credits that never expire. See the field with <a href="/competitor-rank-tracking/">competitor rank tracking</a> — <a href="/pricing/">see the plans</a>.</p>`) },

  '/local-seo-for-moving-companies/': { introHtml: sec(`
    <h2>Win the local moves and the long hauls</h2>
    <p>A mover takes local jobs from the neighbourhoods around its base and long-haul jobs from a much wider reach — and every “movers near me” or “long distance movers” search ranks it differently. Neither shows up in a single map pin, so the jobs you’re losing go to a rival unseen. <b>Eagle Eye</b> scans the service area on a grid and shows, point by point, where you win the move and where a competitor books it.</p>
    <h3>Cover both scales at once</h3>
    <ul>
      <li><b>Service-area rank</b> — a grid you size from the local blocks out to the wider long-haul reach.</li>
      <li><b>One pin hides the area</b> — rank first at the depot and still vanish in the suburbs you quote. A grid shows both.</li>
      <li><b>A competitor map per rival</b> — the movers winning the neighbourhoods and the towns you’re missing.</li>
      <li><b>LSOV</b> — the share of the whole service area that finds you in the top 3.</li>
    </ul>
    <p>Start free: 10 scans, a free first scan of your own company up to 21 × 21, and credits that never expire. Moving is a <a href="/local-seo-for-home-services/">service-area business</a> at two scales — <a href="/pricing/">see the plans</a>.</p>`) },

  // keywords: local pack tracking, 3-pack rank tracking, local pack geo-grid
  '/local-pack-tracking/': { introHtml: sec(`
    <h2>The local 3-pack is where the money is</h2>
    <p>The three results in the map pack take the clicks, the calls and the directions; everything below the fold might as well not be there. On Google Maps and Apple Maps that pack reorders with every block the searcher is standing on, so “we’re in the 3-pack” is true on some streets and false on others — and one rank number can’t tell you which. <b>Eagle Eye</b> lays a grid of up to 441 points over a business and runs a real map search from every one, so you see exactly where it holds the top 3 and where it slips off the pack.</p>
    <h3>What a scan shows about the pack</h3>
    <ul>
      <li><b>Top 3 at every grid point</b> — where the business makes the pack and where it doesn’t, street by street.</li>
      <li><b>LSOV</b> — <a href="/the-numbers/">the share of the grid</a> where it ranks in the top 3, one number for how much of the area sees it in the pack.</li>
      <li><b>A competitor map for every rival</b> in the pack — who takes the top 3 on the blocks you lose, point by point.</li>
      <li><b>An alert</b> the moment a rival takes the top 3, as soon as a scan finds it — before the client does.</li>
    </ul>
    <p>See the pack on a real business before you pay a cent: a new organisation gets 10 free scans, and your first scan of your own site is free at any size up to 21 × 21. <a href="/competitor-rank-tracking/">See who’s winning the pack</a>, then <a href="/pricing/">check what a scan costs</a> — credits never expire.</p>`) },

  // keywords: Google Business Profile rank tracking, GBP GMB map rank, business profile visibility
  '/google-business-profile-rank-tracking/': { introHtml: sec(`
    <h2>Your Business Profile doesn’t rank in one place</h2>
    <p>A Google Business Profile shows up near the top for some searchers and nowhere for others, because Google Maps reorders the local results by where the searcher is standing. A single “we rank #3” hides every block where the profile is invisible. <b>Eagle Eye</b> measures where a Business Profile actually appears across a whole area — a grid of up to 441 points, a real Google Maps search from each one, the rank of the listing street by street. It reads the rank; it doesn’t touch the profile.</p>
    <h3>What one scan reads</h3>
    <ul>
      <li><b>Rank at every grid point</b> on a real Google Maps search, 9 × 9 up to 21 × 21.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">how much of the area</a> finds the listing near the top.</li>
      <li><b>A competitor map for every rival profile</b> that outranks you, point by point.</li>
      <li><b>The same read on Apple Maps</b> when you want it — <a href="/apple-maps-rank-tracking/">one scan per map</a>, side by side.</li>
    </ul>
    <p>Measure your own profile for free first — a new organisation starts with 10 free scans, and your first scan of your own site is free up to 21 × 21. <a href="/how-it-works/">See how it works</a>, then <a href="/pricing/">see what a scan costs</a>.</p>`) },

  // keywords: near me rank tracking, near me local SEO, near me map rank
  '/near-me-rank-tracking/': { introHtml: sec(`
    <h2>“Near me” moves with the person searching</h2>
    <p>“Plumber near me” has no single answer — “near me” is wherever the searcher is standing, and the map pack recomputes for every one of them. Check that search from your office and you learn your rank at your office and nowhere else. <b>Eagle Eye</b> runs it from a grid of up to 441 real locations across the area, so you see the “near me” rank the way customers actually get it: block by block, not one number from your desk.</p>
    <h3>Why “near me” needs a grid</h3>
    <ul>
      <li><b>One rank is one location</b> — “near me” is thousands; a grid samples the whole area in one scan.</li>
      <li><b>Rank at every point</b>, on <a href="/rank-tracking-for-google-and-apple-maps/">Google Maps and Apple Maps alike</a>.</li>
      <li><b>LSOV</b> — the share of the area where “near me” puts the business in the top 3.</li>
      <li><b>A competitor map</b> — which rival wins “near me” on the blocks you don’t.</li>
    </ul>
    <p>New to the grid? <a href="/what-is-geo-grid-rank-tracking/">See how geo-grid tracking works</a>. Then run your own “near me” search for free — 10 free scans on a new organisation, your first own-site scan free up to 21 × 21. <a href="/pricing/">See what a scan costs</a>.</p>`) },

  // keywords: competitor rank tracking, local competitor map, per-rival rank tracking
  '/competitor-rank-tracking/': { introHtml: sec(`
    <h2>See exactly which rival wins each block</h2>
    <p>“You rank #5” tells you nothing about who’s sitting in #1, #2 and #3 — or whether it’s the same competitor across the whole area or a different one street by street. <b>Eagle Eye</b> draws a competitor map for every rival that outranks you: their rank at every point of the same grid, over the same area, so you can see precisely where each one beats you and where they fall away.</p>
    <h3>What per-rival mapping shows</h3>
    <ul>
      <li><b>A separate competitor map for each rival</b> that outranks you — their rank at every grid point, not a flat league table.</li>
      <li><b>Which rival takes the top 3</b> on the blocks you’re missing, point by point across the area.</li>
      <li><b>Both maps</b> — compare rivals on <a href="/google-maps-rank-tracking/">Google</a> and on <a href="/apple-maps-rank-tracking/">Apple Maps</a>.</li>
      <li><b>An alert</b> the moment any rival takes the top 3, as soon as a <a href="/scheduled-rank-tracking/">scheduled scan</a> finds it.</li>
    </ul>
    <p>Fold it all into the one number a client follows with <a href="/the-numbers/">LSOV, ARP and ATRP</a>. Map the competition on a real business for free — 10 free scans on a new organisation, first own-site scan free up to 21 × 21. <a href="/pricing/">See what a scan costs</a>.</p>`) },

  // keywords: share of local voice, LSOV, local share of voice reporting
  '/share-of-local-voice/': { introHtml: sec(`
    <h2>One number your client actually remembers</h2>
    <p>A client or a boss doesn’t want forty rank changes; they want to know one thing — is the business winning the map or losing it. <b>LSOV — Local Share of Voice</b> is that number: the share of a scan’s grid points where the business ranks in the top 3. One figure for how much of the neighbourhood sees it near the top of the map, and the one line to open every report with.</p>
    <h3>Why LSOV is the number to report</h3>
    <ul>
      <li><b>It folds a whole grid</b> — up to 441 points — into a single percentage anyone can follow.</li>
      <li><b>It’s built on the top 3</b>, the only positions that get the clicks and the calls.</li>
      <li><b>It moves run over run</b>, so the trend is obvious without reading the map — <a href="/scheduled-rank-tracking/">put the scan on a schedule</a> and it builds itself.</li>
      <li><b>It sits beside ARP and ATRP</b> when you need the detail — <a href="/the-numbers/">all three explained</a>.</li>
    </ul>
    <p>Reporting LSOV to clients all day? <a href="/for-agencies/">Eagle Eye for agencies</a> puts it in a <a href="/branded-reports/">branded report</a> with your name on it. Measure your first LSOV for free — 10 free scans on a new organisation, first own-site scan free up to 21 × 21. <a href="/pricing/">See the plans</a>.</p>`) },

  // keywords: geo-grid vs keyword rank tracking, grid vs single rank, local rank method
  '/geo-grid-vs-keyword-rank-tracking/': { introHtml: sec(`
    <h2>A grid answers what a single rank can’t</h2>
    <p>Keyword rank tracking gives one position for a keyword — true from one spot, on one map. For a local business that single number hides the thing that matters: the map pack changes with every block the searcher is standing on. A <b>geo-grid</b> runs the same search from many points at once, so instead of one figure you get a map of where the business wins and where it vanishes. <b>Eagle Eye</b> is built this way from the ground up.</p>
    <h3>Single rank vs geo-grid</h3>
    <ul>
      <li><b>Coverage:</b> one rank is one location; a geo-grid samples up to 441 across the whole area in one scan.</li>
      <li><b>The blind spots:</b> one number can’t show where you drop off the map; a grid shows every blank block.</li>
      <li><b>The maps:</b> a keyword check is one map; a grid scan reads <a href="/rank-tracking-for-google-and-apple-maps/">Google or Apple</a> the same way.</li>
      <li><b>The rivals:</b> a single position names no one; a grid gives a <a href="/competitor-rank-tracking/">competitor map for each rival</a>.</li>
    </ul>
    <p>Want the mechanics first? <a href="/what-is-geo-grid-rank-tracking/">What geo-grid rank tracking is</a>, and <a href="/the-numbers/">the three numbers</a> a grid produces. See the difference on a real business free — 10 free scans on a new organisation, first own-site scan free up to 21 × 21. <a href="/pricing/">See what a scan costs</a>.</p>`) },

  // keywords: time-lapse rank tracking, rank tracking GIF, local rank trend over time
  '/time-lapse-rank-tracking/': { introHtml: sec(`
    <h2>Watch a month of rankings move in one GIF</h2>
    <p>A single scan is a snapshot; the proof of your work is the movement. Put a scan on a schedule and <b>Eagle Eye</b> keeps every run, then stitches them into a <b>time-lapse GIF</b> — the grid changing colour over weeks, so a month of progress reads in three seconds without opening a spreadsheet.</p>
    <h3>What the time-lapse shows</h3>
    <ul>
      <li><b>Every run of a scan</b>, stitched into one short GIF — the whole trend at a glance.</li>
      <li><b>The grid shifting point by point</b> as the business gains or loses the top 3 over time.</li>
      <li><b>Proof you can drop straight into a report</b> — <a href="/branded-reports/">branded with your logo</a>.</li>
      <li><b>Built from scheduled scans</b> — <a href="/scheduled-rank-tracking/">set the rhythm once</a> and every run is kept.</li>
    </ul>
    <p>The trend is only as good as the numbers under it — see <a href="/the-numbers/">LSOV, ARP and ATRP</a>. Start building your own time-lapse free — 10 free scans on a new organisation, first own-site scan free up to 21 × 21. <a href="/pricing/">See the plans</a> — credits never expire.</p>`) },

  // keywords: Google and Apple Maps rank tracking, both maps rank tracker, Apple + Google local SEO
  '/rank-tracking-for-google-and-apple-maps/': { introHtml: sec(`
    <h2>Both maps, one tool</h2>
    <p>Most rank checkers watch Google and stop — but Apple Maps sends real customers to local businesses, and for many of them nobody has ever measured it. <b>Eagle Eye</b> tracks both the same way: the <b>same geo-grid</b>, the <b>same numbers</b>, the <b>same price</b> — one credit per point, whether the scan reads Google Maps or Apple Maps.</p>
    <h3>The same scan on either map</h3>
    <ul>
      <li><b>One scan reads one map</b> — Google or Apple — so your credits and your results stay clean and comparable.</li>
      <li><b>Same grid and shapes:</b> 9 × 9 to 21 × 21, any radius from 0.1 mile, square, circle or a drawn area.</li>
      <li><b>Same numbers:</b> <a href="/the-numbers/">LSOV, ARP and ATRP</a>, the competitor map, and every export.</li>
      <li><b>One difference:</b> Apple Maps doesn’t publish review counts, so none are shown on an Apple scan. Everything else is there.</li>
    </ul>
    <p>Run a business on both and compare the two side by side: <a href="/google-maps-rank-tracking/">Google Maps tracking</a> and <a href="/apple-maps-rank-tracking/">Apple Maps tracking</a>. Measure the whole surface free to start — 10 free scans on a new organisation, first own-site scan free up to 21 × 21. <a href="/pricing/">See what a scan costs</a> — both maps are priced identically.</p>`) },

  // keywords: geo-grid scan sizes, grid size 9x9 21x21, scan radius shape credits
  '/geo-grid-scan-sizes-explained/': { introHtml: sec(`
    <h2>How big should your grid be?</h2>
    <p>A geo-grid scan is as wide and as fine as you set it. The grid runs from <b>9 × 9 (81 points)</b> up to <b>21 × 21 (441 points)</b>, always an odd number so the business sits dead centre with the same reach on every side. And because every point is one credit, the size you pick is also what the scan costs — so a grid is a choice between how much area you cover and how much you spend.</p>
    <h3>Setting the scan</h3>
    <ul>
      <li><b>Grid:</b> 9 × 9 (81 points) to 21 × 21 (441) — wider covers more area, finer resolves more detail.</li>
      <li><b>Radius:</b> from 0.1 mile and up, in miles or kilometres, measured out from the centre point.</li>
      <li><b>Shape:</b> a square, a circle, or an area you draw — points outside it aren’t searched and aren’t charged.</li>
      <li><b>Cost:</b> one credit per point searched — 81 at 9 × 9, 441 at 21 × 21 — and the credits you buy never expire.</li>
    </ul>
    <p>Not sure what the points add up to? <a href="/the-numbers/">LSOV, ARP and ATRP</a> turn any grid size into the same three numbers. Try a size on your own business for nothing — your first scan of your own site is free at any size up to 21 × 21, and a new organisation starts with 10 free scans. <a href="/pricing/">See the cost by grid and cadence</a>.</p>`) },

  // keywords: local SEO reporting, branded rank report, client reporting guide
  '/local-seo-reporting-guide/': { introHtml: sec(`
    <h2>Turn a scan into a report that keeps the client</h2>
    <p>Clients don’t renew on rankings they can’t see; they renew on a clear picture of being found. <b>Eagle Eye</b> turns a scan into exactly that — the geo-grid map, the three numbers, and the competitor picture — exported as a <b>branded PDF or CSV</b> carrying your logo, your colours and your footer, not ours. You hand over a report, not a screenshot.</p>
    <h3>What goes in a client-ready report</h3>
    <ul>
      <li><b>The geo-grid map</b> — where they win the top 3 and where they don’t, in one glance.</li>
      <li><b>LSOV, ARP and ATRP</b> — <a href="/the-numbers/">the reach in numbers</a> a client remembers.</li>
      <li><b>A time-lapse GIF</b> — a month of movement as a short film, so progress is undeniable.</li>
      <li><b>Your branding throughout</b> — PDF or CSV, your logo, colours and footer, every time.</li>
    </ul>
    <p>Reporting to a roster of clients? <a href="/for-agencies/">Eagle Eye for agencies</a> keeps one organisation per client, and <a href="/scheduled-rank-tracking/">scheduled scans</a> mean the report is ready before the call. See the full export on your own business free — 10 free scans on a new organisation, first own-site scan free up to 21 × 21. <a href="/pricing/">See the plans</a>.</p>`) },

  // keywords: what is geo-grid rank tracking, geo grid local SEO, map grid rank tracker
  '/what-is-geo-grid-rank-tracking/': { introHtml: sec(`
    <h2>One keyword, one map, every point</h2>
    <p><b>Geo-grid rank tracking</b> measures where a business ranks on a map search from many locations at once, instead of from a single spot. A grid of points is laid over the business’s area, and a real Google Maps or Apple Maps search runs from every one. The result is a map of the rank itself — green where the business wins the local pack, darker where it falls away — because local results change with every block the searcher is standing on.</p>
    <h3>Why one rank isn’t enough</h3>
    <p>A plain rank checker tells you the position for “dentist near me” from one place. Move three blocks and the answer is different; the map pack reorders by where the searcher stands. A single number hides that entirely. A geo-grid makes it visible: you see the streets a business owns, the streets it’s invisible on, and exactly where a competitor is being found instead.</p>
    <h3>How a geo-grid scan works</h3>
    <ul>
      <li><b>Pick a grid.</b> From 9 × 9 (81 points) up to 21 × 21 (441), with the business on the centre point. Set a radius and shape — square, circle, or an area you draw.</li>
      <li><b>Run real searches.</b> Each point runs an actual map search and records the full local ranking there — on <a href="/google-maps-rank-tracking/">Google</a> or <a href="/apple-maps-rank-tracking/">Apple</a>.</li>
      <li><b>Read the map and the numbers.</b> The grid folds into <a href="/the-numbers/">LSOV, ARP and ATRP</a>, and every rival that outranks you gets its own competitor map.</li>
      <li><b>Watch it over time.</b> <a href="/scheduled-rank-tracking/">Schedule the scan</a> and the trend builds itself, run over run.</li>
    </ul>
    <p>It costs one credit per grid point, and in Eagle Eye those credits never expire. New terms along the way are defined in the <a href="/local-seo-glossary/">local SEO glossary</a>. Ready to see it on a real business? <a href="/how-it-works/">How Eagle Eye works</a> · <a href="/pricing/">what a scan costs</a>.</p>`) },

  // keywords: branded local SEO reports, white-label rank report, agency reporting
  '/branded-reports/': { introHtml: sec(`
    <h2>Hand a client a report, not a screenshot</h2>
    <p>Every Eagle Eye scan exports as a report a client can read on their own — the geo-grid map, the three numbers, and the competitor picture — carrying <b>your</b> logo, <b>your</b> colours and <b>your</b> footer, not ours.</p>
    <h3>What you can export</h3>
    <ul>
      <li><b>Branded PDF</b> — the map and the numbers, ready to send or present.</li>
      <li><b>CSV</b> — the scan’s listings and points, for your own spreadsheets and dashboards.</li>
      <li><b>Time-lapse GIF</b> — every run of a scan as a short film, so progress is obvious at a glance.</li>
    </ul>
    <p>White-label reporting is why agencies run Eagle Eye — <a href="/for-agencies/">see the agency workflow</a>. Prefer to pull the raw data into your own tools? <a href="/api/">Use the API</a>. <a href="/pricing/">See the plans</a>.</p>`) },

  // keywords: scheduled rank tracking, rank tracking alerts, local SEO monitoring campaigns
  '/scheduled-rank-tracking/': { introHtml: sec(`
    <h2>Set it once, watch the trend build</h2>
    <p>A single scan is a snapshot. The value is in the trend, and Eagle Eye builds it for you: put a scan on a schedule, group related scans into a campaign, and let it run — every result is kept, so the line climbs (or falls) on its own.</p>
    <h3>Schedules, campaigns and alerts</h3>
    <ul>
      <li><b>Schedules</b> — run a scan daily, weekly or monthly without touching it.</li>
      <li><b>Campaigns</b> — group a client’s or a location’s scans so the whole picture moves together.</li>
      <li><b>Alerts</b> — get told the moment LSOV falls, a rank worsens, grid points drop out of the top 20, or a rival takes the top 3. You hear it before the client does.</li>
    </ul>
    <p>Every scheduled run still exports as a <a href="/branded-reports/">branded report</a>. <a href="/pricing/">See the plans</a> — credits never expire, so a paused schedule costs nothing.</p>`) },

  // keywords: Eagle Eye API, local rank tracking API, geo-grid data integration
  '/api/': { introHtml: sec(`
    <h2>Rank data from your own code</h2>
    <p>Everything Eagle Eye does in the app, it can do from your own code. Create API keys, start a scan, and read the results — the points, the ranks, the competitor data — straight into your own dashboards, client portals and workflows.</p>
    <h3>What the API is for</h3>
    <ul>
      <li><b>Start scans programmatically</b> — kick off a geo-grid scan from your own system.</li>
      <li><b>Read the results</b> — pull LSOV, ARP, ATRP and the per-point ranks for a scan.</li>
      <li><b>Build it into your stack</b> — feed the numbers into the dashboards and reports your clients already see.</li>
      <li><b>Your own keys</b> — issued per organisation, under your team’s control.</li>
    </ul>
    <p>Agencies use the API to put live local-rank data into client portals — <a href="/for-agencies/">see the agency workflow</a>. <a href="/pricing/">See the plans</a>.</p>`) },

  // keywords: local SEO glossary, LSOV ARP ATRP meaning, geo-grid definitions
  '/local-seo-glossary/': { introHtml: sec(`
    <h2>The words behind the map</h2>
    <p>Local map rank tracking has its own vocabulary. Here it is in plain language — every term as Eagle Eye uses it.</p>
    <h3>Geo-grid rank tracking</h3><p>Instead of one rank for a keyword, a grid of points is laid over a business and a real map search is run from each one. The result is the rank <i>street by street</i>, because local results change with every block the searcher stands on.</p>
    <h3>Grid / grid point</h3><p>The lattice of search locations in a scan, from 9 × 9 (81 points) to 21 × 21 (441). Each point is one real map search, and one credit.</p>
    <h3>LSOV — Local Share of Voice</h3><p>The share of a scan’s grid points where the business ranks in the top 3. One number for how much of the neighbourhood sees it near the top. <a href="/the-numbers/">More on the numbers</a>.</p>
    <h3>ARP — Average Rank where Present</h3><p>The average position across only the points where the business appears in the top 20 — how high it ranks where it ranks at all.</p>
    <h3>ATRP — Average Total Rank</h3><p>The same average, but every point where the business is missing counts as 21, so the blank parts of the map are measured instead of ignored.</p>
    <h3>Local pack</h3><p>The block of (usually three) map results shown above the regular links for a local search. Appearing in it is what LSOV measures.</p>
    <h3>Competitor map</h3><p>A geo-grid map of a rival’s rank at every point of the same scan — where they beat you and where they don’t.</p>
    <h3>Service-area business (SAB)</h3><p>A business that serves customers across an area rather than at a storefront — a plumber, an HVAC company, a mobile service. Geo-grid tracking matters most here, because a single pin hides the whole area. <a href="/local-seo-for-home-services/">More on home services</a>.</p>
    <h3>Credit</h3><p>The unit a scan spends: one credit per grid point searched. An 81-point scan costs 81 credits; a 441-point scan costs 441. <a href="/pricing/">Credits never expire</a>.</p>
    <h3>Time-lapse</h3><p>Every run of a scan stitched into a short GIF, so a month of movement reads at a glance.</p>
    <p>Ready to see it on a real business? <a href="/how-it-works/">How Eagle Eye works</a>.</p>`) },
};
