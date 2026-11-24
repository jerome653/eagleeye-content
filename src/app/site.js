/* site.js — the welcome page's behaviour for the static marketing pages. Mirrors
   dashboard.js wlHeader (scrolled bar, dropdown, phone menu) and wlFeel (glow that
   follows the pointer, magnetic buttons, the red cursor light) plus the reveal-on-scroll.
   The pages are complete without it: every link and every word is in the HTML. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var born = performance.now();

  // ---- the app's helpers (dashboard.js h, RANK_BAND, GRID_SIZES) ----
  function h(tag, attrs) {
    var el = document.createElement(tag), kids = [].slice.call(arguments, 2);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    (function add(list) { list.forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      if (Array.isArray(kid)) add(kid); else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }); })(kids);
    return el;
  }
  var RANK_BAND = function (r) { return r === null || r === undefined ? 'rx' : r <= 3 ? 'r1' : r <= 7 ? 'r2' : r <= 10 ? 'r3' : r <= 15 ? 'r4' : r <= 20 ? 'r5' : 'rx'; };
  var GRID_SIZES = [9, 11, 13, 15, 17, 19, 21];
  var lcg = function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  var range = function (n, f) { var a = []; for (var i = 0; i < n; i++) a.push(f(i)); return a; };
  var APP = (document.querySelector('.wl') && document.querySelector('.wl').getAttribute('data-app')) || '/app';

  // ---- THE PICTURES: welcomeView's small art pieces, drawn into [data-art] ----
  var miniGrid = function (n, seedv) {
    var rr = lcg(seedv), m = (n - 1) / 2;
    return h('div', { class: 'hs-grid', style: '--n:' + n }, range(n * n, function (i) {
      var r = Math.floor(i / n), c = i % n, ring = Math.max(Math.abs(r - m), Math.abs(c - m));
      var rank = ring === 0 ? 1 : Math.round([0, 1, 3, 7, 11][ring] + rr() * [0, 3, 6, 10, 12][ring]);
      return h('i', { class: 'wl-cell ' + RANK_BAND(rank > 20 ? null : rank) + (ring === 0 ? ' pin' : ''), style: '--r:' + ring });
    }));
  };
  var RING_C = ['#FF2A2E', '#FF2A2E', '#FF2A2E', '#C8181C', '#C8181C', '#C8181C', '#8E1114', '#8E1114', '#5A0B0D', '#5A0B0D', '#3A0809'];
  var ART = {
    grid: function () { return miniGrid(9, 31); },
    gauge: function () { return h('div', { class: 'hs-gauge', style: '--v:38.3' }, h('b', {}, '38.3%'), h('small', {}, 'LSOV')); },
    pair: function () { return h('div', { class: 'hs-pair' }, [['ARP', '4.6', 78], ['ATRP', '7.9', 58]].map(function (x) {
      return h('div', {}, h('small', {}, x[0]), h('b', {}, x[1]), h('span', { class: 'hs-meter' }, h('i', { style: 'width:' + x[2] + '%' }))); })); },
    comp: function () { return h('ol', { class: 'hs-comp' }, [['Napoli Express', 92], ['Slice House', 83], ["Tony's Brick Oven", 55], ["Joe's Pizza", 40]].map(function (x, i) {
      return h('li', { class: i === 3 ? 'me' : null }, h('span', {}, String(i + 1)), h('b', {}, x[0]), h('i', { style: '--w:' + x[1] + '%' })); })); },
    cal: function () { return h('div', { class: 'hs-cal' }, range(28, function (i) { return h('i', { class: [2, 9, 16, 23].indexOf(i) >= 0 ? 'on' : (i === 25 ? 'next' : null) }); })); },
    camp: function () { return h('div', { class: 'hs-camp' }, [['Downtown', '12 scans', 82], ['Riverside', '8 scans', 61], ['Airport', '5 scans', 34]].map(function (x) {
      return h('div', {}, h('b', {}, x[0]), h('small', {}, x[1]), h('span', { class: 'hs-meter' }, h('i', { style: 'width:' + x[2] + '%' }))); })); },
    pdf: function () { return h('div', { class: 'hs-pdf' }, h('div', { class: 'hs-page' }, h('span', { class: 'hs-logo' }), h('i', { class: 'l1' }), h('i', { class: 'l2' }),
      miniGrid(7, 5), h('i', { class: 'l3' }), h('i', { class: 'l2' })), h('div', { class: 'hs-page back' })); },
    lapse: function () { return h('div', { class: 'hs-lapse' }, [11, 23, 47].map(function (sv, i) { return h('div', { class: 'hs-frame', style: '--i:' + i }, miniGrid(7, sv)); })); },
    code: function () { return h('pre', { class: 'hs-code' }, h('span', { class: 'k' }, 'POST'), ' /app/api/scans\n', h('span', { class: 'c' }, 'Authorization: Bearer eek_…'), '\n\n',
      h('span', { class: 'c' }, '{'), ' "keyword": ', h('span', { class: 's' }, '"pizza near me"'), ',\n  "grid": ', h('span', { class: 'n' }, '9'), ' ', h('span', { class: 'c' }, '}')); },
    team: function () { return h('div', { class: 'hs-team' }, ['JM', 'AR', 'KS', 'LT', '+3'].map(function (t, i) { return h('span', { style: '--i:' + i }, t); })); },
    maps: function () { return h('div', { class: 'hs-maps' }, h('span', { class: 'g' }, 'Google Maps'), h('i', {}), h('span', { class: 'a' }, 'Apple Maps')); },
    ten: function () { return h('div', { class: 'fa-ten' }, range(10, function (i) { return h('i', { style: '--i:' + i }); })); },
    heat: function () {
      var r2 = lcg(7), cells = [];
      for (var r = 0; r < 7; r++) for (var c = 0; c < 7; c++) {
        var ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        var rank = ring === 0 ? 1 : Math.round([0, 1, 3, 8][ring] + r2() * [0, 3, 6, 13][ring]);
        cells.push(h('i', { class: 'wl-cell ' + RANK_BAND(rank > 20 ? null : rank) + (ring === 0 ? ' pin' : '') }));
      }
      return h('div', { class: 'wl-heat' }, h('div', { class: 'wl-heat-grid' }, cells),
        h('div', { class: 'wl-heat-keys' }, [['r1', '1–3'], ['r2', '4–7'], ['r3', '8–10'], ['r4', '11–15'], ['r5', '16–20'], ['rx', '20+']]
          .map(function (x) { return h('span', {}, h('i', { class: 'wl-cell ' + x[0] }), x[1]); })));
    },
    proof: function () { return h('div', { class: 'wl-proof' },
      h('div', { class: 'wl-proof-h' }, h('small', {}, 'LSOV · example'), h('b', {}, '12% → 44%'), h('em', { class: 'up' }, '▲ 32 pts in 12 scans')),
      h('div', { class: 'wl-spark' }, [12, 15, 14, 19, 23, 22, 27, 31, 30, 36, 41, 44].map(function (v, i) { return h('i', { style: '--h:' + (v * 2) + '%;--i:' + i }); })),
      h('div', { class: 'wl-proof-x' }, h('small', {}, 'Scan 1'), h('small', {}, 'Scan 12'))); },
    report: function () { return h('div', { class: 'wl-report' },
      h('div', { class: 'wl-rep-top' }, h('span', { class: 'wl-rep-logo' }, 'YOUR LOGO'), h('small', {}, 'Monthly report')),
      h('b', {}, "Joe's Pizza · “pizza near me”"),
      h('div', { class: 'wl-rep-kpis' },
        h('span', {}, h('small', {}, 'LSOV'), h('b', {}, '38.3%'), h('em', { class: 'up' }, '▲ 6.1')),
        h('span', {}, h('small', {}, 'ARP'), h('b', {}, '4.6')),
        h('span', {}, h('small', {}, 'Rivals'), h('b', {}, '3'), h('em', {}, 'above you'))),
      h('div', { class: 'wl-rep-rows' }, [['Mar 3', '38.3%', '4.6'], ['Feb 3', '32.2%', '5.4']].map(function (x) {
        return h('span', {}, h('small', {}, x[0]), h('b', {}, x[1]), h('small', {}, 'ARP ' + x[2])); }))); },
    'fa-grid': function () { return h('div', { class: 'fa-grid' }, range(441, function (i) {
      var ring = Math.max(Math.abs(Math.floor(i / 21) - 10), Math.abs(i % 21 - 10));
      return h('i', { style: '--d:' + (ring * 70) + 'ms;--c:' + RING_C[ring] }); })); },
    'fa-list': function () { return h('div', { class: 'fa-list' }, range(20, function (i) { return h('i', { class: i === 3 ? 'me' : null, style: '--i:' + i + ';--w:' + (96 - i * 3.2) + '%' }); })); },
    'fa-one': function () { return h('div', { class: 'fa-one' }, h('span', {}), h('span', { class: 'b' }), h('i', {})); },
    'fa-ten': function () { return h('div', { class: 'fa-ten' }, range(10, function (i) { return h('i', { style: '--i:' + i }); })); },
  };
  function paintArt(page) {
    [].forEach.call(page.querySelectorAll('[data-art]'), function (el) {
      var k = el.getAttribute('data-art'); if (k === 'shot' || !ART[k] || el.childElementCount) return;
      el.appendChild(ART[k]());
    });
    // An Only-in-Eagle-Eye row of figures lights its pictures as it comes on screen.
  }

  // ---- THE PRODUCT SHOT: cells ring by ring out of the pin, read out on hover (welcomeView) ----
  function wireShot(page) {
    var grid = page.querySelector('.wl-grid[data-art="shot"]'); if (!grid) return;
    var readout = grid.closest('.wl-mapcol').querySelector('.wl-readout');
    var N = 9, mid = 4, rnd = lcg(23);
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) (function (r, c) {
      var ring = Math.max(Math.abs(r - mid), Math.abs(c - mid));
      if (ring === 0) { grid.appendChild(h('i', { class: 'wl-cell r1 pin', style: '--d:900ms' }, '1')); return; }
      var base = [0, 1, 2, 5, 10][ring], spread = [0, 2.5, 4, 7, 12][ring];
      var rank = Math.round(base + rnd() * spread), band = RANK_BAND(rank > 20 ? null : rank);
      var cell = h('i', { class: 'wl-cell ' + band, style: '--d:' + (ring * 140 + Math.round(rnd() * 90) + 900) + 'ms', tabindex: '-1' }, rank > 20 ? '' : String(rank));
      var read = function () {
        var dr = Math.abs(r - mid), dc = Math.abs(c - mid);
        var where = (dr ? dr + ' ' + (r < mid ? 'north' : 'south') : '') + (dr && dc ? ', ' : '') + (dc ? dc + ' ' + (c < mid ? 'west' : 'east') : '');
        readout.replaceChildren(h('i', { class: 'wl-cell ' + band }), h('span', {}, where + ' of the pin: ',
          rank > 20 ? h('b', {}, 'not in the top 20') : [h('b', {}, 'rank ' + rank), ', ' + (rank - 1) + ' listing' + (rank === 2 ? '' : 's') + ' above it.']));
      };
      cell.addEventListener('mouseenter', read); cell.addEventListener('click', read);
      grid.appendChild(cell);
    })(r, c);
  }

  // ---- COUNTERS: a number counts up from 0 when it is first on screen (welcomeView countTo) ----
  function countTo(el, to, o) {
    var dec = o.dec || 0, suffix = o.suffix || '', delay = o.delay || 0;
    var show = function (v) { el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suffix; };
    if (reduce || !('IntersectionObserver' in window)) { show(to); return; }
    show(0);
    var run = function () { setTimeout(function () {
      var t0 = performance.now(), dur = 1300;
      var step = function (t) { var k = Math.min(1, (t - t0) / dur); show(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, Math.max(0, delay - (performance.now() - born))); };
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); } }, { threshold: .4 });
    io.observe(el);
  }
  function counters(page) {
    [].forEach.call(page.querySelectorAll('[data-count]'), function (el) {
      countTo(el, parseFloat(el.getAttribute('data-count')), { dec: +(el.getAttribute('data-dec') || 0), suffix: el.getAttribute('data-suffix') || '', delay: +(el.getAttribute('data-delay') || 0) });
    });
  }
  // The figure cards' pictures play once the row is on screen (welcomeView figs.on).
  function figsOn(page) {
    [].forEach.call(page.querySelectorAll('.wl-figs'), function (figs) {
      if (reduce || !('IntersectionObserver' in window)) { figs.classList.add('on'); return; }
      var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); figs.classList.add('on'); } }, { threshold: .35 });
      io.observe(figs);
    });
  }

  // ---- THE SHOWCASE: the section is as tall as the row is wide, the inner part sticks, and
  // the scroll inside it moves the row; the card at the centre stands square and lit, the others
  // turn away in 3D. On narrow screens it is a row you swipe. (welcomeView, verbatim maths.) ----
  function showcases(page) {
    [].forEach.call(page.querySelectorAll('.wl-hs'), function (showcase) {
      var hsTrack = showcase.querySelector('.hs-track'), hsBar = showcase.querySelector('.hs-prog i');
      var cards = [].slice.call(hsTrack.children), travel = 0, rq = 0;
      var wide = function () { return window.innerWidth > 760 && !reduce; };
      var base = [], widths = [], trackLeft = 0, secTop = 0, secSpan = 1;
      var measure = function () {
        secTop = showcase.getBoundingClientRect().top + window.scrollY;
        secSpan = Math.max(1, showcase.offsetHeight - window.innerHeight);
        hsTrack.style.transform = 'translate3d(0, 0, 0)';
        cards.forEach(function (c) { c.style.transform = ''; });
        trackLeft = hsTrack.getBoundingClientRect().left;
        base = cards.map(function (c) { return c.offsetLeft; }); widths = cards.map(function (c) { return c.offsetWidth; });
      };
      var P = 1400, TURN = 34 * Math.PI / 180, GAP = 26;
      var frame = function () {
        rq = 0;
        if (!wide()) return;
        var p = Math.min(1, Math.max(0, (window.scrollY - secTop) / secSpan));
        var shift = -p * travel, vw = window.innerWidth;
        var info = cards.map(function (c, i) {
          var cx = trackLeft + shift + base[i] + widths[i] / 2;
          var d = (cx - vw / 2) / vw, ad = Math.min(1, Math.abs(d));
          var th = -d * TURN, sc = 1 - ad * 0.08, tz = -120 * ad, half = widths[i] / 2 * sc;
          var edge = function (x) { var xr = x * Math.cos(th) + tz * Math.sin(th), zr = -x * Math.sin(th) + tz * Math.cos(th); return xr * P / (P - zr); };
          var e1 = edge(-half), e2 = edge(half);
          return { cx: cx, d: d, ad: ad, lo: Math.min(e1, e2), hi: Math.max(e1, e2) };
        });
        var mid = 0;
        info.forEach(function (q, i) { if (Math.abs(q.cx - vw / 2) < Math.abs(info[mid].cx - vw / 2)) mid = i; });
        var nx = info.map(function () { return 0; }), i;
        for (i = mid + 1; i < info.length; i++) nx[i] = (info[i - 1].cx + nx[i - 1] + info[i - 1].hi + GAP) - (info[i].cx + info[i].lo);
        for (i = mid - 1; i >= 0; i--) nx[i] = (info[i + 1].cx + nx[i + 1] + info[i + 1].lo - GAP) - (info[i].cx + info[i].hi);
        hsTrack.style.transform = 'translate3d(' + shift.toFixed(1) + 'px, 0, 0)';
        if (hsBar) hsBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        cards.forEach(function (c, i) {
          var q = info[i];
          c.style.transform = 'translateX(' + nx[i].toFixed(1) + 'px) perspective(1400px) rotateY(' + (-q.d * 34).toFixed(2) + 'deg) translateZ(' + (-120 * q.ad).toFixed(1) + 'px) scale(' + (1 - q.ad * 0.08).toFixed(3) + ')';
          c.style.opacity = (1 - q.ad * 0.55).toFixed(3);
          c.style.setProperty('--ad', q.ad.toFixed(2));
          var lit = Math.abs(q.d) < 0.16;
          if (lit !== c.classList.contains('lit')) c.classList.toggle('lit', lit);
        });
      };
      var size = function () {
        if (!wide()) { showcase.style.height = ''; hsTrack.style.transform = ''; cards.forEach(function (c) { c.style.removeProperty('--d'); c.style.removeProperty('--ad'); c.style.transform = ''; c.style.opacity = ''; c.classList.remove('lit'); }); return; }
        travel = Math.max(0, hsTrack.scrollWidth - window.innerWidth + 48);
        showcase.style.height = Math.round(window.innerHeight + travel) + 'px';
        measure(); frame();
      };
      window.addEventListener('scroll', function () { if (!rq) rq = requestAnimationFrame(frame); }, { passive: true });
      window.addEventListener('resize', size, { passive: true });
      requestAnimationFrame(function () { requestAnimationFrame(size); });
      // fonts and pictures change the cards' widths after first paint
      window.addEventListener('load', size);
    });
  }

  // ---- PRICING: the welcome page's cost calculator and plan cards (welcomeView), built into
  // [data-ee="calc"] / [data-ee="plans"]. Plans are the app's seeded rows (billing.py SEED_PLANS):
  // name, month cents, year cents, credits a month, credits a year. One credit per point. ----
  var ALL_PLANS = [['Starter', 2499, 29988, 7500, 90000], ['Basic', 4999, 59988, 15150, 183000], ['Pro', 9999, 119988, 31250, 383000],
    ['Premium', 19999, 239988, 63150, 778000], ['Enterprise 1', 49900, 598800, 159500, 1974000], ['Enterprise 2', 99900, 1198800, 326000, 4088000],
    ['Enterprise 3', 249900, 2998800, 824000, 10400000], ['Enterprise 4', 499900, 5998800, 1668000, 21180000]];
  var PLANS_HOT = 'Pro';
  var money = function (c) { return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }); };
  function pricing(page) {
    var calcSlot = page.querySelector('[data-ee="calc"]'), planSlot = page.querySelector('[data-ee="plans"]'), ctlSlot = page.querySelector('[data-ee="plan-ctl"]');
    if (calcSlot) buildCalc(calcSlot);
    if (planSlot) buildPlans(planSlot, ctlSlot);
  }
  function buildCalc(slot) {
    var cN = 9, cRuns = 4, cKw = 1, cRad = 2;
    var nf = function (v) { return v.toLocaleString('en-US'); };
    var mi = function (v) { return Number(v.toFixed(2)) + ' mi'; };
    var cGrid = h('div', { class: 'wl-calc-grid' }), cNums = h('div', { class: 'wl-calc-nums' }), cPlans = h('div', { class: 'wl-calc-plans' });
    var cPicNote = h('div', { class: 'wl-calc-pic-n' });
    var chips = function (vals, cur, label, set) { return h('div', { class: 'wl-chips', role: 'group', 'aria-label': label },
      vals.map(function (x) { return h('button', { type: 'button', 'data-v': String(x[0]), 'aria-pressed': String(x[0] === cur), onclick: function () { set(x[0]); } }, x[1]); })); };
    var sizeChips = chips(GRID_SIZES.map(function (n) { return [n, n + ' × ' + n]; }), cN, 'Grid size', function (v) { cN = v; paint(); });
    var radChips = chips([1, 2, 3, 5, 10].map(function (r) { return [r, r + ' mi']; }), cRad, 'Radius', function (v) { cRad = v; paint(); });
    var runChips = chips([[1, 'Monthly'], [4, 'Weekly'], [30, 'Daily']], cRuns, 'How often', function (v) { cRuns = v; paint(); });
    var kwOut = h('output', { 'aria-live': 'polite' }, '1');
    var kwStep = function (d) { cKw = Math.max(1, Math.min(500, cKw + d)); paint(); };
    var kwBox = h('div', { class: 'wl-step-in', role: 'group', 'aria-label': 'Keywords tracked' },
      h('button', { type: 'button', 'aria-label': 'One fewer keyword', onclick: function () { kwStep(-1); } }, '−'), kwOut,
      h('button', { type: 'button', 'aria-label': 'One more keyword', onclick: function () { kwStep(1); } }, '+'),
      [5, 10, 25].map(function (n) { return h('button', { type: 'button', class: 'wl-kw-q', onclick: function () { cKw = n; paint(); } }, String(n)); }));
    var rcptBox = h('div', { class: 'wl-rcpt wl-glow' }), econBox = h('div', { class: 'wl-econ wl-glow' });
    var line = function (k, v, note) { return h('li', {}, h('span', {}, k, note ? h('small', {}, note) : null), h('b', {}, v)); };
    var paint = function () {
      [[sizeChips, cN], [runChips, cRuns], [radChips, cRad]].forEach(function (x) { [].forEach.call(x[0].querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.v) === x[1])); }); });
      kwOut.textContent = String(cKw);
      var pts = cN * cN, scansMonth = cRuns * cKw, month = pts * scansMonth;
      var spacing = 2 * cRad / (cN - 1), side = 2 * cRad;
      var often = cRuns === 1 ? 'monthly' : cRuns === 4 ? 'weekly' : 'daily';
      cGrid.style.setProperty('--n', cN);
      cGrid.replaceChildren.apply(cGrid, range(pts, function (i) {
        var m = (cN - 1) / 2, ring = Math.max(Math.abs(Math.floor(i / cN) - m), Math.abs(i % cN - m));
        return h('i', { class: ring === 0 ? 'pin' : null, style: '--k:' + (ring / Math.max(1, m)).toFixed(2) }); }));
      cPicNote.replaceChildren(h('span', {}, h('b', {}, side + ' × ' + side + ' mi'), ' covered'), h('span', {}, h('b', {}, mi(spacing)), ' between points'));
      cNums.replaceChildren(
        h('div', {}, h('b', {}, nf(pts)), h('span', {}, 'credits per scan, one per point')),
        h('div', {}, h('b', {}, nf(scansMonth)), h('span', {}, 'scans a month: ' + cKw + ' keyword' + (cKw === 1 ? '' : 's') + ', ' + often)),
        h('div', {}, h('b', {}, nf(month)), h('span', {}, 'credits a month')));
      var fitIdx = ALL_PLANS.findIndex(function (x) { return x[3] >= month; });
      var from = fitIdx < 0 ? ALL_PLANS.length - 4 : Math.max(0, Math.min(fitIdx - 1, ALL_PLANS.length - 4));
      cPlans.replaceChildren.apply(cPlans, ALL_PLANS.slice(from, from + 4).map(function (pl, j) {
        var i = from + j, n = Math.floor(pl[3] / month), share = month / pl[3] * 100;
        return h('div', { class: 'wl-calc-plan' + (i === fitIdx ? ' fit' : '') + (n < 1 ? ' short' : '') },
          h('b', {}, pl[0]), h('small', {}, money(pl[1]) + ' / month'),
          h('span', { class: 'wl-calc-bar' }, h('i', { style: 'width:' + Math.min(100, share).toFixed(1) + '%' })),
          h('em', {}, n < 1 ? 'Short by ' + nf(month - pl[3]) + ' credits a month' : 'Uses ' + (share < 1 ? 'under 1' : Math.round(share)) + '% · room for ' + nf(n) + ' like this'),
          i === fitIdx ? h('span', { class: 'wl-fit' }, 'Smallest plan that fits') : null);
      }).concat(fitIdx >= 0 ? [] : [h('p', { class: 'wl-calc-over' }, nf(month) + " credits a month is more than Enterprise 4's " + nf(ALL_PLANS[ALL_PLANS.length - 1][3]) + '. Split the work across fewer keywords, a smaller grid or a slower rhythm.')]));
      rcptBox.replaceChildren(
        h('div', { class: 'wl-rcpt-h' }, h('small', {}, 'One ' + cN + ' × ' + cN + ' scan'), h('b', {}, nf(pts) + ' credits'),
          h('span', {}, cN + ' rows × ' + cN + ' columns = ' + nf(pts) + ' points, the business on the centre one')),
        h('ul', { class: 'wl-rcpt-l' },
          line('Google Maps searches', nf(pts), 'one from each point'),
          line('Listings read', 'up to ' + nf(pts * 20), 'the top 20 at every point'),
          line('Point spacing', mi(spacing), 'radius ' + cRad + ' mi ÷ ' + ((cN - 1) / 2) + ', over ' + side + ' × ' + side + ' mi'),
          line('Your rank', 'at all ' + nf(pts) + ' points', 'plus LSOV, ARP and ATRP for the whole map'),
          line('Competitors', 'every one found', 'who ranks above you, and where'),
          line('Exports', 'CSV and PDF', 'the listings, and any report built from it')),
        h('div', { class: 'wl-rcpt-sub' }, h('small', {}, 'Never charged'),
          h('p', {}, 'Points you switch off or cut with a circle or drawn shape, and a scan that cannot start (refunded).')),
        h('div', { class: 'wl-rcpt-sub' }, h('small', {}, 'Costs extra, only if you use it'),
          h('p', {}, 'A time-lapse GIF of every run: 10 credits, once per scan. A kept, scheduled report: 25 credits each time it is built.')),
        h('div', { class: 'wl-rcpt-sub free' }, h('small', {}, 'Free to start'),
          h('p', {}, 'A new organisation starts with 10 free scans, and the first scan of the website you sign up with is free at any size up to 21 × 21.')));
      econBox.replaceChildren(
        h('div', { class: 'wl-econ-h' }, h('h3', {}, 'What each plan comes to at ' + cN + ' × ' + cN),
          h('p', {}, 'A keyword tracked weekly is 4 scans a month (' + nf(pts * 4) + ' credits); daily it is 30 (' + nf(pts * 30) + ').')),
        h('div', { class: 'wl-econ-wrap' }, h('table', {},
          h('thead', {}, h('tr', {}, ['Plan', 'Scans a month', 'Cost per scan', 'Keywords weekly', 'Keywords daily'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
          h('tbody', {}, ALL_PLANS.map(function (pl, i) {
            var scans = Math.floor(pl[3] / pts);
            return h('tr', { class: [i === fitIdx ? 'hot' : null, /^Enterprise/.test(pl[0]) ? 'ent' : null].filter(Boolean).join(' ') || null },
              h('th', { scope: 'row' }, pl[0], h('small', {}, money(pl[1]) + ' / month')),
              h('td', {}, nf(scans)), h('td', {}, scans ? '$' + (pl[1] / 100 / scans).toFixed(scans > 999 ? 3 : 2) : '—'),
              h('td', {}, nf(Math.floor(pl[3] / (pts * 4)))), h('td', {}, nf(Math.floor(pl[3] / (pts * 30)))));
          })))),
        h('p', { class: 'wl-econ-note' }, 'The highlighted row is the smallest plan that covers your setting above. Yearly plans grant their own credits: more than twelve months of the monthly plan on every plan above Starter.'));
    };
    paint();
    var calc = h('div', { class: 'wl-calc wl-glow' },
      h('div', { class: 'wl-calc-ctl' },
        h('div', { class: 'wl-calc-row' }, h('div', {}, h('small', {}, 'Grid size'), sizeChips), h('div', {}, h('small', {}, 'Radius'), radChips)),
        h('div', { class: 'wl-calc-row' }, h('div', {}, h('small', {}, 'How often it runs'), runChips), h('div', {}, h('small', {}, 'Keywords tracked'), kwBox)),
        cNums),
      h('div', { class: 'wl-calc-pic' }, h('div', { 'aria-hidden': 'true' }, cGrid), cPicNote),
      cPlans);
    slot.replaceChildren(calc, h('div', { class: 'wl-cost9' }, rcptBox, econBox));
  }
  function buildPlans(slot, ctlSlot) {
    var yearly = false, showEnt = true, entPick = 0, ENT_PTS = 121;
    var planBox = h('div', { class: 'plans pl-grid wl-pl' });
    var isEnt = function (n) { return /^Enterprise\b/.test(n); };
    var stdPlans = ALL_PLANS.filter(function (x) { return !isEnt(x[0]); }), entPlans = ALL_PLANS.filter(function (x) { return isEnt(x[0]); });
    var maxCm = Math.max.apply(null, ALL_PLANS.map(function (x) { return x[3]; }));
    var barPct = function (c) { return Math.max(6, Math.round(Math.log10(1 + c) / Math.log10(1 + maxCm) * 100)); };
    var sorted = ALL_PLANS.slice().sort(function (a, z) { return a[3] - z[3]; });
    var levelOf = function (n) { return sorted.findIndex(function (x) { return x[0] === n; }) + 1; };
    var ART_N = 7, ART_C = 3;
    var artOrder = range(ART_N * ART_N, function (i) { return i; }).sort(function (a, z) {
      return Math.hypot(a % ART_N - ART_C, Math.floor(a / ART_N) - ART_C) - Math.hypot(z % ART_N - ART_C, Math.floor(z / ART_N) - ART_C); });
    var planArt = function (n) {
      var lit = {}; artOrder.slice(0, Math.max(1, Math.round(ART_N * ART_N * levelOf(n) / ALL_PLANS.length))).forEach(function (i) { lit[i] = 1; });
      return h('div', { class: 'pl-art', 'aria-hidden': 'true' }, range(ART_N * ART_N, function (i) {
        var ring = Math.max(Math.abs(i % ART_N - ART_C), Math.abs(Math.floor(i / ART_N) - ART_C));
        return h('i', { class: lit[i] ? 'on r' + ring : null, style: '--d:' + (ring * 70) + 'ms' }); }));
    };
    var planCard = function (pl, extra, ent) {
      var name = pl[0], m = pl[1], y = pl[2], cm = pl[3], cy = pl[4];
      var price = yearly ? y : m, credits = yearly ? cy : cm;
      var pts = ent ? ENT_PTS : 81, grid = ent ? '11×11' : '9×9';
      var saving = m * 12 - y, bonus = cy - cm * 12, hot = name === PLANS_HOT;
      return h('article', { class: 'plan' + (ent ? ' pl-ent' : '') + (hot ? ' current' : ''), style: '--lvl:' + (levelOf(name) / ALL_PLANS.length) },
        ent ? h('span', { class: 'pl-ent-fill', 'aria-hidden': 'true' }) : null,
        planArt(name),
        h('div', { class: 'pl-top' }, h('div', { class: 'k' }, name), extra || null, hot ? h('span', { class: 'pl-badge' }, 'Most picked') : null),
        h('div', { class: 'pl-price' },
          h('div', { class: 'price' }, money(price), h('span', { class: 'muted' }, yearly ? ' / year' : ' / month')),
          h('div', { class: 'save' }, yearly ? [money(Math.round(y / 12)) + ' a month', saving > 0 ? 'save ' + money(saving) : null].filter(Boolean).join(' · ') : '')),
        h('div', { class: 'pl-credits' },
          h('div', {}, h('b', {}, credits.toLocaleString('en-US')), ' credits ' + (yearly ? 'a year' : 'a month'),
            yearly && bonus > 0 ? h('em', { class: 'pl-bonus' }, '+' + bonus.toLocaleString('en-US') + ' bonus') : null),
          h('i', { class: 'pl-bar' }, h('i', { style: 'width:' + barPct(cm) + '%' }))),
        h('dl', { class: 'pl-facts' },
          h('dt', {}, 'Scans at ' + grid), h('dd', {}, 'about ' + Math.floor(credits / pts).toLocaleString('en-US')),
          h('dt', {}, 'Cost per ' + grid + ' scan'), h('dd', {}, '$' + (price / 100 / Math.floor(credits / pts)).toFixed(ent ? 3 : 2)),
          ent ? [h('dt', {}, 'Keywords weekly'), h('dd', {}, Math.floor(cm / (ENT_PTS * 4)).toLocaleString('en-US')),
                 h('dt', {}, 'Keywords daily'), h('dd', {}, Math.floor(cm / (ENT_PTS * 30)).toLocaleString('en-US'))]
            : [h('dt', {}, 'Per 1,000 credits'), h('dd', {}, money(Math.round(price / credits * 1000)))]),
        h('a', { class: hot ? 'btn block' : 'btn ghost block plan-choose', href: APP + '/signup' }, 'Get started'));
    };
    var paintPlans = function () {
      var cards = stdPlans.map(function (pl) { return planCard(pl); });
      if (showEnt) {
        var tiers = h('div', { class: 'pl-tiers', role: 'radiogroup', 'aria-label': 'Enterprise tier' },
          entPlans.map(function (t, i) { return h('button', { type: 'button', role: 'radio', 'aria-checked': String(i === entPick),
            class: i === entPick ? 'on' : null, title: t[0], onclick: function () { entPick = i; paintPlans(); } }, String(i + 1)); }));
        cards.push(planCard(entPlans[entPick], tiers, true));
      }
      planBox.classList.toggle('no-ent', !showEnt);
      planBox.replaceChildren.apply(planBox, cards);
      [].forEach.call(toggle.querySelectorAll('button'), function (b) { b.classList.toggle('on', (b.dataset.y === '1') === yearly); });
      entSwitch.setAttribute('aria-checked', String(showEnt));
    };
    var entSwitch = h('button', { type: 'button', class: 'wl-switch', role: 'switch', 'aria-checked': 'true',
      onclick: function () { showEnt = !showEnt; paintPlans(); } }, h('i', { 'aria-hidden': 'true' }), 'Enterprise');
    var toggle = h('div', { class: 'wl-toggle', role: 'group', 'aria-label': 'Billing period' },
      h('button', { type: 'button', 'data-y': '0', onclick: function () { yearly = false; paintPlans(); } }, 'Monthly'),
      h('button', { type: 'button', 'data-y': '1', onclick: function () { yearly = true; paintPlans(); } }, 'Yearly'));
    paintPlans();
    var allPlans = h('details', { class: 'wl-all' },
      h('summary', {}, h('span', {}, 'Compare all 8 plans'), h('i', { class: 'wl-plus', 'aria-hidden': 'true' })),
      h('div', { class: 'wl-all-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Plan', 'Monthly', 'Yearly', 'Credits a month', 'Credits a year', '9 × 9 scans a month', '11 × 11 scans a month'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
        h('tbody', {}, ALL_PLANS.map(function (pl) { return h('tr', {}, h('th', { scope: 'row' }, pl[0]), h('td', {}, money(pl[1])), h('td', {}, money(pl[2])),
          h('td', {}, pl[3].toLocaleString('en-US')), h('td', {}, pl[4].toLocaleString('en-US')), h('td', {}, Math.floor(pl[3] / 81).toLocaleString('en-US')), h('td', {}, Math.floor(pl[3] / 121).toLocaleString('en-US'))); })))));
    if (ctlSlot) ctlSlot.replaceChildren(toggle, entSwitch); else slot.before(h('div', { class: 'wl-plan-ctl' }, toggle, entSwitch));
    slot.replaceChildren(planBox, allPlans);
  }

  function init() {
    var page = document.querySelector('.wl');
    var nav = document.querySelector('.wl-nav');
    if (!page || !nav) return;

    // The bar: transparent over the hero, dark once scrolled.
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // Pillar dropdowns: hover opens them on a mouse (CSS); a tap or Enter on the caret
    // button toggles them; a click elsewhere or Escape closes them.
    var wraps = [].slice.call(nav.querySelectorAll('.wl-drop-wrap'));
    var closeAll = function (except) {
      wraps.forEach(function (w) { if (w !== except) { w.classList.remove('open'); var b = w.querySelector('.wl-drop-tog'); if (b) b.setAttribute('aria-expanded', 'false'); } });
    };
    wraps.forEach(function (w) {
      var tog = w.querySelector('.wl-drop-tog');
      if (!tog) return;
      tog.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var open = !w.classList.contains('open'); closeAll(w);
        w.classList.toggle('open', open); tog.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.wl-drop-wrap')) closeAll(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    // The phone menu.
    var menuBtn = nav.querySelector('.wl-menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(open));
    });

    // The panels' edge and glow follow the pointer (--mx / --my), as on the welcome page.
    page.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.wl-glow'); if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });

    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce;
    if (fine) {
      // Magnetic buttons.
      [].forEach.call(page.querySelectorAll('.wl-btn'), function (btn) {
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          btn.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px');
          btn.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px');
        });
        btn.addEventListener('pointerleave', function () { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
      });
      // The cursor light and its trailing ring.
      var spot = document.createElement('div'); spot.className = 'wl-spot'; spot.setAttribute('aria-hidden', 'true');
      var ring = document.createElement('div'); ring.className = 'wl-ring-cur'; ring.setAttribute('aria-hidden', 'true');
      page.appendChild(spot); page.appendChild(ring);
      var tx = -500, ty = -500, sx = tx, sy = ty, rx = tx, ry = ty, loop = 0;
      var step = function () {
        sx += (tx - sx) * .12; sy += (ty - sy) * .12; rx += (tx - rx) * .3; ry += (ty - ry) * .3;
        spot.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
        ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
        loop = (Math.abs(tx - sx) + Math.abs(ty - sy) > .5) ? requestAnimationFrame(step) : 0;
      };
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        ring.classList.toggle('hot', !!(e.target.closest && e.target.closest('a, button, summary, select')));
        page.classList.add('wl-has-cur');
        if (!loop) loop = requestAnimationFrame(step);
      }, { passive: true });
      document.addEventListener('pointerleave', function () { page.classList.remove('wl-has-cur'); });
    }

    // The pictures, the product shot, the counters, the showcase and the calculator.
    try { paintArt(page); } catch (e) { console.warn('site art', e); }
    try { wireShot(page); } catch (e) { console.warn('site shot', e); }
    try { counters(page); } catch (e) { console.warn('site counters', e); }
    try { figsOn(page); } catch (e) { console.warn('site figs', e); }
    try { pricing(page); } catch (e) { console.warn('site pricing', e); }
    try { showcases(page); } catch (e) { console.warn('site showcase', e); }

    // Reveal: each block rises into place as it comes on screen; panels in a row follow
    // one another (--i). Content is visible without this script; it only adds motion.
    // The welcome page's own reveal list, plus this site's prose, card grids and tables.
    if (!reduce && 'IntersectionObserver' in window) {
      var els = [].slice.call(page.querySelectorAll('.wl-body .wl-head, .wl-step, .wl-fig, .wl-plan, .wl-faq, .wl-dt-card, .wl-calc, .wl-all, .wl-final > *, '
        + '.wl-body .wl-ptwo, .wl-body .wl-psec > .wl-prose, .wl-cards > li, .wl-excl > li, .wl-wins > li, .wl-cmp-wrap, .wl-tcalc'));
      els.forEach(function (el) {
        el.classList.add('wl-rv');
        var sib = el.parentElement ? [].filter.call(el.parentElement.children, function (x) { return x.classList.contains('wl-rv'); }) : [];
        el.style.setProperty('--i', String(Math.min(8, Math.max(0, sib.indexOf(el)))));
      });
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); ro.unobserve(x.target); } });
      }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
      els.forEach(function (el) { ro.observe(el); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
