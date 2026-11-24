/* wl-bg.js — EXACT Eagle Eye welcome background, extracted verbatim from the staging
   console bundle (dashboard.js: h, motionOff, rankCity, rankCityGL, wlScanStory, wlParallax).
   Same WebGL city model + 2D fallback + parallax + scan story. Assets served from /app/.
   Mounts a fixed .wl-city canvas + .wl-shade behind the static page, as welcomeView() does. */
(function () {
'use strict';
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") throw new Error("no innerHTML");
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// Resolve /app/ assets from THIS script's own URL, so the backdrop works whether
// the site is served at the domain root or under a project path (e.g. /eagleeye-content/).
var ABASE = (function () {
  try {
    var ss = document.getElementsByTagName("script");
    for (var i = ss.length - 1; i >= 0; i--) { if (/wl-bg\.js(\?|$)/.test(ss[i].src)) return new URL(".", ss[i].src).href; }
  } catch (e) {}
  return "/app/";
})();

function motionOff() {
  return document.documentElement.classList.contains("no-motion") ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function rankCity(canvas, cam = () => 0) {
  const N = 17, mid = (N - 1) / 2;
  let seed = 41;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cells = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const d = Math.hypot(i - mid, j - mid);
    if (d < 0.5) continue;
    const rank = Math.max(1, Math.round(d * 1.55 + (rnd() - 0.45) * 5.5 - 0.5));
    cells.push({ i, j, d, rank: rank > 20 ? 21 : rank, theta: Math.atan2(i - mid, j - mid),
      w: 0.30 + rnd() * 0.1, dw: 0.30 + rnd() * 0.1, off: rnd() * 10, lit: rnd() });
  }
  const COL = (r) => r <= 3 ? [[255, 58, 51], [196, 28, 30], [112, 12, 14]]
    : r <= 7 ? [[214, 30, 34], [150, 20, 24], [80, 9, 11]]
    : r <= 10 ? [[150, 18, 22], [104, 13, 16], [56, 7, 9]]
    : r <= 15 ? [[96, 12, 15], [66, 9, 11], [36, 5, 6]]
    : r <= 20 ? [[58, 9, 11], [40, 6, 7], [22, 3, 4]]
    : [[34, 34, 36], [24, 24, 26], [14, 14, 15]];
  const rgb = (c, k = 1) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
  const logo = new Image(); logo.src = "/app/logo.svg";
  const ctx = canvas.getContext("2d");
  const still = motionOff();
  let W = 0, H = 0, dpr = 1, mx = 0, my = 0, tmx = 0, tmy = 0, sp = 0, raf = 0;
  // ADAPTIVE QUALITY, judged by the real frame rate (the time between frames, averaged):
  // slower than about 50 frames a second and the city drops a step - 0 all windows, 1
  // windows on the better-ranked buildings only, 2 no windows, 3 drawn at 3/4 resolution,
  // 4 at 1/2 - and it climbs back a step when frames come easily again.
  let gap = 16.7, quality = 0, scale = 1, lastFrame = 0, settle = 0;
  canvas.dataset.quality = "0";
  const t0 = performance.now();
  const resize = () => {
    scale = quality >= 4 ? .5 : quality >= 3 ? .75 : 1;
    dpr = Math.min(1.5, window.devicePixelRatio || 1) * scale;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (still) draw(1e9);
  };
  // The camera flight: [p, azimuth add, tilt, zoom, centre y as a share of the height].
  const PATH = [[0, 0, .50, 1.00, .86], [.12, .55, .62, 1.75, .62], [.45, 1.6, .56, 1.55, .58],
                [.78, 2.5, .64, 1.85, .60], [.93, 3.0, .48, 1.05, .66], [1, 3.15, .46, .95, .66]];
  const at = (p) => {
    let k = 0; while (k < PATH.length - 2 && p > PATH[k + 1][0]) k++;
    const a = PATH[k], b = PATH[k + 1], u = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
    const e = u * u * (3 - 2 * u);
    return a.map((v, n) => v + (b[n] - v) * e);
  };
  function draw(now) {
    raf = 0;
    const began = performance.now();
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    sp += (cam() - sp) * 0.1;
    const [, azAdd, tilt0, zoom, cyShare] = at(sp);
    const az = -0.62 + azAdd + (still ? 0 : t * 0.04) + mx * 0.4;
    const tilt = tilt0 + my * 0.08;
    const S = Math.min(W * 0.92, H * 1.9) / (N * 1.42) * zoom;
    const cx = W / 2 + mx * -26, cy = H * cyShare + my * -16;
    const ca = Math.cos(az), sa = Math.sin(az);
    const proj = (x, y, z) => { const X = x * ca - y * sa, Y = x * sa + y * ca; return [cx + X, cy + Y * tilt - z]; };
    // Streets: the ground grid between the blocks, one path.
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,80,70,.10)"; ctx.beginPath();
    const e = (mid + 2.5) * S;
    for (let k = -2; k <= N + 1; k++) {
      const a = (k - mid - 0.5) * S;
      let p = proj(a, -e, 0), q = proj(a, e, 0); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      p = proj(-e, a, 0); q = proj(e, a, 0); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    const sweep = still ? null : (t * 1.1) % (Math.PI * 2) - Math.PI;
    const order = cells.map(c => { const x = (c.j - mid) * S, y = (c.i - mid) * S; return { c, x, y, depth: x * sa + y * ca }; })
      .sort((a, b) => a.depth - b.depth);
    const floor = Math.max(5, S * 0.2);
    const dash = [Math.max(2, S * 0.07), Math.max(2, S * 0.06)];
    ctx.setLineDash(dash);
    // One box (a building or a setback on top of one): its visible sides with a row of
    // windows per floor, then its roof.
    const box = (x, y, hw, hd, z0, z1, col, k, flare, c, windows) => {
      const b = [[x - hw, y - hd], [x + hw, y - hd], [x + hw, y + hd], [x - hw, y + hd]];
      const lo = b.map(([px, py]) => proj(px, py, z0)), hi = b.map(([px, py]) => proj(px, py, z1));
      // Off the screen altogether: nothing to draw.
      if (Math.max(lo[0][0], lo[1][0], lo[2][0], lo[3][0]) < -20 || Math.min(lo[0][0], lo[1][0], lo[2][0], lo[3][0]) > W + 20
          || Math.min(hi[0][1], hi[1][1], hi[2][1], hi[3][1]) > H + 20 || Math.max(lo[0][1], lo[1][1], lo[2][1], lo[3][1]) < -20) return hi;
      const win = false && windows && z1 - z0 > floor * 1.6 && quality === 0;   // windows are off
      let wpath = win ? new Path2D() : null;
      for (let f = 0; f < 4; f++) {
        const g = (f + 1) % 4;
        if ((b[f][1] - b[g][1]) * sa + (b[g][0] - b[f][0]) * ca <= 0) continue;
        ctx.fillStyle = rgb(f % 2 ? col[1] : col[2], k);
        ctx.beginPath(); ctx.moveTo(lo[f][0], lo[f][1]); ctx.lineTo(lo[g][0], lo[g][1]);
        ctx.lineTo(hi[g][0], hi[g][1]); ctx.lineTo(hi[f][0], hi[f][1]); ctx.fill();
        if (wpath) {
          // Both visible faces' windows go in one path and one dashed stroke.
          for (let z = z0 + floor * .7; z < z1 - floor * .4; z += floor) {
            const p = proj(b[f][0] + (b[g][0] - b[f][0]) * .14, b[f][1] + (b[g][1] - b[f][1]) * .14, z);
            const q = proj(b[f][0] + (b[g][0] - b[f][0]) * .86, b[f][1] + (b[g][1] - b[f][1]) * .86, z);
            wpath.moveTo(p[0], p[1]); wpath.lineTo(q[0], q[1]);
          }
        }
      }
      if (wpath) {
        ctx.lineDashOffset = c.off * floor;
        ctx.lineWidth = Math.max(1, floor * .38);
        const a = c.rank <= 7 ? .32 + c.lit * .3 : c.rank <= 15 ? .14 + c.lit * .14 : .06;
        ctx.strokeStyle = `rgba(255,${190 + flare * 50 | 0},${170 + flare * 60 | 0},${Math.min(.95, a + flare * .4)})`;
        ctx.stroke(wpath);
      }
      // The roof; a flaring or rank 1-2 roof gets a soft halo (a wider, faint copy - no blur).
      ctx.beginPath(); ctx.moveTo(hi[0][0], hi[0][1]); ctx.lineTo(hi[1][0], hi[1][1]); ctx.lineTo(hi[2][0], hi[2][1]); ctx.lineTo(hi[3][0], hi[3][1]); ctx.closePath();
      if (flare > 0.5 || c.rank <= 2) {
        ctx.lineWidth = 6 + flare * 8; ctx.setLineDash([]); ctx.strokeStyle = `rgba(255,60,50,${.18 + flare * .25})`; ctx.stroke();
        ctx.setLineDash(dash);
      }
      ctx.fillStyle = rgb(col[0], k * .92);
      ctx.fill();
      return hi;
    };
    for (const { c, x, y } of order) {
      const rise = still ? 1 : Math.min(1, Math.max(0, (t - 0.35 - c.d * 0.07) / 0.9));
      if (rise <= 0) continue;
      const grow = 1 - Math.pow(1 - rise, 3);
      const hgt = (c.rank > 20 ? S * .25 : (21 - c.rank) / 20 * S * 3.6 + S * .35) * grow;
      let flare = 0;
      if (sweep !== null) {
        const dd = Math.abs(((c.theta - az) - sweep + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (dd < 0.45) flare = (1 - dd / 0.45) * (c.rank <= 20 ? 1 : .3);
      }
      const col = COL(c.rank), k = 1 + flare * 0.9;
      const hw = S * c.w, hd = S * c.dw;
      // Tall towers step back near the top; the best ones carry a mast.
      if (c.rank <= 7 && hgt > S * 1.6) {
        const cut = hgt * .74;
        box(x, y, hw, hd, 0, cut, col, k, flare, c, true);
        const top = box(x, y, hw * .66, hd * .66, cut, hgt, col, k * 1.06, flare, c, true);
        if (c.rank <= 3) {
          const p = proj(x, y, hgt), q = proj(x, y, hgt + S * .9 * grow);
          ctx.setLineDash([]); ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(255,120,110,${.55 + flare * .4})`;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
          ctx.fillStyle = "#ff3a33"; ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
          ctx.setLineDash(dash);
        }
        void top;
      } else {
        box(x, y, hw, hd, 0, hgt, col, k, flare, c, c.rank <= 20);
      }
    }
    ctx.setLineDash([]);
    // The emblem over the pin, with a column of light under it.
    const [px, py] = proj(0, 0, 0);
    const lift = S * 4.6 + (still ? 0 : Math.sin(t * 1.6) * S * .2), size = S * 2.4;
    ctx.fillStyle = "rgba(255,90,80,.26)"; ctx.fillRect(px - S * .09, py - lift, S * .18, lift);
    const halo = ctx.createRadialGradient(px, py - lift, 0, px, py - lift, size * 1.2);
    halo.addColorStop(0, "rgba(255,42,46,.55)"); halo.addColorStop(1, "rgba(255,42,46,0)");
    ctx.fillStyle = halo; ctx.fillRect(px - size * 1.2, py - lift - size * 1.2, size * 2.4, size * 2.4);
    if (logo.complete && logo.naturalWidth) {
      ctx.globalAlpha = still ? 1 : Math.min(1, Math.max(0, (t - 1.2) / .8));
      ctx.drawImage(logo, px - size / 2, py - lift - size / 2, size, size); ctx.globalAlpha = 1;
    }
    if (lastFrame) gap = gap * .9 + Math.min(100, now - lastFrame) * .1;
    lastFrame = now;
    if (t > 2.5 && now > settle) {
      if (gap > 20 && quality < 4) { quality++; settle = now + 1200; gap = 16.7; if (quality >= 3) resize(); canvas.dataset.quality = String(quality); }
      else if (gap < 17.2 && quality > 0 && now > settle + 6000) { const was = quality; quality--; settle = now + 1200; if (was >= 3) resize(); canvas.dataset.quality = String(quality); }
    }
    void began;
    schedule();
  }
  function schedule() {
    if (still || raf || document.hidden) return;
    if (!canvas.isConnected) { stop(); return; }
    raf = requestAnimationFrame(draw);
  }
  const onMove = (e) => { tmx = e.clientX / window.innerWidth - .5; tmy = e.clientY / window.innerHeight - .5; };
  const onVis = () => schedule();
  const ro = new ResizeObserver(resize);
  function stop() { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); }
  ro.observe(canvas);
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  logo.onload = () => { if (still) draw(1e9); };
  requestAnimationFrame(() => { resize(); schedule(); });
  return { redraw: () => { if (still) draw(1e9); } };
}

function rankCityGL(canvas, cam, pin, story = null) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  if (!gl) return null;
  const N = 17, mid = (N - 1) / 2;
  let seed = 41;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // A CITY, NOT A GRID. The ground is cut by avenues into blocks; each block is split at
  // random into lots of different sizes, and each lot gets a building of random width,
  // depth and height - taller and redder towards the pin (downtown), low and dark at the
  // edge, as a scan's ranks are. A few lots stay empty (plazas), the tallest downtown
  // towers step back near the top, and the very tallest carry a mast.
  // Boxes: [cx, cz, half width, half depth, z0, z1, rank, rise delay, theta, unused].
  const boxes = [];
  const AV = 3, STREET = 0.42, EXT = mid + 0.5;
  const lot = (x0, z0, x1, z1, depth) => {
    const w = x1 - x0, d = z1 - z0;
    // Keep splitting big lots; the cut falls anywhere between 30% and 70%.
    if (depth < 3 && (w > 1.1 || d > 1.1) && rnd() < 0.86) {
      const along = w > d ? true : w < d ? false : rnd() < .5, cut = 0.3 + rnd() * 0.4;
      if (along) { const m = x0 + w * cut; lot(x0, z0, m, z1, depth + 1); lot(m, z0, x1, z1, depth + 1); }
      else { const m = z0 + d * cut; lot(x0, z0, x1, m, depth + 1); lot(x0, m, x1, z1, depth + 1); }
      return;
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dist = Math.hypot(cx, cz);
    if (dist < 0.9) return;                                   // the pin's plaza
    if (rnd() < 0.07) return;                                 // an empty lot
    const gap = 0.07 + rnd() * 0.05;
    const hw = Math.max(0.12, (w / 2 - gap) * (0.72 + rnd() * 0.28)), hd = Math.max(0.12, (d / 2 - gap) * (0.72 + rnd() * 0.28));
    let rank = Math.max(1, Math.round(dist * 1.55 + (rnd() - 0.45) * 5.5 - 0.5)); if (rank > 20) rank = 21;
    // Height: mostly set by how central the lot is, with a lot of chance on top.
    const core = Math.max(0, 1 - dist / (EXT * 1.05));
    let h = 0.18 + Math.pow(core, 1.6) * 4.2 * (0.35 + rnd() * 0.95) + rnd() * 0.5;
    if (rnd() < 0.06 && core > 0.25) h *= 1.6;                // the odd landmark tower
    const th = Math.atan2(cz, cx), dl = 0.35 + dist * 0.07;
    if (h > 2.4 && rnd() < 0.7) {
      const cut = h * (0.58 + rnd() * 0.2), s = 0.55 + rnd() * 0.2;
      boxes.push([cx, cz, hw, hd, 0, cut, rank, dl, th, 0], [cx, cz, hw * s, hd * s, cut, h, rank, dl, th, 0]);
      if (h > 4) boxes.push([cx, cz, .02, .02, h, h + 0.5 + rnd() * 0.6, 1, dl, th, 0]);
    } else boxes.push([cx, cz, hw, hd, 0, h, rank, dl, th, 0]);
  };
  for (let bx = -EXT; bx < EXT - 0.01; bx += AV) for (let bz = -EXT; bz < EXT - 0.01; bz += AV)
    lot(bx + STREET / 2, bz + STREET / 2, Math.min(EXT, bx + AV) - STREET / 2, Math.min(EXT, bz + AV) - STREET / 2, 0);
  // Each box: four sides and a roof, two triangles each. Per vertex: local x, y(0..1), z;
  // normal; distance along the face; then the box's own numbers.
  const FACES = [
    [[-1, 0, 1], [1, 0, 1], [1, 1, 1], [-1, 1, 1], [0, 0, 1], "x"], [[1, 0, -1], [-1, 0, -1], [-1, 1, -1], [1, 1, -1], [0, 0, -1], "x"],
    [[1, 0, 1], [1, 0, -1], [1, 1, -1], [1, 1, 1], [1, 0, 0], "z"], [[-1, 0, -1], [-1, 0, 1], [-1, 1, 1], [-1, 1, -1], [-1, 0, 0], "z"],
    [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], [0, 1, 0], "t"]];
  const STRIDE = 17, data = new Float32Array(boxes.length * 30 * STRIDE);
  let o = 0;
  for (const bx of boxes) for (const [a, b, c, d, n, axis] of FACES) {
    const len = axis === "x" ? bx[2] * 2 : axis === "z" ? bx[3] * 2 : 0;
    for (const [v, u] of [[a, 0], [b, 1], [c, 1], [a, 0], [c, 1], [d, 0]]) {
      data.set([v[0], v[1], v[2], n[0], n[1], n[2], u * len, ...bx], o); o += STRIDE;
    }
  }
  const VS = `attribute vec3 aP; attribute vec3 aN; attribute float aU; attribute vec4 aB; attribute vec4 aZ; attribute vec2 aE;
    uniform mat4 uVP; uniform float uT; uniform float uSweep; uniform float uShift;
    varying vec3 vN; varying vec2 vUV; varying float vRank; varying float vFlare; varying float vSeed;
    void main() {
      float rise = clamp((uT - aZ.w) / 0.9, 0.0, 1.0); rise = 1.0 - pow(1.0 - rise, 3.0);
      float y = mix(aZ.x, aZ.y, aP.y) * rise;
      vec3 w = vec3(aB.x + aP.x * aB.z, y, aB.y + aP.z * aB.w);
      gl_Position = uVP * vec4(w, 1.0); gl_Position.y += uShift * gl_Position.w;
      float dd = abs(mod(aE.x - uSweep + 9.42477796, 6.28318531) - 3.14159265);
      vFlare = max(0.0, 1.0 - dd / 0.45) * (aZ.z < 20.5 ? 1.0 : 0.3) * step(0.0, uSweep + 10.0);
      vN = aN; vUV = vec2(aU, y - aZ.x * rise); vRank = aZ.z; vSeed = aE.y;
    }`;
  const FS = `precision mediump float;
    varying vec3 vN; varying vec2 vUV; varying float vRank; varying float vFlare; varying float vSeed;
    // Halfway thresholds: the rank arrives interpolated across a face, and a whole number
    // compared with <= flickers between two bands from pixel to pixel.
    vec3 band(float r) {
      if (r < 3.5) return vec3(1.0, 0.227, 0.2); if (r < 7.5) return vec3(0.84, 0.118, 0.133);
      if (r < 10.5) return vec3(0.588, 0.071, 0.086); if (r < 15.5) return vec3(0.376, 0.047, 0.059);
      if (r < 20.5) return vec3(0.227, 0.035, 0.043); return vec3(0.13, 0.13, 0.14); }
    void main() {
      vec3 c = band(vRank);
      float shade = vN.y > 0.5 ? 0.95 : (abs(vN.x) > 0.5 ? 0.66 : 0.42);
      vec3 col = c * shade;
      // Sides darken towards the street and catch light near the roof: a city at night.
      if (vN.y < 0.5) col *= mix(0.42, 1.08, clamp(vUV.y / 2.6, 0.0, 1.0));
      col *= 1.0 + vFlare * 0.9;
      gl_FragColor = vec4(col, 1.0);
    }`;
  const LVS = `attribute vec3 aP; uniform mat4 uVP; uniform float uShift; void main() { gl_Position = uVP * vec4(aP, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const LFS = `precision mediump float; void main() { gl_FragColor = vec4(0.7, 0.68, 0.7, 0.06); }`;
  const prog = (vs, fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  let P, L;
  try { P = prog(VS, FS); L = prog(LVS, LFS); } catch (e) { console.warn("rankCityGL:", e); return null; }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const lines = []; const e = mid + 2.5;
  // The avenues: a line down the middle of each street between the blocks, out past the city.
  for (let a = -EXT; a <= EXT + 0.01; a += AV) lines.push(a, 0, -e, a, 0, e, -e, 0, a, e, 0, a);
  const lbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, lbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
  const A = (p, n) => gl.getAttribLocation(p, n), U = (p, n) => gl.getUniformLocation(p, n);
  const attrs = [["aP", 3, 0], ["aN", 3, 3], ["aU", 1, 6], ["aB", 4, 7], ["aZ", 4, 11], ["aE", 2, 15]].map(([n, s, off]) => [A(P, n), s, off]);
  const uVP = U(P, "uVP"), uT = U(P, "uT"), uSweep = U(P, "uSweep"), uShift = U(P, "uShift"), lVP = U(L, "uVP"), lShift = U(L, "uShift"), laP = A(L, "aP");

  // THE MODELLED CITY (city.bin, built in Blender): 643 buildings - podium towers, stepped
  // setbacks, round towers, L-shaped blocks, rooftop plant and masts - over a 27 x 27 m
  // ground, the scan's 17 x 17 in the middle and low blocks out to the horizon. 22,500
  // vertices, 11,752 triangles, one indexed draw. Each vertex is 16 bytes: int16 position
  // (mm), int8 normal, uint8 rank, int16 building centre (mm). Until it arrives nothing is
  // drawn; if it cannot be read, the procedural blocks above are drawn instead.
  let mode = "wait", t0m = 0, meshCount = 0, M = null, mbuf = null, ibuf = null, mA = null, mU = null;
  // REALISTIC LIGHT AND HAZE. Each face carries a material (0 concrete, 1 dark glass, 2
  // stone, 3 the landmark metal, 4 its blue glass, 5 deco steel). A warm low sun from one
  // side and a cool sky above light them; glass reflects the sky more at grazing angles;
  // walls darken towards the street; the landmark glass has floor bands. Distance and
  // low-lying haze fade everything into a smoky fog, and the scan's best-ranked streets
  // still flare red as the radar passes. The rank only drives that flare now.
  const MVS = `attribute vec3 aQ; attribute vec3 aNm; attribute float aR; attribute vec2 aC; attribute float aM;
    uniform mat4 uVP; uniform float uT; uniform float uSweep; uniform float uShift; uniform float uFlat;
    varying vec3 vN; varying vec3 vP; varying float vRank; varying float vFlare; varying float vDist; varying float vM; varying float vDepth;
    void main() {
      vec3 p = aQ * 0.001; vec2 c = aC * 0.001; float d = length(c);
      float rise = clamp((uT - 0.3 - d * 0.06) / 1.0, 0.0, 1.0); rise = 1.0 - pow(1.0 - rise, 3.0);
      p.y *= rise * (1.0 - uFlat * clamp(1.15 - d * 0.035, 0.0, 0.92));
      gl_Position = uVP * vec4(p, 1.0); vDepth = gl_Position.w; gl_Position.y += uShift * gl_Position.w;
      float th = atan(c.y, c.x);
      float dd = abs(mod(th - uSweep + 9.42477796, 6.28318531) - 3.14159265);
      vFlare = max(0.0, 1.0 - dd / 0.35) * clamp((8.0 - aR) / 7.0, 0.0, 1.0) * step(0.0, uSweep + 10.0) * step(d, 9.0);
      vN = aNm; vP = p; vRank = aR; vDist = d; vM = aM;
    }`;
  const MFS = `precision mediump float;
    uniform vec3 uCam; uniform vec3 uEye; uniform float uPR; uniform float uPF; uniform float uDark;
    varying vec3 vN; varying vec3 vP; varying float vRank; varying float vFlare; varying float vDist; varying float vM; varying float vDepth;
    vec3 base(float m) {
      // Red, as Eagle Eye is: red-washed concrete, oxblood glass, brick-red stone, a
      // graphite landmark with crimson glass, pale steel on the deco crown.
      if (m < 0.5) return vec3(0.34, 0.12, 0.12); if (m < 1.5) return vec3(0.12, 0.025, 0.035);
      if (m < 2.5) return vec3(0.44, 0.17, 0.15); if (m < 3.5) return vec3(0.30, 0.29, 0.31);
      if (m < 4.5) return vec3(0.42, 0.03, 0.05); return vec3(0.66, 0.56, 0.56); }
    void main() {
      vec3 n = normalize(vN), v = normalize(uCam - vP);
      vec3 sun = normalize(vec3(-0.55, 0.62, 0.55));
      float glass = ((vM > 0.5 && vM < 1.5) || (vM > 3.5 && vM < 4.5)) ? 1.0 : 0.0;
      vec3 col = base(vM);
      float diff = max(dot(n, sun), 0.0);
      vec3 light = vec3(1.0, 0.74, 0.62) * diff * 1.3 + vec3(0.34, 0.2, 0.22) * (0.5 + 0.5 * n.y);
      col *= light;
      if (glass > 0.5) {
        float fr = pow(1.0 - abs(dot(n, v)), 3.0);
        vec3 sky = mix(vec3(0.14, 0.04, 0.05), vec3(0.66, 0.30, 0.30), clamp(fr + 0.15, 0.0, 1.0));
        col = mix(col, sky, 0.45 + 0.35 * fr);
        if (vM > 3.5 && n.y < 0.5) col *= 0.75 + 0.25 * step(0.16, fract(vP.y / 0.19));
        col += vec3(1.0, 0.62, 0.5) * pow(max(dot(reflect(-sun, n), v), 0.0), 40.0) * 0.7;
      }
      if (n.y < 0.5) col *= mix(0.5, 1.05, clamp(vP.y / 1.8, 0.0, 1.0));
      col += vec3(1.0, 0.16, 0.12) * vFlare * 0.28;
      // THE PULSE: a sphere of light grows out of the emblem. Where its surface passes
      // through the city it draws a thin glowing contour over every roof and facade;
      // behind it the scanned buildings keep a fading glow striped with scan lines.
      float pd = length(vP - uEye), off = (pd - uPR) / 0.065;
      float line = exp(-off * off);
      float trail = step(pd, uPR) * exp(-(uPR - pd) * 0.45);
      float stripes = 0.55 + 0.45 * smoothstep(0.35, 0.5, abs(fract(vP.y * 7.0) - 0.5));
      col += vec3(1.0, 0.26, 0.2) * (line * 1.3 + trail * 0.26 * stripes) * uPF;
      vec3 fogCol = vec3(0.21, 0.07, 0.08);
      float fog = 1.0 - exp(-pow(max(vDepth - 9.0, 0.0) * 0.045, 1.35));
      fog = max(fog, (1.0 - clamp(vP.y / 2.5, 0.0, 1.0)) * smoothstep(5.0, 15.0, vDist) * 0.7);
      fog = max(fog, smoothstep(11.0, 16.5, vDist));
      col = mix(col, fogCol, clamp(fog, 0.0, 1.0));
      col *= 1.0 - uDark * 0.3;
      gl_FragColor = vec4(col, 1.0);
    }`;
  // THE SIGN: the SGEN logo on three faces of the landmark, lit (added onto the facade).
  const SVS = `attribute vec3 aP; attribute vec2 aT; uniform mat4 uVP; uniform float uShift; uniform float uRise; varying vec2 vT; varying float vDepth;
    void main() { vec3 p = aP; p.y *= uRise; gl_Position = uVP * vec4(p, 1.0); vDepth = gl_Position.w; gl_Position.y += uShift * gl_Position.w; vT = aT; }`;
  // ENGRAVED: the mark is cut into the metal - its inside a darker, red-tinted recess, a
  // highlight on the edge facing the light and a shadow on the other. The mask is the
  // mark's brightness (the PNG has a black ground), sampled from the S mark only.
  const SFS = `precision mediump float; uniform sampler2D uTex; uniform float uOn; varying vec2 vT; varying float vDepth;
    float m(vec2 t) { vec2 uv = vec2(mix(0.012, 0.392, t.x), mix(0.08, 0.92, t.y)); vec3 c = texture2D(uTex, uv).rgb; return smoothstep(0.12, 0.4, max(c.r, max(c.g, c.b))); }
    void main() { float k = m(vT); float o = 0.012;
      float hi = clamp(m(vT + vec2(-o, -o)) - k, 0.0, 1.0), lo = clamp(m(vT + vec2(o, o)) - k, 0.0, 1.0);
      float fog = 1.0 - exp(-pow(max(vDepth - 9.0, 0.0) * 0.045, 1.35));
      vec3 col = vec3(0.16, 0.035, 0.04) + vec3(0.55, 0.12, 0.11) * k * 0.35 + vec3(0.95, 0.6, 0.55) * hi * 0.55;
      float a = max(k * 0.92, max(hi, lo * 0.8)) * uOn;
      col = mix(col, vec3(0.21, 0.07, 0.08), fog * 0.85) * (1.0 - lo * 0.6);
      gl_FragColor = vec4(col, a); }`;
  let S = null, sbuf = null, tex = null;
  try { S = prog(SVS, SFS); } catch (e) { console.warn("rankCityGL sign:", e); }
  if (S) {
    const sq = [];
    const quad = (a, b, y0, y1) => { const [ax, az] = a, [bx, bz] = b;
      sq.push(ax, y0, az, 0, 1, bx, y0, bz, 1, 1, bx, y1, bz, 1, 0, ax, y0, az, 0, 1, bx, y1, bz, 1, 0, ax, y1, az, 0, 0); };
    // Square-ish panels (the S mark is 75 x 67 px) high on the core's three open faces.
    quad([-0.44, 0.352], [0.08, 0.352], 5.5, 5.97); quad([0.08, -0.352], [-0.44, -0.352], 5.5, 5.97);
    quad([-0.552, -0.26], [-0.552, 0.26], 5.5, 5.97);
    sbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sq), gl.STATIC_DRAW);
    const img = new Image();
    img.onload = () => { tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); };
    img.src = "/app/sgen-logo.png";
  }
  // THE SCANNER: the Eagle Eye emblem as a 3D model (emblem.bin, the hexagon mark traced and
  // extruded with a bevel in Blender by scripts/emblem/make_emblem.py, 3,552 triangles), hovering high over the pin and
  // turning slowly, red metal lit like the city, with a faint beam of light falling from it
  // onto the scan and a ring pulsing out across the streets.
  // THE ASSEMBLY: emblem.bin (EEM2) numbers the logo's four pieces - 0 the outer ring,
  // 1 the hexagon body, 2 and 3 the two loose wedges - and uAsm is the seconds since the
  // emblem first appeared. The ring spins in from large, the body drops in from in front,
  // then the wedges slide in from opposite corners, each easing out with a small overshoot
  // so it snaps into place. By 1.6 s every piece is home and the shader changes nothing.
  // aPart -1 (an EEM1 file, or reduced motion) skips it.
  const EVS = `attribute vec3 aP; attribute vec3 aN; attribute float aPart; uniform mat4 uVP; uniform float uShift; uniform float uA; uniform vec3 uO; uniform float uS; uniform float uTilt; uniform float uAsm;
    varying vec3 vN; varying vec3 vW; varying float vDepth;
    vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
    vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
    vec3 rotZ(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z); }
    void main() {
      vec3 q = aP, nq = aN;
      if (aPart >= 0.0 && uAsm < 1.7) {
        float d = aPart < 0.5 ? 0.0 : aPart < 1.5 ? 0.22 : aPart < 2.5 ? 0.5 : 0.6;
        float t = clamp((uAsm - d) / 0.9, 0.0, 1.0), u = t - 1.0;
        float k = 1.0 - (1.0 + 2.70158 * u * u * u + 1.70158 * u * u);
        float grow = min(1.0, t * 5.0);
        float spin = aPart < 0.5 ? 2.2 : aPart < 1.5 ? -1.1 : aPart < 2.5 ? 1.6 : -1.6;
        q = rotZ(q, k * spin) * grow; nq = rotZ(nq, k * spin);
        if (aPart < 0.5) q *= 1.0 + k * 0.9;
        else if (aPart < 1.5) q.z += k * 1.8;
        else if (aPart < 2.5) q.xy += k * vec2(-1.4, -0.9);
        else q.xy += k * vec2(1.4, 0.9);
      }
      vec3 p = rotY(rotX(q * uS, uTilt), uA) + uO; vW = p; vN = rotY(rotX(nq, uTilt), uA);
      gl_Position = uVP * vec4(p, 1.0); vDepth = gl_Position.w; gl_Position.y += uShift * gl_Position.w; }`;
  const EFS = `precision mediump float; uniform vec3 uCam; uniform float uOn; varying vec3 vN; varying vec3 vW; varying float vDepth;
    void main() { vec3 n = normalize(vN), v = normalize(uCam - vW); if (dot(n, v) < 0.0) n = -n;
      vec3 sun = normalize(vec3(-0.55, 0.62, 0.55));
      vec3 base = vec3(0.78, 0.05, 0.06);
      float diff = max(dot(n, sun), 0.0), spec = pow(max(dot(reflect(-sun, n), v), 0.0), 28.0), rim = pow(1.0 - abs(dot(n, v)), 2.5);
      vec3 col = base * (0.28 + 0.9 * diff) + vec3(1.0, 0.7, 0.62) * spec * 0.9 + vec3(1.0, 0.25, 0.2) * rim * 0.6 + base * 0.18;
      float fog = 1.0 - exp(-pow(max(vDepth - 9.0, 0.0) * 0.045, 1.35));
      col = mix(col, vec3(0.21, 0.07, 0.08), clamp(fog * 0.8, 0.0, 1.0));
      gl_FragColor = vec4(col * uOn, 1.0); }`;
  // THE PULSE SHELL: the same sphere, seen in the sky as a faint bubble of light. Its
  // brightness is a soft hump across the shell (zero face-on and zero exactly side-on),
  // so it has no hard rim.
  const BVS = `attribute vec3 aP; uniform mat4 uVP; uniform float uShift; uniform vec3 uO; uniform float uR; varying vec3 vN; varying vec3 vW;
    void main() { vec3 p = uO + aP * uR; vN = aP; vW = p; gl_Position = uVP * vec4(p, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const BFS = `precision mediump float; uniform float uOn; uniform vec3 uCam; varying vec3 vN; varying vec3 vW;
    void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(uCam - vW)));
      float hump = sin(clamp(f, 0.0, 1.0) * 3.14159); hump *= hump;
      float a = 0.09 * hump * smoothstep(-0.2, 0.6, vW.y);
      gl_FragColor = vec4(vec3(1.0, 0.26, 0.2) * a * uOn, 0.0); }`;
  // A camera-facing disc of light: the signal in the haze (uK 1) or a soft glow (uK 0).
  const DVS = `attribute vec2 aP; uniform mat4 uVP; uniform float uShift; uniform vec3 uC; uniform vec3 uR; uniform vec3 uUp; uniform float uSz; varying vec2 vP;
    void main() { vP = aP * 1.7; vec3 p = uC + (uR * aP.x + uUp * aP.y) * uSz * 1.7; gl_Position = uVP * vec4(p, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const DFS = `precision mediump float; uniform float uOn; uniform float uK; varying vec2 vP;
    void main() { float d = length(vP);
      float disc = (1.0 - smoothstep(0.82, 1.02, d)) * (0.55 + 0.45 * smoothstep(0.2, 0.95, d));
      float halo = exp(-d * d * 2.2) * 0.55 + exp(-d * 3.0) * 0.25;
      float a = mix(halo * 1.4, disc * 0.62 + halo * 0.3, uK) * smoothstep(1.7, 1.2, d);
      gl_FragColor = vec4(vec3(1.0, 0.3, 0.24) * a * uOn, 0.0); }`;
  // The pulse: a ring on the ground, growing from the pin and fading.
  const RVS = `attribute vec2 aP; uniform mat4 uVP; uniform float uShift; uniform float uRad; uniform vec2 uC; varying vec2 vP;
    void main() { vP = aP; gl_Position = uVP * vec4(uC.x + aP.x * uRad, 0.03, uC.y + aP.y * uRad, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const RFS = `precision mediump float; uniform float uOn; uniform float uK; varying vec2 vP;
    void main() { float d = length(vP); float ring = smoothstep(0.93, 0.985, d) * (1.0 - smoothstep(0.985, 1.0, d));
      float fill = (1.0 - d) * 0.05; gl_FragColor = vec4(vec3(1.0, 0.18, 0.14) * (ring * 0.55 + fill) * (1.0 - uK) * uOn, 1.0); }`;
  let E = null, ebuf = null, eCount = 0, eStride = 6, asm0 = 0, asmArmed = false, B = null, bbuf = null, bCount = 0, Rg = null, rbuf = null, Dk = null;
  try { E = prog(EVS, EFS); B = prog(BVS, BFS); Rg = prog(RVS, RFS); Dk = prog(DVS, DFS); } catch (e) { console.warn("rankCityGL scanner:", e); E = null; }
  if (E) {
    fetch("/app/emblem.bin").then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(ab => {
      const magic = String.fromCharCode(...new Uint8Array(ab, 0, 4));
      if (magic !== "EEM1" && magic !== "EEM2") throw new Error("not an emblem file");
      eStride = magic === "EEM2" ? 7 : 6;
      eCount = new DataView(ab).getUint32(4, true);
      ebuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ebuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ab, 8, eCount * eStride), gl.STATIC_DRAW);
    }).catch(e => console.warn("rankCityGL: emblem.bin", e));
    // The shell: a 32 x 16 sphere, unit radius.
    const cone = [], NA = 32, NL = 16;
    const P = (a, b) => [Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)];
    for (let k = 0; k < NA; k++) for (let j = 0; j < NL; j++) {
      const a0 = k / NA * Math.PI * 2, a1 = (k + 1) / NA * Math.PI * 2, b0 = j / NL * Math.PI, b1 = (j + 1) / NL * Math.PI;
      cone.push(...P(a0, b0), ...P(a1, b0), ...P(a1, b1), ...P(a0, b0), ...P(a1, b1), ...P(a0, b1));
    }
    bCount = cone.length / 3;
    bbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cone), gl.STATIC_DRAW);
    rbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, rbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  }
  // The emblem hovers above the landmark.
  const EYE = [0, 8.45, 0], EYE_SIZE = 1.5;
  const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  try { M = prog(MVS, MFS); } catch (e) { console.warn("rankCityGL mesh:", e); }
  // THE STORY'S SCAN (wlScanStory): one box per grid point, 30 vertices each. Before it is
  // searched a point is a grey tile; searched, it takes its rank's colour with a flash;
  // in the tower phase (uH) it rises as tall as the rank is good; uRiv swaps in the rival's
  // ranks. The same box, drawn alone with uBeam, is the beam from the emblem to the point
  // being searched. Per vertex: local x, y (0..1), z; normal; point centre; index; ranks.
  const OVS = `attribute vec3 aL; attribute vec3 aN; attribute vec2 aC; attribute float aI; attribute vec2 aRk;
    uniform mat4 uVP; uniform float uShift; uniform float uGrid; uniform float uRev; uniform float uH; uniform float uRiv;
    uniform float uBeam; uniform vec3 uEyeP; uniform float uFocus; uniform float uN; uniform float uImp; uniform float uSpan; uniform float uMerge;
    varying float vRiv; varying float vWipe; varying float vFly;
    varying vec3 vN; varying float vRank; varying float vDone; varying float vY; varying float vFocus; varying float vFlash;
    varying vec2 vL; varying float vAge; varying float vI;
    void main() {
      // THE RIVAL SWEEPS IN from the east: a front crosses the grid west, and each point
      // turns to the rival's rank as it passes (uRiv 0..1 is the front's journey).
      float front = mix(uSpan + 1.5, -uSpan - 1.5, uRiv);
      float rv = clamp((aC.x - front) / 1.2 + 0.5, 0.0, 1.0);
      // WEEK BY WEEK (uImp): the shop's ranks climb towards about half of what they were.
      float ours = mix(aRk.x, max(1.0, floor(aRk.x * 0.42 + 0.5)), uImp);
      float rank = mix(ours, aRk.y, rv);
      vRiv = rv; vWipe = (uRiv > 0.001 && uRiv < 0.999) ? max(0.0, 1.0 - abs(aC.x - front) / 0.7) : 0.0;
      // THE LAUNCH: the points are fired out of the emblem, the nearest first, each on an
      // arc to its place on the streets (drop 0 at the emblem, 1 landed).
      float drop = clamp(uGrid * 1.8 - clamp(length(aC) / uSpan, 0.0, 1.0) * 0.8, 0.0, 1.0); drop = 1.0 - pow(1.0 - drop, 3.0);
      float done = step(aI + 0.5, uRev);
      vec3 p; float age = uRev - aI - 0.5; vFly = 0.0;
      if (uBeam > 1.5) {
        // The ripple: a square ring growing out of a point that has just been searched.
        float r = 0.3 + max(age, 0.0) * 0.6;
        p = vec3(aC.x + aL.x * r, 0.05, aC.y + aL.z * r);
      } else if (uBeam > 0.5) {
        p = mix(vec3(aC.x, 0.1, aC.y), uEyeP, aL.y) + vec3(aL.x, 0.0, aL.z) * 0.035;
      } else {
        float tall = rank > 20.5 ? 0.06 : 0.12 + pow((21.0 - rank) / 20.0, 1.8) * 3.6;
        // The towers rise as a wave out from the shop, each overshooting a little.
        float wv = clamp(uH * 1.7 - length(aC) / uSpan * 0.7, 0.0, 1.0), u = wv - 1.0;
        float k = 1.0 + 2.2 * u * u * u + 1.2 * u * u;
        float hgt = 0.06 + done * k * tall;
        p = vec3(aC.x + aL.x * 0.3, aL.y * hgt + 0.02, aC.y + aL.z * 0.3);
        vec3 g0 = vec3(aC.x, 0.02, aC.y);
        p = mix(uEyeP, g0, drop) + vec3(0.0, sin(drop * 3.14159) * 3.0, 0.0) + (p - g0) * (0.25 + 0.75 * drop);
        vFly = sin(drop * 3.14159) * step(0.001, drop) * (1.0 - step(0.999, drop));
        // THE MERGE: from the outside in, each tower lifts off on an arc, shrinking, and
        // flies into the emblem; by uMerge 0.6 every one is inside it.
        float st = clamp(length(aC) / uSpan, 0.0, 1.0);
        float a = clamp((uMerge - (1.0 - st) * 0.3) / 0.3, 0.0, 1.0), e = a * a * (3.0 - 2.0 * a);
        vec3 c0 = vec3(aC.x, hgt * 0.5, aC.y);
        p = mix(c0, uEyeP, e) + vec3(0.0, sin(e * 3.14159) * 2.6, 0.0) + (p - c0) * (1.0 - e);
        vFly = max(vFly, sin(a * 3.14159) * step(0.001, a));
        if (a >= 0.999) p = vec3(0.0, -50.0, 0.0);
      }
      gl_Position = uVP * vec4(p, 1.0); gl_Position.y += uShift * gl_Position.w;
      if ((drop <= 0.001 && uBeam < 0.5) || (uBeam > 1.5 && (age < 0.0 || age > 3.5))) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
      vN = aN; vRank = rank; vDone = done; vY = aL.y; vFocus = 1.0 - step(0.5, abs(aI - uFocus));
      vL = aL.xz; vAge = age; vI = aI;
      vFlash = max(done * clamp(1.0 - (uRev - aI - 0.5) / 5.0, 0.0, 1.0), uBeam < 0.5 ? vFly : 0.0);
    }`;
  const OFS = `precision mediump float; uniform float uBeamF; uniform float uT; uniform float uRivF;
    varying float vRiv; varying float vWipe; varying float vFly;
    varying vec3 vN; varying float vRank; varying float vDone; varying float vY; varying float vFocus; varying float vFlash;
    varying vec2 vL; varying float vAge; varying float vI;
    vec3 steel(float r) {
      float k = r < 3.5 ? 1.0 : r < 7.5 ? 0.72 : r < 10.5 ? 0.5 : r < 15.5 ? 0.33 : r < 20.5 ? 0.21 : 0.12;
      return vec3(0.86, 0.9, 1.0) * k; }
    vec3 band(float r) {
      if (r < 3.5) return vec3(1.0, 0.227, 0.2); if (r < 7.5) return vec3(0.84, 0.118, 0.133);
      if (r < 10.5) return vec3(0.588, 0.071, 0.086); if (r < 15.5) return vec3(0.376, 0.047, 0.059);
      if (r < 20.5) return vec3(0.227, 0.035, 0.043); return vec3(0.16, 0.15, 0.16); }
    void main() {
      if (uBeamF > 1.5) {
        float e = max(abs(vL.x), abs(vL.y)), ring = smoothstep(0.84, 0.95, e) * (1.0 - smoothstep(0.97, 1.0, e));
        gl_FragColor = vec4(vec3(1.0, 0.32, 0.26) * ring * (1.0 - vAge / 3.5) * 1.2, 1.0); return; }
      // The beam carries packets of light up to the emblem: the results coming back.
      if (uBeamF > 0.5) { float pk = 0.35 + 0.65 * smoothstep(0.55, 0.75, fract(vY * 7.0 - uT * 2.6));
        gl_FragColor = vec4(vec3(1.0, 0.3, 0.24) * (0.3 + 0.7 * vY) * pk * 1.1, 1.0); return; }
      float shade = vN.y > 0.5 ? 1.0 : (abs(vN.x) > 0.5 ? 0.72 : 0.5);
      vec3 col = mix(band(vRank) * 1.25, steel(vRank), vRiv) + vec3(1.0, 0.95, 0.9) * vWipe * 0.9;
      vec3 c = mix(vec3(0.42, 0.4, 0.42) * (0.85 + 0.15 * sin(uT * 3.0 + vI * 0.7)), col, vDone) * shade;
      c *= 1.0 + vDone * 0.08 * sin(uT * 2.2 + vI * 1.3);
      if (vN.y > 0.5) c += col * vDone * 0.25;
      c += vec3(1.0, 0.55, 0.45) * vFlash * 0.9;
      c += vec3(1.0, 0.9, 0.85) * vFocus * (0.35 + 0.25 * sin(uT * 6.0));
      gl_FragColor = vec4(c, 1.0);
    }`;
  let O = null, obuf = null, oA = null, oU = null, oCount = 0;
  if (story) {
    try { O = prog(OVS, OFS); } catch (e) { console.warn("rankCityGL story:", e); }
    if (O) {
      const SN = story.N, SS = story.S, smid = (SN - 1) / 2, od = [];
      const BOX = [[[-1, 0, 1], [1, 0, 1], [1, 1, 1], [-1, 1, 1], [0, 0, 1]], [[1, 0, -1], [-1, 0, -1], [-1, 1, -1], [1, 1, -1], [0, 0, -1]],
        [[1, 0, 1], [1, 0, -1], [1, 1, -1], [1, 1, 1], [1, 0, 0]], [[-1, 0, -1], [-1, 0, 1], [-1, 1, 1], [-1, 1, -1], [-1, 0, 0]],
        [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], [0, 1, 0]]];
      for (let i = 0; i < SN * SN; i++) {
        const cx = (i % SN - smid) * SS, cz = (Math.floor(i / SN) - smid) * SS;
        for (const [a, b, c, d, n] of BOX) for (const v of [a, b, c, a, c, d])
          od.push(v[0], v[1], v[2], n[0], n[1], n[2], cx, cz, i, story.ours[i], story.rival[i]);
      }
      oCount = SN * SN * 30;
      obuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, obuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(od), gl.STATIC_DRAW);
      oA = [["aL", 3, 0], ["aN", 3, 3], ["aC", 2, 6], ["aI", 1, 8], ["aRk", 2, 9]].map(([n, sz, off]) => [A(O, n), sz, off]);
      oU = Object.fromEntries(["uVP", "uShift", "uGrid", "uRev", "uH", "uRiv", "uRivF", "uBeam", "uBeamF", "uEyeP", "uFocus", "uN", "uT", "uImp", "uSpan", "uMerge"].map(n => [n, U(O, n)]));
    }
  }
  // SPARKS: 14 per point, thrown up and out the moment the point is searched and falling
  // back over 9 points' time. Per spark: point index, direction x, z, speed, a random 0..1.
  const KVS = `attribute vec4 aS; attribute float aK; uniform mat4 uVP; uniform float uShift; uniform float uRev; uniform float uSN; uniform float uSS; uniform float uPx;
    varying float vA;
    void main() { float age = uRev - aS.x - 0.5;
      if (age < 0.0 || age > 9.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
      float a = age / 9.0, m = (uSN - 1.0) * 0.5;
      vec2 c = vec2(mod(aS.x, uSN) - m, floor(aS.x / uSN) - m) * uSS;
      vec3 p = vec3(c.x, 0.15, c.y) + vec3(aS.y, 1.5 + aK * 2.2, aS.z) * aS.w * a * 1.6 - vec3(0.0, 3.2 * a * a, 0.0);
      gl_Position = uVP * vec4(p, 1.0); gl_Position.y += uShift * gl_Position.w;
      vA = (1.0 - a) * (1.0 - a); gl_PointSize = uPx * (0.5 + aK) * (0.4 + vA) / gl_Position.w; }`;
  const KFS = `precision mediump float; varying float vA;
    void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA;
      gl_FragColor = vec4(vec3(1.0, 0.62, 0.42) * a * 1.6, 1.0); }`;
  // THE NETWORK: every point linked to its neighbours by a thin line on the ground, with a
  // pulse of light running along each link at its own phase, while a point is being read.
  // Per vertex: position, how far along its link (0 or 1), the link's phase.
  const NVS = `attribute vec3 aP; attribute float aU; attribute float aPh; uniform mat4 uVP; uniform float uShift; varying float vU; varying float vPh;
    void main() { vU = aU; vPh = aPh; gl_Position = uVP * vec4(aP, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const NFS = `precision mediump float; uniform float uT; uniform float uOn; varying float vU; varying float vPh;
    void main() { float f = fract(vPh - uT * 0.55), d = vU - f; float pulse = exp(-d * d * 160.0);
      gl_FragColor = vec4(vec3(1.0, 0.3, 0.24) * (0.45 + pulse * 3.0) * uOn, 1.0); }`;
  let NW = null, nbuf = null, nCount = 0;
  if (O) {
    try { NW = prog(NVS, NFS); } catch (e) { console.warn("rankCityGL network:", e); }
    if (NW) {
      const nd = [], SN = story.N, SS = story.S, m = (SN - 1) / 2; let ns = 5;
      const nr = () => { ns = (ns * 16807) % 2147483647; return ns / 2147483647; };
      const P = (r, c) => [(c - m) * SS, 0.11, (r - m) * SS];
      for (let r = 0; r < SN; r++) for (let c = 0; c < SN; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= SN || c2 >= SN || (dr && dc && nr() < 0.7)) continue;
        const ph = nr();
        nd.push(...P(r, c), 0, ph, ...P(r2, c2), 1, ph);
      }
      nCount = nd.length / 5;
      nbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nd), gl.STATIC_DRAW);
    }
  }
  // THE SHOP'S PIN in 3D (pin.bin, built in Blender by scripts/pin/make_pin.py: 4,220
  // triangles, 1.0 tall with its tip at the origin; part 0 the red body, 1 the white eye).
  // Glossy red lit like the emblem, the eye glowing white, turned by uA, squashed by uSq.
  const PVS = `attribute vec3 aP; attribute vec3 aN; attribute float aPart; uniform mat4 uVP; uniform float uShift; uniform vec3 uO; uniform float uS; uniform float uA; uniform float uSq;
    varying vec3 vN; varying vec3 vW; varying float vPart;
    void main() { float c = cos(uA), s = sin(uA);
      vec3 q = vec3(c * aP.x + s * aP.z, aP.y * uSq, -s * aP.x + c * aP.z) * uS;
      vN = vec3(c * aN.x + s * aN.z, aN.y, -s * aN.x + c * aN.z); vW = q + uO; vPart = aPart;
      gl_Position = uVP * vec4(vW, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const PFS = `precision mediump float; uniform vec3 uCam; uniform float uOn; varying vec3 vN; varying vec3 vW; varying float vPart;
    void main() { vec3 n = normalize(vN), v = normalize(uCam - vW); if (dot(n, v) < 0.0) n = -n;
      vec3 sun = normalize(vec3(-0.55, 0.62, 0.55));
      float diff = max(dot(n, sun), 0.0), spec = pow(max(dot(reflect(-sun, n), v), 0.0), 40.0), rim = pow(1.0 - abs(dot(n, v)), 2.2);
      vec3 base = vec3(0.92, 0.06, 0.07);
      vec3 col = base * (0.32 + 0.95 * diff) + vec3(1.0, 0.85, 0.8) * spec * 1.1 + vec3(1.0, 0.3, 0.25) * rim * 0.9;
      if (vPart > 0.5) col = vec3(1.0, 0.97, 0.95) * (1.15 + 0.2 * diff);
      gl_FragColor = vec4(col * uOn, 1.0); }`;
  let PN = null, pnbuf = null, pnCount = 0;
  if (O) {
    try { PN = prog(PVS, PFS); } catch (e) { console.warn("rankCityGL pin:", e); }
    if (PN) fetch("/app/pin.bin").then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(ab => {
      if (String.fromCharCode(...new Uint8Array(ab, 0, 4)) !== "EEM2") throw new Error("not a pin file");
      pnCount = new DataView(ab).getUint32(4, true);
      pnbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pnbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ab, 8, pnCount * 7), gl.STATIC_DRAW);
      if (still) draw(1e9);
    }).catch(e => console.warn("rankCityGL: pin.bin", e));
  }
  // THE SEARCHERS (person.bin, built in Blender by scripts/props/make_props.py): a person
  // looking down at a phone, drawn as a red hologram - see-through, brightest at its edges
  // (a fresnel rim), with faint scan lines rising through it and the phone's screen lit.
  // Light is added, not painted over, so the city and the tiles show through.
  const XVS = `attribute vec3 aP; attribute vec3 aN; attribute float aPart; uniform mat4 uVP; uniform float uShift; uniform vec3 uO; uniform float uS; uniform float uA;
    varying vec3 vN; varying vec3 vW; varying float vPart; varying float vY;
    void main() { float c = cos(uA), s = sin(uA);
      vec3 q = vec3(c * aP.x + s * aP.z, aP.y, -s * aP.x + c * aP.z) * uS;
      vN = vec3(c * aN.x + s * aN.z, aN.y, -s * aN.x + c * aN.z); vW = q + uO; vPart = aPart; vY = aP.y;
      gl_Position = uVP * vec4(vW, 1.0); gl_Position.y += uShift * gl_Position.w; }`;
  const XFS = `precision mediump float; uniform vec3 uCam; uniform float uGlow; uniform float uOn; uniform float uT;
    varying vec3 vN; varying vec3 vW; varying float vPart; varying float vY;
    void main() { vec3 n = normalize(vN), v = normalize(uCam - vW);
      float rim = pow(1.0 - abs(dot(n, v)), 1.6);
      float scan = 0.65 + 0.35 * smoothstep(0.3, 0.5, abs(fract(vY * 14.0 - uT * 1.2) - 0.5));
      vec3 col = vec3(1.0, 0.16, 0.13) * (0.16 + rim * 0.95) * scan;
      if (vPart > 2.5) col = vec3(1.0, 0.45, 0.4) * (1.2 + uGlow * 1.8);
      gl_FragColor = vec4(col * uOn, 1.0); }`;
  let XP = null; const props = { person: null };
  if (story) {
    try { XP = prog(XVS, XFS); } catch (e) { console.warn("rankCityGL searchers:", e); }
    if (XP) fetch("/app/person.bin").then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(ab => {
      if (String.fromCharCode(...new Uint8Array(ab, 0, 4)) !== "EEM2") throw new Error("not a person file");
      const n = new DataView(ab).getUint32(4, true), b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ab, 8, n * 7), gl.STATIC_DRAW);
      props.person = { b, n };
      if (still) draw(1e9);
    }).catch(e => console.warn("rankCityGL: person.bin", e));
  }
  // THE SEARCHES GOING OUT: a line from every searcher's phone up to the emblem, with
  // pulses running up it (drawn by the network's program, NW, whose pulse runs 0 -> 1).
  let qbufS = null, sCount = 0;
  if (story && NW) {
    const sd = [], m = (story.N - 1) / 2; let ss = 31;
    const sr = () => { ss = (ss * 16807) % 2147483647; return ss / 2147483647; };
    for (let i = 0; i < story.N * story.N; i++) {
      if (i === Math.floor(story.N * story.N / 2)) continue;
      const x = (i % story.N - m) * story.S + 0.18, z = (Math.floor(i / story.N) - m) * story.S + 0.12, ph = sr();
      sd.push(x, 0.3, z, 0, ph, EYE[0], EYE[1], EYE[2], 1, ph);
    }
    sCount = sd.length / 5;
    qbufS = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qbufS); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sd), gl.STATIC_DRAW);
  }
  // Each searcher's heading and the moment its screen lights, fixed by a seed.
  let xs = 77; const xr = () => { xs = (xs * 16807) % 2147483647; return xs / 2147483647; };
  const people = Array.from({ length: 48 }, () => ({ face: xr() * Math.PI * 2, blink: xr() * 6 }));
  let K = null, kbuf = null, kCount = 0;
  if (O) {
    try { K = prog(KVS, KFS); } catch (e) { console.warn("rankCityGL sparks:", e); }
    if (K) {
      const kd = []; let ks = 99;
      const kr = () => { ks = (ks * 16807) % 2147483647; return ks / 2147483647; };
      for (let i = 0; i < story.N * story.N; i++) for (let j = 0; j < 14; j++) {
        const ang = kr() * Math.PI * 2; kd.push(i, Math.cos(ang), Math.sin(ang), 0.6 + kr() * 1.4, kr());
      }
      kCount = kd.length / 5;
      kbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, kbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(kd), gl.STATIC_DRAW);
    }
  }
  // BLOOM, while the film plays: the scene is drawn into a texture, its brightest parts are
  // cut out at half size and blurred twice each way, and the glow is added back over it.
  const QVS = `attribute vec2 aP; varying vec2 vU; void main() { vU = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;
  const BRT = `precision mediump float; uniform sampler2D uTex; varying vec2 vU;
    void main() { vec4 c = texture2D(uTex, vU); float m = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c.rgb * smoothstep(0.42, 0.85, m), 1.0); }`;
  const BLR = `precision mediump float; uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vU;
    void main() { vec3 c = texture2D(uTex, vU).rgb * 0.227;
      c += (texture2D(uTex, vU + uDir * 1.385).rgb + texture2D(uTex, vU - uDir * 1.385).rgb) * 0.316;
      c += (texture2D(uTex, vU + uDir * 3.231).rgb + texture2D(uTex, vU - uDir * 3.231).rgb) * 0.07;
      gl_FragColor = vec4(c, 1.0); }`;
  const CMP = `precision mediump float; uniform sampler2D uTex; uniform sampler2D uGlow; uniform float uAmt; varying vec2 vU;
    void main() { vec4 s = texture2D(uTex, vU); vec3 g = texture2D(uGlow, vU).rgb * uAmt;
      gl_FragColor = vec4(s.rgb + g, clamp(s.a + max(g.r, max(g.g, g.b)), 0.0, 1.0)); }`;
  let PB = null, PL = null, PC = null, qbuf = null, rt = null;
  if (O) {
    try { PB = prog(QVS, BRT); PL = prog(QVS, BLR); PC = prog(QVS, CMP); } catch (e) { console.warn("rankCityGL bloom:", e); PB = null; }
    if (PB) { qbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW); }
  }
  const target = (w, hh, depth) => {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, hh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let rb = null;
    if (depth) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, hh);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, rb, w, h: hh };
  };
  const drop = (x) => { if (!x) return; gl.deleteTexture(x.tex); gl.deleteFramebuffer(x.fbo); if (x.rb) gl.deleteRenderbuffer(x.rb); };
  const targets = () => {
    const w = canvas.width, hh = canvas.height;
    if (rt && rt.w === w && rt.h === hh) return rt;
    if (rt) { drop(rt.scene); drop(rt.a); drop(rt.b); }
    const hw = Math.max(1, w >> 1), hh2 = Math.max(1, hh >> 1);
    rt = { w, h: hh, scene: target(w, hh, true), a: target(hw, hh2, false), b: target(hw, hh2, false) };
    return rt;
  };
  const quad = (pr) => { gl.bindBuffer(gl.ARRAY_BUFFER, qbuf); const l = A(pr, "aP"); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 8, 0); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.disableVertexAttribArray(l); };
  const startBoxes = () => { if (mode === "wait") { mode = "boxes"; t0m = performance.now(); } };
  if (!M) startBoxes();
  else fetch("/app/city.bin").then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(ab => {
    const hd = new DataView(ab);
    if (String.fromCharCode(...new Uint8Array(ab, 0, 4)) !== "EEC2") throw new Error("not a city file");
    const nv = hd.getUint32(4, true), ni = hd.getUint32(8, true);
    mbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, mbuf); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(ab, 12, nv * 16), gl.STATIC_DRAW);
    ibuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ab.slice(12 + nv * 16, 12 + nv * 16 + ni * 2)), gl.STATIC_DRAW);
    mA = { q: A(M, "aQ"), n: A(M, "aNm"), r: A(M, "aR"), c: A(M, "aC"), m: A(M, "aM") };
    mU = { vp: U(M, "uVP"), t: U(M, "uT"), sw: U(M, "uSweep"), sh: U(M, "uShift"), cam: U(M, "uCam"), eye: U(M, "uEye"), pr: U(M, "uPR"), pf: U(M, "uPF"), fl: U(M, "uFlat"), dk: U(M, "uDark") };
    meshCount = ni;
    // The streets now run out to the edge of the bigger city.
    const L2 = [], E = 15;
    for (let a = -E; a <= E + 0.01; a += AV) L2.push(a, 0, -E, a, 0, E, -E, 0, a, E, 0, a);
    lines.length = 0; lines.push(...L2);
    gl.bindBuffer(gl.ARRAY_BUFFER, lbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L2), gl.STATIC_DRAW);
    mode = "mesh"; t0m = performance.now(); canvas.dataset.city = "mesh";
    if (still) draw(1e9);
  }).catch((e) => { console.warn("rankCityGL: city.bin", e); startBoxes(); });

  // Camera flight over the page: [p, azimuth add, elevation (deg), distance, vertical shift].
  // [p, azimuth add, elevation (deg), distance, vertical shift, look-at height]. The hero is a
  // low aerial shot across the skyline at the landmark, the horizon lost in haze.
  // ... and a sideways shift (share of the half-width) that puts the landmark beside the
  // centred headline rather than behind it.
  const PATH = [[0, 0.35, 11, 17, -0.32, 3.2, .62], [.12, .7, 24, 15, -0.1, 2.2, .3], [.45, 1.6, 31, 19, 0, 1.2, 0], [.78, 2.5, 40, 15, 0, 1.0, 0], [.93, 3.0, 14, 18, -0.25, 3.0, .6], [1, 3.15, 12, 19, -0.3, 3.2, .62]];
  const atOf = (PT, p) => {
    let k = 0; while (k < PT.length - 2 && p > PT[k + 1][0]) k++;
    const a = PT[k], b = PT[k + 1], u = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0]))), s = u * u * (3 - 2 * u);
    return a.map((v, n) => v + (b[n] - v) * s);
  };
  const at = (p) => atOf(PATH, p);
  // The story's flight, by its own progress: straight down from high above, lower and
  // round as the points are searched, in close on the point being read, round again as
  // the towers rise and the rival takes over, and back up to see the whole result. The
  // last column moves the city right of the captions on wide screens.
  const SPATH = [[0, 0.0, 88, 46, 0, 0, .26], [.12, 0.9, 72, 34, 0, 0, .28], [.26, 1.4, 56, 28, 0, 0, .28], [.47, 2.1, 46, 26, 0, 0, .28],
    [.54, 2.45, 24, 14, 0, .7, .1], [.62, 2.75, 30, 18, 0, .6, .2], [.74, 3.35, 36, 25, 0, .9, .28], [.88, 4.0, 44, 26, 0, .7, .28], [1, 4.5, 68, 36, 0, .2, .28]];
  const sm = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
  let prevStp = -1, stp = -1, kick = 0, vel = 0, lastWant = 0, mgs = 0, shakeAt = -1e9, shakeAmp = 0;
  // Impacts: the grid landing, the towers bursting up, the rival sweeping in. Crossing one
  // (either way) starts a shake that dies away in about half a second. It used to be a
  // function of the position, so parking the scroll on an impact shook the city forever.
  const IMPACTS = [[0.215, 0.55], [0.665, 0.7], [0.79, 0.35]];
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const look = (ex, ey, ez, tx, ty, tz) => {
    let zx = ex - tx, zy = ey - ty, zz = ez - tz; const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    let xx = zz, xy = 0, xz = -zx; const xl = Math.hypot(xx, xz); xx /= xl; xz /= xl;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1];
  };
  const mul = (a, b) => { const r = new Array(16); for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + rr] * b[c * 4 + k]; r[c * 4 + rr] = s; } return r; };

  const still = motionOff();
  let W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0, sp = 0, raf = 0;
  const t0 = performance.now();
  const resize = () => {
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (still) draw(1e9);
  };
  function draw(now) {
    raf = 0;
    if (mode === "wait") { schedule(); return; }
    const t = still ? 99 : (now - t0m) / 1000;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    sp += (cam() - sp) * 0.1;
    // The story's weight: 0 outside its section, 1 inside, eased in and out at its ends.
    if (story) {
      const want = story.p();
      // THE LENS KICK: the faster the scroll, the wider the lens, easing back when it stops.
      // Heavily smoothed: a mouse wheel scrolls in steps, and following each step made
      // the lens pump in and out, which read as the city shaking.
      vel += (Math.abs(want - lastWant) - vel) * 0.04; lastWant = want;
      kick += (Math.min(0.12, vel * 18) - kick) * 0.06;
      stp = still || stp === -1 || Math.abs(want - stp) > 0.3 ? want : stp + (want - stp) * 0.12;
    }
    const sw = story ? story.w() : 0;
    // THE FINALE (story.m(), 0..1 over the section's last stretch): the towers fly into the
    // emblem, the emblem swells and fires a pulse across the city, the buildings rise back,
    // and the camera returns to the page's own flight: the city as it was before the scan.
    if (story && story.m) { const mw = story.m(); mgs = still ? mw : mgs + (mw - mgs) * 0.12; }
    const back = sm((mgs - 0.45) / 0.5), swc = sw * (1 - back);
    const base = at(sp), cs = swc > 0 ? atOf(SPATH, Math.min(1, Math.max(0, stp))) : base;
    const [, azAdd, elDeg, dist0, shift0, lookY, sideRaw] = base.map((v, n) => v + (cs[n] - v) * swc);
    const flat = sw * sm((stp - 0.62) / 0.08) * (1 - sm((mgs - 0.5) / 0.4));
    const asp = W / Math.max(1, H), dist = dist0 * (asp < 1 ? 1.3 + 0.3 * swc : 1);
    // On a phone the caption fills the lower part of the screen, so the story's scene is
    // lifted into the upper part.
    // And at the top of the page the landmark and emblem drop below the headline, not
    // behind it, into the space under the sign-in button.
    const shift = shift0 + (asp < 1 ? 0.3 * swc - 1.3 * (1 - swc) * Math.max(0, 1 - sp * 5) : 0);
    const az = -0.62 + azAdd + (still ? 0 : t * 0.04) + mx * 0.4, el = (elDeg + my * 6) * Math.PI / 180;
    const ty = lookY;
    for (const [c, amp] of IMPACTS) if ((prevStp - c) * (stp - c) < 0 && Math.abs(stp - prevStp) < 0.05) { shakeAt = now; shakeAmp = amp; }
    prevStp = stp;
    const shk = still ? 0 : sw * shakeAmp * Math.exp(-Math.max(0, now - shakeAt) / 160);
    const ex = Math.cos(el) * Math.sin(az) * dist + Math.sin(t * 61) * shk, ey = ty + Math.sin(el) * dist + Math.sin(t * 47 + 1) * shk * 0.8,
      ez = Math.cos(el) * Math.cos(az) * dist + Math.cos(t * 53) * shk;
    const vp = mul(persp(0.62 + (still ? 0 : kick * sw), asp, 3, 90), look(ex, ey, ez, mx * -1.2, ty, my * -0.8));
    // The sideways shift, in clip space (only on screens wide enough to have a side).
    const side = asp > 1.2 ? sideRaw : 0;
    for (let c = 0; c < 4; c++) vp[c * 4] += side * vp[c * 4 + 3];
    // The emblem and its pulse: every 6.5 s a sphere of light grows from it to 24 units.
    const on = still ? 1 : Math.min(1, Math.max(0, (t - 1.0) / 1.0));
    const bob = still ? 0 : Math.sin(t * 1.3) * 0.15, eyeY = EYE[1] + bob;
    const pk = still ? 0.45 : ((t - 1.5) / 6.5) % 1, pulseOn = still ? 0.6 : (t < 1.5 ? 0 : 1);
    const nf = (asp < 1.2 && !still) ? Math.min(1, Math.max(0, 1 - (sp - 0.02) / 0.05)) : 1;
    let PR = 0.6 + Math.pow(Math.max(0, pk), 0.8) * 24, PF = pulseOn * on * nf * Math.pow(1 - Math.max(0, pk), 0.75);
    if (mgs > 0.58 && mgs < 0.999 && sw > 0.02) { const q = (mgs - 0.58) / 0.42; PR = 0.6 + Math.pow(q, 0.8) * 26; PF = Math.max(PF, Math.pow(1 - q, 0.6) * 1.4); }
    const fire = sw * Math.exp(-Math.pow((stp - 0.15) / 0.035, 2));
    const swell = 1 + 0.55 * Math.exp(-Math.pow((mgs - 0.6) / 0.09, 2)) * sw + 0.45 * fire;
    if (fire > 0.05 && mgs < 0.01) { const q = Math.min(1, Math.max(0, (stp - 0.12) / 0.1)); PR = Math.max(PR, 0.6 + Math.pow(q, 0.8) * 22); PF = Math.max(PF, Math.pow(1 - q, 0.6) * 1.2 * sw); }
    const bloom = PB && qbuf && sw > 0.02 && !still ? targets() : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloom ? bloom.scene.fbo : null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Streets.
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(L); gl.bindBuffer(gl.ARRAY_BUFFER, lbuf);
    for (const [loc] of attrs) if (loc >= 0) gl.disableVertexAttribArray(loc);
    gl.enableVertexAttribArray(laP); gl.vertexAttribPointer(laP, 3, gl.FLOAT, false, 12, 0);
    gl.uniformMatrix4fv(lVP, false, new Float32Array(vp)); gl.uniform1f(lShift, shift);
    gl.drawArrays(gl.LINES, 0, lines.length / 3);
    gl.disableVertexAttribArray(laP);
    // Buildings: the modelled city, or the procedural blocks when it is not there.
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    const sweepNow = still ? -100 : (t * 1.1) % (Math.PI * 2) - Math.PI;
    if (mode === "mesh") {
      gl.useProgram(M); gl.bindBuffer(gl.ARRAY_BUFFER, mbuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
      gl.enableVertexAttribArray(mA.q); gl.vertexAttribPointer(mA.q, 3, gl.SHORT, false, 16, 0);
      gl.enableVertexAttribArray(mA.n); gl.vertexAttribPointer(mA.n, 3, gl.BYTE, true, 16, 6);
      gl.enableVertexAttribArray(mA.r); gl.vertexAttribPointer(mA.r, 1, gl.UNSIGNED_BYTE, false, 16, 9);
      gl.enableVertexAttribArray(mA.c); gl.vertexAttribPointer(mA.c, 2, gl.SHORT, false, 16, 10);
      gl.enableVertexAttribArray(mA.m); gl.vertexAttribPointer(mA.m, 1, gl.UNSIGNED_BYTE, false, 16, 14);
      gl.uniformMatrix4fv(mU.vp, false, new Float32Array(vp)); gl.uniform1f(mU.t, t); gl.uniform1f(mU.sh, shift); gl.uniform1f(mU.sw, sweepNow);
      gl.uniform3f(mU.cam, ex, ey, ez);
      gl.uniform3f(mU.eye, EYE[0], eyeY, EYE[2]); gl.uniform1f(mU.pr, PR); gl.uniform1f(mU.pf, PF); gl.uniform1f(mU.fl, flat); gl.uniform1f(mU.dk, sw * (1 - back));
      gl.drawElements(gl.TRIANGLES, meshCount, gl.UNSIGNED_SHORT, 0);
      for (const k of ["q", "n", "r", "c", "m"]) gl.disableVertexAttribArray(mA[k]);
      // The lit sign, added on top of the facade, switched on once the tower has risen.
      if (S && tex) {
        const rise = still ? 1 : Math.min(1, Math.max(0, (t - 0.3) / 1.0)), on = still ? 1 : Math.min(1, Math.max(0, (t - 1.4) / 0.6));
        gl.useProgram(S); gl.bindBuffer(gl.ARRAY_BUFFER, sbuf);
        const sp_ = A(S, "aP"), st_ = A(S, "aT");
        gl.enableVertexAttribArray(sp_); gl.vertexAttribPointer(sp_, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(st_); gl.vertexAttribPointer(st_, 2, gl.FLOAT, false, 20, 12);
        gl.uniformMatrix4fv(U(S, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(S, "uShift"), shift);
        gl.uniform1f(U(S, "uRise"), (1 - Math.pow(1 - rise, 3)) * (1 - flat * 0.92)); gl.uniform1f(U(S, "uOn"), on * (1 - flat));
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U(S, "uTex"), 0);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, 18);
        gl.depthMask(true); gl.disable(gl.BLEND);
        gl.disableVertexAttribArray(sp_); gl.disableVertexAttribArray(st_);
      }
      // The emblem: red metal, turned towards the camera with a slow sway, a soft glow
      // behind it, and the pulse shell around it.
      if (E && ebuf && nf > 0.01) {
        const fz = norm3([ex - mx * -1.2, ey - ty, ez - my * -0.8]), fr = norm3([fz[2], 0, -fz[0]]), fu = cross3(fz, fr);
        gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false);
        // The glow.
        gl.useProgram(Dk); gl.bindBuffer(gl.ARRAY_BUFFER, rbuf);
        const dp = A(Dk, "aP"); gl.enableVertexAttribArray(dp); gl.vertexAttribPointer(dp, 2, gl.FLOAT, false, 8, 0);
        gl.uniformMatrix4fv(U(Dk, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(Dk, "uShift"), shift);
        gl.uniform3f(U(Dk, "uC"), EYE[0] - fz[0] * 0.6, eyeY - fz[1] * 0.6, EYE[2] - fz[2] * 0.6);
        gl.uniform3f(U(Dk, "uR"), fr[0], fr[1], fr[2]); gl.uniform3f(U(Dk, "uUp"), fu[0], fu[1], fu[2]);
        gl.uniform1f(U(Dk, "uSz"), EYE_SIZE * 1.1); gl.uniform1f(U(Dk, "uK"), 0); gl.uniform1f(U(Dk, "uOn"), on * (0.55 + 0.45 * (1 - Math.max(0, pk))));
        gl.drawArrays(gl.TRIANGLES, 0, 6); gl.disableVertexAttribArray(dp);
        gl.depthMask(true); gl.disable(gl.BLEND);
        // The emblem itself.
        gl.useProgram(E); gl.bindBuffer(gl.ARRAY_BUFFER, ebuf);
        const ep = A(E, "aP"), en = A(E, "aN"), ea = A(E, "aPart"), es = eStride * 4;
        gl.enableVertexAttribArray(ep); gl.vertexAttribPointer(ep, 3, gl.FLOAT, false, es, 0);
        gl.enableVertexAttribArray(en); gl.vertexAttribPointer(en, 3, gl.FLOAT, false, es, 12);
        const animate = eStride === 7 && !still && ea >= 0;
        if (animate) { gl.enableVertexAttribArray(ea); gl.vertexAttribPointer(ea, 1, gl.FLOAT, false, es, 24); }
        else if (ea >= 0) { gl.disableVertexAttribArray(ea); gl.vertexAttrib1f(ea, -1); }
        // The clock starts once the emblem has faded most of the way in, so the assembly is
        // seen rather than played while it is still dark; until then the pieces wait apart.
        if (!asm0 && on * nf > 0.6) asm0 = performance.now();
        // Scrolled well down the page and back to the top: the logo comes apart and
        // assembles again, so it greets a visitor returning to the hero.
        if (sp > 0.35) asmArmed = true;
        else if (asmArmed && sp < 0.03) { asmArmed = false; asm0 = 0; }
        gl.uniform1f(U(E, "uAsm"), !animate ? 9 : asm0 ? (performance.now() - asm0) / 1000 : 0);
        gl.uniformMatrix4fv(U(E, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(E, "uShift"), shift);
        gl.uniform1f(U(E, "uA"), Math.atan2(fz[0], fz[2]) + (still ? 0 : Math.sin(t * 0.55) * 0.45)); gl.uniform1f(U(E, "uTilt"), -Math.asin(fz[1]) * 0.8);
        gl.uniform3f(U(E, "uO"), EYE[0], eyeY, EYE[2]); gl.uniform1f(U(E, "uS"), EYE_SIZE * (0.6 + 0.4 * on) * nf * swell);
        gl.uniform3f(U(E, "uCam"), ex, ey, ez); gl.uniform1f(U(E, "uOn"), on);
        gl.drawArrays(gl.TRIANGLES, 0, eCount);
        gl.disableVertexAttribArray(ep); gl.disableVertexAttribArray(en); if (ea >= 0) gl.disableVertexAttribArray(ea);
        // The pulse shell, light added to colour only.
        if (PF > 0.002) {
          gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false);
          gl.useProgram(B); gl.bindBuffer(gl.ARRAY_BUFFER, bbuf);
          const bp = A(B, "aP"); gl.enableVertexAttribArray(bp); gl.vertexAttribPointer(bp, 3, gl.FLOAT, false, 12, 0);
          gl.uniformMatrix4fv(U(B, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(B, "uShift"), shift);
          gl.uniform3f(U(B, "uO"), EYE[0], eyeY, EYE[2]); gl.uniform1f(U(B, "uR"), PR);
          gl.uniform1f(U(B, "uOn"), PF); gl.uniform3f(U(B, "uCam"), ex, ey, ez);
          gl.drawArrays(gl.TRIANGLES, 0, bCount); gl.disableVertexAttribArray(bp);
          gl.depthMask(true); gl.disable(gl.BLEND);
        }
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
    } else {
    gl.useProgram(P); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (const [loc, size, off] of attrs) { if (loc < 0) continue; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4); }
    gl.uniformMatrix4fv(uVP, false, new Float32Array(vp)); gl.uniform1f(uT, t); gl.uniform1f(uShift, shift);
    // The sweep turns in the world, so a building flares where the beam is, wherever the camera is.
    gl.uniform1f(uSweep, still ? -100 : (t * 1.1) % (Math.PI * 2) - Math.PI);
    gl.drawArrays(gl.TRIANGLES, 0, boxes.length * 30);
    for (const [loc] of attrs) if (loc >= 0) gl.disableVertexAttribArray(loc);
    }
    // The searchers show only in "Read any street" (story 0.5-0.62), fading in and out.
    const life = sw * sm((stp - 0.49) / 0.025) * (1 - sm((stp - 0.605) / 0.02));
    // The story's scan, over the city.
    if (O && obuf && sw > 0.001) {
      const grid = Math.min(sm((stp - 0.12) / 0.1), sw), rev = Math.min(1, Math.max(0, (stp - 0.26) / 0.22)) * story.N * story.N;
      const tow = sm((stp - 0.62) / 0.08), riv = sm((stp - 0.76) / 0.06) * (1 - sm((stp - 0.88) / 0.04));
      gl.useProgram(O); gl.bindBuffer(gl.ARRAY_BUFFER, obuf);
      for (const [loc, size, off] of oA) if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 44, off * 4); }
      gl.uniformMatrix4fv(oU.uVP, false, new Float32Array(vp)); gl.uniform1f(oU.uShift, shift);
      gl.uniform1f(oU.uGrid, grid); gl.uniform1f(oU.uRev, rev); gl.uniform1f(oU.uH, tow); gl.uniform1f(oU.uRiv, riv); gl.uniform1f(oU.uRivF, riv);
      gl.uniform1f(oU.uImp, sm((stp - 0.91) / 0.08)); gl.uniform1f(oU.uSpan, (story.N - 1) / 2 * story.S); gl.uniform1f(oU.uMerge, mgs);
      gl.uniform1f(oU.uN, story.N * story.N); gl.uniform1f(oU.uT, t);
      gl.uniform1f(oU.uFocus, stp >= 0.5 && stp < 0.62 ? story.FOC : -9);
      gl.uniform1f(oU.uBeam, 0); gl.uniform1f(oU.uBeamF, 0); gl.uniform3f(oU.uEyeP, EYE[0], EYE[1], EYE[2]);
      // Tiles over the full-height city are drawn on top of it; towers over the sunk city
      // are depth-tested, so they stand among the buildings.
      if (tow > 0.02) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, oCount);
      if (rev > 0 && rev < story.N * story.N && !still) {
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        // Ripples out of the points just searched.
        gl.uniform1f(oU.uBeam, 2); gl.uniform1f(oU.uBeamF, 2);
        gl.drawArrays(gl.TRIANGLES, 0, oCount);
        // Two beams, as the scanner runs two workers: the two points being searched now.
        const NN = story.N * story.N;
        if (rev < NN) {
          gl.uniform1f(oU.uBeam, 1); gl.uniform1f(oU.uBeamF, 1);
          for (const k of [Math.floor(rev), Math.floor(rev) + 1]) if (k < NN) gl.drawArrays(gl.TRIANGLES, k * 30, 30);
        }
        gl.depthMask(true); gl.disable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      for (const [loc] of oA) if (loc >= 0) gl.disableVertexAttribArray(loc);
      const net = sw * sm((stp - 0.44) / 0.06) * (1 - sm((stp - 0.62) / 0.04));
      if (NW && nbuf && net > 0.01) {
        gl.useProgram(NW); gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);
        const na = A(NW, "aP"), nu = A(NW, "aU"), nh = A(NW, "aPh");
        gl.enableVertexAttribArray(na); gl.vertexAttribPointer(na, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(nu); gl.vertexAttribPointer(nu, 1, gl.FLOAT, false, 20, 12);
        gl.enableVertexAttribArray(nh); gl.vertexAttribPointer(nh, 1, gl.FLOAT, false, 20, 16);
        gl.uniformMatrix4fv(U(NW, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(NW, "uShift"), shift);
        gl.uniform1f(U(NW, "uT"), still ? 0.3 : t); gl.uniform1f(U(NW, "uOn"), net);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        gl.drawArrays(gl.LINES, 0, nCount);
        gl.depthMask(true); gl.disable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disableVertexAttribArray(na); gl.disableVertexAttribArray(nu); gl.disableVertexAttribArray(nh);
      }
      if (K && kbuf && rev > 0 && rev < story.N * story.N + 9 && !still) {
        gl.useProgram(K); gl.bindBuffer(gl.ARRAY_BUFFER, kbuf);
        const ka = A(K, "aS"), kk = A(K, "aK");
        gl.enableVertexAttribArray(ka); gl.vertexAttribPointer(ka, 4, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(kk); gl.vertexAttribPointer(kk, 1, gl.FLOAT, false, 20, 16);
        gl.uniformMatrix4fv(U(K, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(K, "uShift"), shift);
        gl.uniform1f(U(K, "uRev"), stp < 0.5 ? (stp - 0.26) / 0.22 * story.N * story.N : 0);
        gl.uniform1f(U(K, "uSN"), story.N); gl.uniform1f(U(K, "uSS"), story.S); gl.uniform1f(U(K, "uPx"), H * 0.09);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        gl.drawArrays(gl.POINTS, 0, kCount);
        gl.depthMask(true); gl.disable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disableVertexAttribArray(ka); gl.disableVertexAttribArray(kk);
      }
      gl.enable(gl.DEPTH_TEST);
    }
    // THE SEARCHERS: in "Read any street", a person on every grid point, looking at a phone,
    // the customers the scan stands in for. Drawn over the city like the tiles they stand
    // on (the shop's streets are canyons the camera rarely sees into).
    if (XP && props.person && life > 0.01) {
      const NN = story.N * story.N, revN = NN, tw = 0;
      {
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        gl.useProgram(XP);
        const xa = A(XP, "aP"), xn = A(XP, "aN"), xq = A(XP, "aPart");
        gl.bindBuffer(gl.ARRAY_BUFFER, props.person.b);
        gl.enableVertexAttribArray(xa); gl.vertexAttribPointer(xa, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(xn); gl.vertexAttribPointer(xn, 3, gl.FLOAT, false, 28, 12);
        gl.enableVertexAttribArray(xq); gl.vertexAttribPointer(xq, 1, gl.FLOAT, false, 28, 24);
        gl.uniformMatrix4fv(U(XP, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(XP, "uShift"), shift);
        gl.uniform3f(U(XP, "uCam"), ex, ey, ez); gl.uniform1f(U(XP, "uOn"), life); gl.uniform1f(U(XP, "uT"), still ? 0 : t);
        const uO = U(XP, "uO"), uS = U(XP, "uS"), uA = U(XP, "uA"), uG = U(XP, "uGlow");
        const m2 = (story.N - 1) / 2;
        for (let i = 0; i < Math.min(NN, Math.ceil(revN)); i++) {
          if (i === Math.floor(NN / 2)) continue;                    // the shop's own point has the pin
          const age = revN - i, pop = Math.min(1, age / 1.5), bounce = 1 + Math.sin(Math.min(1, age / 1.5) * Math.PI) * 0.25;
          const pm = people[i % people.length];
          gl.uniform3f(uO, (i % story.N - m2) * story.S + 0.18, 0.09, (Math.floor(i / story.N) - m2) * story.S + 0.12);
          gl.uniform1f(uS, 0.42 * pop * bounce * Math.min(1, life * 1.3)); gl.uniform1f(uA, pm.face);
          gl.uniform1f(uG, Math.max(0, 1 - age / 4) + (still ? 0.3 : Math.max(0, Math.sin(t * 1.3 + pm.blink)) ** 8 * 0.6));
          gl.drawArrays(gl.TRIANGLES, 0, props.person.n);
        }
        gl.disableVertexAttribArray(xa); gl.disableVertexAttribArray(xn); gl.disableVertexAttribArray(xq);
        // Each searcher pings: a ring spreading from their feet, at their own rhythm.
        if (Rg && rbuf) {
          gl.useProgram(Rg); gl.bindBuffer(gl.ARRAY_BUFFER, rbuf);
          const ra = A(Rg, "aP"); gl.enableVertexAttribArray(ra); gl.vertexAttribPointer(ra, 2, gl.FLOAT, false, 8, 0);
          gl.uniformMatrix4fv(U(Rg, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(Rg, "uShift"), shift);
          const uC = U(Rg, "uC"), uR = U(Rg, "uRad"), uKk = U(Rg, "uK"), uOn2 = U(Rg, "uOn");
          for (let i = 0; i < NN; i++) {
            if (i === Math.floor(NN / 2)) continue;
            const ph = still ? 0.5 : ((t * 0.7 + people[i % people.length].blink) % 1);
            gl.uniform2f(uC, (i % story.N - m2) * story.S + 0.18, (Math.floor(i / story.N) - m2) * story.S + 0.12);
            gl.uniform1f(uR, 0.08 + ph * 0.42); gl.uniform1f(uKk, ph); gl.uniform1f(uOn2, life * 2.2);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
          gl.uniform2f(uC, 0, 0);
          gl.disableVertexAttribArray(ra);
        }
        // And every search goes up to the emblem.
        if (NW && qbufS) {
          gl.useProgram(NW); gl.bindBuffer(gl.ARRAY_BUFFER, qbufS);
          const na = A(NW, "aP"), nu = A(NW, "aU"), nh = A(NW, "aPh");
          gl.enableVertexAttribArray(na); gl.vertexAttribPointer(na, 3, gl.FLOAT, false, 20, 0);
          gl.enableVertexAttribArray(nu); gl.vertexAttribPointer(nu, 1, gl.FLOAT, false, 20, 12);
          gl.enableVertexAttribArray(nh); gl.vertexAttribPointer(nh, 1, gl.FLOAT, false, 20, 16);
          gl.uniformMatrix4fv(U(NW, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(NW, "uShift"), shift);
          gl.uniform1f(U(NW, "uT"), still ? 0.3 : t * 1.6); gl.uniform1f(U(NW, "uOn"), life * 0.55);
          gl.drawArrays(gl.LINES, 0, sCount);
          gl.disableVertexAttribArray(na); gl.disableVertexAttribArray(nu); gl.disableVertexAttribArray(nh);
        }
        gl.depthMask(true); gl.disable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST);
      }
    }
    // THE PIN'S FLIGHT. Fired out of the emblem at the start, it flies on an arc to the
    // centre of the grid (the shop), spinning, lands with a squash and a shockwave ring,
    // then turns slowly there, rides on top of the centre tower when the towers rise, and in
    // the finale flies back into the emblem with them.
    if (story && sw > 0.001) {
      const fl = Math.min(1, Math.max(0, (stp - 0.02) / 0.07)), fe = sm(fl);
      const towK = sm(Math.min(1, sm((stp - 0.62) / 0.08) * 1.7));
      const back2 = Math.min(1, Math.max(0, (mgs - 0.3) / 0.3)), be = sm(back2);
      const gy = 0.02 + (0.06 + story.centreTall) * towK * (1 - be);
      let px = EYE[0] + (0 - EYE[0]) * fe, py = EYE[1] + (gy - EYE[1]) * fe + Math.sin(fe * Math.PI) * 3, pz = EYE[2] + (0 - EYE[2]) * fe;
      px += (EYE[0] - px) * be; pz += (EYE[2] - pz) * be; py += (EYE[1] - py) * be + Math.sin(be * Math.PI) * 2.4;
      const land = Math.min(1, Math.max(0, (stp - 0.09) / 0.035));
      const sq = land > 0 && land < 1 ? 1 - 0.32 * Math.sin(land * Math.PI) * (1 - land) : 1;
      const size = 2.6 * (0.25 + 0.75 * fe) * (1 - be * 0.85);
      const hover = fl >= 1 && be <= 0 && !still ? 0.08 + Math.sin(t * 2.1) * 0.06 : 0;
      story.pinAt = [px, py + hover + size, pz];
      if (PN && pnbuf && fl > 0 && back2 < 1) {
        // The shop sits under the landmark tower, so the pin is drawn over the city: the
        // depth buffer is cleared first, and kept only for the pin's own faces.
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
        gl.useProgram(PN); gl.bindBuffer(gl.ARRAY_BUFFER, pnbuf);
        const pa = A(PN, "aP"), pn = A(PN, "aN"), pp = A(PN, "aPart");
        gl.enableVertexAttribArray(pa); gl.vertexAttribPointer(pa, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(pn); gl.vertexAttribPointer(pn, 3, gl.FLOAT, false, 28, 12);
        gl.enableVertexAttribArray(pp); gl.vertexAttribPointer(pp, 1, gl.FLOAT, false, 28, 24);
        gl.uniformMatrix4fv(U(PN, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(PN, "uShift"), shift);
        gl.uniform3f(U(PN, "uO"), px, py + hover, pz); gl.uniform1f(U(PN, "uS"), size); gl.uniform1f(U(PN, "uSq"), sq);
        gl.uniform1f(U(PN, "uA"), (still ? 0.6 : t * 1.1) + (1 - fe) * 9 + be * 9);
        gl.uniform3f(U(PN, "uCam"), ex, ey, ez); gl.uniform1f(U(PN, "uOn"), Math.min(1, sw * 1.5));
        gl.drawArrays(gl.TRIANGLES, 0, pnCount);
        gl.disableVertexAttribArray(pa); gl.disableVertexAttribArray(pn); gl.disableVertexAttribArray(pp);
      }
      // Rings on the ground round the shop: a shockwave as the pin lands, then a slow pulse.
      if (Rg && rbuf && fl >= 1 && be < 1) {
        const shock = Math.min(1, Math.max(0, (stp - 0.09) / 0.07)), beat = still ? 0.5 : (t * 0.55) % 1;
        gl.useProgram(Rg); gl.bindBuffer(gl.ARRAY_BUFFER, rbuf);
        const ra = A(Rg, "aP"); gl.enableVertexAttribArray(ra); gl.vertexAttribPointer(ra, 2, gl.FLOAT, false, 8, 0);
        gl.uniformMatrix4fv(U(Rg, "uVP"), false, new Float32Array(vp)); gl.uniform1f(U(Rg, "uShift"), shift);
        gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        for (const [rad, k, on] of [[0.3 + shock * 6.5, shock, shock < 1 ? 2.2 : 0], [0.25 + beat * 1.5, beat, 1.4 * (1 - towK)]]) {
          if (on <= 0) continue;
          gl.uniform1f(U(Rg, "uRad"), rad); gl.uniform1f(U(Rg, "uK"), k); gl.uniform1f(U(Rg, "uOn"), on * sw * (1 - be));
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.depthMask(true); gl.disable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disableVertexAttribArray(ra);
        gl.enable(gl.DEPTH_TEST);
      }
    }
    if (bloom) {
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloom.a.fbo); gl.viewport(0, 0, bloom.a.w, bloom.a.h);
      gl.useProgram(PB); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bloom.scene.tex); gl.uniform1i(U(PB, "uTex"), 0); quad(PB);
      gl.useProgram(PL); gl.uniform1i(U(PL, "uTex"), 0);
      for (let k = 0; k < 2; k++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloom.b.fbo); gl.bindTexture(gl.TEXTURE_2D, bloom.a.tex); gl.uniform2f(U(PL, "uDir"), (k + 1) / bloom.a.w, 0); quad(PL);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloom.a.fbo); gl.bindTexture(gl.TEXTURE_2D, bloom.b.tex); gl.uniform2f(U(PL, "uDir"), 0, (k + 1) / bloom.a.h); quad(PL);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(PC);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bloom.scene.tex); gl.uniform1i(U(PC, "uTex"), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloom.a.tex); gl.uniform1i(U(PC, "uGlow"), 1);
      gl.uniform1f(U(PC, "uAmt"), 1.35 * sw); quad(PC);
      gl.activeTexture(gl.TEXTURE0); gl.enable(gl.DEPTH_TEST);
    }
    if (story) story.place((v) => {
      const x = vp[0] * v[0] + vp[4] * v[1] + vp[8] * v[2] + vp[12], y = vp[1] * v[0] + vp[5] * v[1] + vp[9] * v[2] + vp[13], w = vp[3] * v[0] + vp[7] * v[1] + vp[11] * v[2] + vp[15];
      return [(x / w * .5 + .5) * W, (1 - (y / w + shift) * .5 - .5) * H];
    }, sw > 0.02 ? stp : -1);
    // The emblem: a DOM image placed where the point above the pin lands on screen.
    if (pin) {
      const bob = still ? 0 : Math.sin(t * 1.6) * .2, top = [0, 4.6 + bob, 0, 1], base = [0, 0, 0, 1];
      const proj = (v) => { const x = vp[0] * v[0] + vp[4] * v[1] + vp[8] * v[2] + vp[12], y = vp[1] * v[0] + vp[5] * v[1] + vp[9] * v[2] + vp[13], w = vp[3] * v[0] + vp[7] * v[1] + vp[11] * v[2] + vp[15];
        return [(x / w * .5 + .5) * W, (1 - (y / w + shift) * .5 - .5) * H, w]; };
      const [px, py, pw] = proj(top), [, gy] = proj(base);
      const size = Math.max(24, 2.4 / pw * H * 1.6);
      pin.style.transform = `translate3d(${(px - size / 2).toFixed(1)}px, ${(py - size / 2).toFixed(1)}px, 0)`;
      pin.style.width = pin.style.height = `${size.toFixed(1)}px`;
      pin.style.opacity = still ? 1 : Math.min(1, Math.max(0, (t - 1.2) / .8)).toFixed(3);
      pin.style.setProperty("--beam", `${Math.max(0, gy - py - size * .2).toFixed(1)}px`);
    }
    schedule();
  }
  function schedule() {
    if (still || raf || document.hidden) return;
    if (!canvas.isConnected) { stop(); return; }
    raf = requestAnimationFrame(draw);
  }
  const onMove = (ev) => { tmx = ev.clientX / window.innerWidth - .5; tmy = ev.clientY / window.innerHeight - .5; };
  const onVis = () => schedule();
  const ro = new ResizeObserver(resize);
  function stop() { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); }
  ro.observe(canvas);
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  canvas.addEventListener("webglcontextlost", (ev) => { ev.preventDefault(); stop(); });
  if (story) story.redraw = () => { if (still) draw(1e9); };
  requestAnimationFrame(() => { resize(); schedule(); });
  return { gl: true };
}

function wlScanStory() {
  const N = 11, S = 1.05, mid = (N - 1) / 2, FOC = 4 * N + 6;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const ours = [], rival = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const dx = c - mid, dz = r - mid, d = Math.hypot(dx, dz);
    // Strong around the shop, fading outwards, and losing the east side to the rival.
    const a = 1 + Math.pow(d, 1.35) * 1.45 + Math.max(0, dx - 1) * 2.6 + (rnd() - 0.5) * 4;
    const b = 1 + Math.hypot(dx - 3.2, dz + 0.8) * 1.5 + (rnd() - 0.5) * 3;
    ours.push(Math.max(1, Math.min(21, Math.round(a)))); rival.push(Math.max(1, Math.min(21, Math.round(b))));
  }
  ours[FOC] = 3; rival[FOC] = 1;
  const found = ours.filter(r => r <= 20);
  const kpi = { lsov: Math.round(ours.filter(r => r <= 3).length / (N * N) * 1000) / 10,
    arp: Math.round(found.reduce((s, r) => s + r, 0) / found.length * 10) / 10,
    atrp: Math.round(ours.reduce((s, r) => s + Math.min(r, 21), 0) / (N * N) * 10) / 10, found: found.length };
  const rTop3 = rival.filter(r => r <= 3).length;
  const BIZ = "Bean There, Done That", KW = "coffee near me", RIV = "Espresso Yourself";
  const chapters = [
    ["01", "One shop. One question.", `${BIZ} makes great coffee. But when someone nearby searches “${KW}”, do they find it, or the place across town?`, null],
    ["02", "Drop a grid on the map", `Eagle Eye lays ${N} × ${N} = ${N * N} search points over the streets around the shop. Any grid from 9 × 9 to 21 × 21, over the radius you choose.`, null],
    ["03", "Search from every spot", "Each point is a real Google Maps search made from that exact spot, the way a customer standing there would see it.", "count"],
    ["04", "Read any street", "Click a point to see the top 20 at that corner: who ranks, in what order, with ratings, reviews and opening hours.", null],
    ["05", "The city becomes the map", "Every point rises as tall as the shop ranks there. Tall and red: they own that street. Short and dark: customers there find someone else.", "kpi"],
    ["06", "Meet the rival", `One scan maps every competitor too. Switch to ${RIV} and their side of town lights up: they're in the top 3 at ${rTop3} of ${N * N} points.`, null],
    ["07", "Now do it every week", "Schedule it and every run is kept: the trend, a branded PDF for the client, and an alert the moment a rival moves in.", "cta"]];
  // Where each chapter starts, as story progress; the last runs to 1.
  const AT = [0, 0.12, 0.26, 0.5, 0.62, 0.76, 0.9];
  const counter = h("b", { class: "wl-xp-count" }, "0");
  // The last chapter replays twelve weekly scans as the shop climbs (rankCityGL's uImp).
  const better = ours.map(r => Math.max(1, Math.floor(r * 0.42 + 0.5)));
  const lsovEnd = Math.round(better.filter(r => r <= 3).length / (N * N) * 1000) / 10;
  const weekB = h("b", {}, "Week 1"), weekL = h("b", {}, "");
  const weekly = h("div", { class: "wl-xp-week" }, h("span", {}, h("small", {}, "Scan"), weekB),
    h("span", {}, h("small", {}, "LSOV"), weekL), h("small", { class: "wl-xp-week-n" }, "demo: twelve weekly scans of the same grid"));
  const bar = h("i", {});
  const kpis = [["LSOV", "lsov", "%", 1], ["ARP", "arp", "", 1], ["ATRP", "atrp", "", 1], ["Found", "found", `/${N * N}`, 0]]
    .map(([k, key, suf, d]) => { const b = h("b", {}, "0"); return { b, key, suf, d, el: h("span", {}, h("small", {}, k), b) }; });
  const extra = {
    count: h("div", { class: "wl-xp-meter" }, h("span", {}, counter, ` of ${N * N} points searched`),
      h("div", { class: "wl-xp-bar" }, bar), h("small", {}, "1 point = 1 search = 1 credit · the top 20 read at each")),
    kpi: h("div", { class: "wl-xp-kpis" }, kpis.map(x => x.el)),
    cta: h("div", { class: "wl-xp-cta" }, weekly, h("a", { class: "wl-btn", href: "/app/signup" }, "Start with 10 free scans"),
      h("a", { class: "wl-btn ghost", href: "#how", onclick: wlJump }, "How it works")) };
  const caps = chapters.map(([n, t, d, x], i) => h("article", { class: "wl-xp-cap", "data-i": i },
    h("span", { class: "wl-xp-n" }, h("b", {}, n), h("i", {}), `of 0${chapters.length}`),
    h("h3", {}, t.split(" ").map((w, j) => h("span", { class: "wl-xp-w", style: `--w:${j}` }, w))), h("p", {}, d), x ? extra[x] : null));
  const still = motionOff(), CORE = 0.82;
  let sp = -1;
  // The rail scrolls to the chapter's most telling moment rather than to its first frame.
  const jump = (i) => {
    const len = el.offsetHeight - window.innerHeight, at = [0.04, 0.2, 0.36, 0.55, 0.71, 0.84, 0.995][i];
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + at * CORE * len, behavior: still ? "auto" : "smooth" });
  };
  const ease = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
  const rail = h("ol", { class: "wl-xp-rail" }, chapters.map(([n, t], i) =>
    h("li", {}, h("button", { type: "button", title: t, "aria-label": `Chapter ${i + 1}: ${t}`, onclick: () => jump(i) }, h("i", {})))));
  const prog = h("i", {});
  const progress = h("div", { class: "wl-xp-prog", "aria-hidden": "true" }, prog);
  const flash = h("div", { class: "wl-xp-flash", "aria-hidden": "true" });
  // The point card, pinned to the focused point by place().
  const listing = [[RIV, "4.8 · 1,204 reviews · Open"], ["The Daily Grind House", "4.6 · 880 reviews · Open"], [BIZ, "4.9 · 512 reviews · Open"],
    ["Brew-ed Awakening", "4.4 · 301 reviews · Closed"], ["Latte Da", "4.7 · 97 reviews · Open"]];
  const card = h("div", { class: "wl-xp-card", "aria-hidden": "true" },
    h("div", { class: "wl-xp-card-h" }, h("small", {}, `Point ${FOC + 1} of ${N * N} · 0.8 mi NE`), h("b", {}, `“${KW}”`)),
    h("ol", {}, listing.map(([n, m], i) => h("li", { class: n === BIZ ? "me" : null, style: `--r:${i}` }, h("em", {}, String(i + 1)), h("span", {}, h("b", {}, n), h("small", {}, m))))),
    h("small", { class: "wl-xp-card-f" }, "…and 15 more, read at this point"));
  const meRow = card.querySelector("li.me");
  let meY = 150;
  const whoName = h("b", {}, BIZ);
  const who = h("div", { class: "wl-xp-who" }, h("small", {}, "Showing ranks for"), whoName, h("em", {}, `“${KW}” · demo data`));
  // THE BIG TYPE: one giant outlined word per chapter behind the captions, sliding and
  // growing with the chapter's own progress. Chapter 3 shows the live count, 5 the LSOV.
  const BIG = ["WHERE?", `${N * N}`, null, "#3", null, "VS", null];
  const big = h("div", { class: "wl-xp-big", "aria-hidden": "true" });
  // Rank labels that float up out of the points as they are searched.
  const tags = Array.from({ length: 10 }, () => h("span", { class: "wl-xp-tag" }));
  const tagBox = h("div", { class: "wl-xp-tags", "aria-hidden": "true" }, tags);
  // THE DATA LINK (SVG over the stage): a glowing curve from the point being read to its
  // row in the card, with data flowing along it; finer links from its neighbours feeding
  // the same row; a target ring on the point and a socket where the link plugs in.
  const NS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const links = sv("svg", { class: "wl-xp-links", "aria-hidden": "true" });
  const defs = sv("defs", {});
  const grad = sv("linearGradient", { id: "wlxpLinkG", x1: "0", y1: "0", x2: "1", y2: "0" });
  grad.append(sv("stop", { offset: "0", "stop-color": "#FFB3A8" }), sv("stop", { offset: "1", "stop-color": "#FF2A2E" }));
  const glow = sv("filter", { id: "wlxpGlow", x: "-20%", y: "-20%", width: "140%", height: "140%" });
  glow.append(sv("feGaussianBlur", { stdDeviation: "3.5", result: "b" }));
  const mrg = sv("feMerge", {}); mrg.append(sv("feMergeNode", { in: "b" }), sv("feMergeNode", { in: "SourceGraphic" })); glow.append(mrg);
  defs.append(grad, glow);
  const feeds = Array.from({ length: 6 }, () => sv("path", { class: "wl-xp-feed" }));
  const mainBase = sv("path", { class: "wl-xp-link-base" }), mainFlow = sv("path", { class: "wl-xp-link" });
  const ring = sv("circle", { class: "wl-xp-ring", r: "16" }), ring2 = sv("circle", { class: "wl-xp-ring two", r: "16" });
  const dotA = sv("circle", { class: "wl-xp-dot", r: "4.5" }), dotB = sv("circle", { class: "wl-xp-sock", r: "5" });
  links.append(defs, ...feeds, mainBase, mainFlow, ring, ring2, dotA, dotB);
  const capsBox = h("div", { class: "wl-xp-caps" }, caps);
  // THE SHOP'S PIN marks the grid's centre point, where the business is (a scan's grid is
  // laid round the business). The pin itself is 3D, drawn by rankCityGL (pin.bin); this is
  // its name tag, held above it at api.pinAt, the pin's top as rankCityGL placed it.
  // SEARCH BUBBLES: over a few of the searchers in "Read any street", what they typed.
  const BUB = [[2, 3], [3, 8], [7, 2], [8, 8], [6, 5], [1, 6]].map(([r, c]) => r * N + c);
  const bubs = BUB.map(() => h("span", { class: "wl-xp-bub" }, h("i", {}), KW));
  const bubBox = h("div", { class: "wl-xp-bubs", "aria-hidden": "true" }, bubs);
  let capR = null;
  const pinTxt = h("span", { class: "wl-xp-pin-t" }, h("b", {}, BIZ), h("small", {}, "The shop · centre of the grid"));
  const pinEl = h("div", { class: "wl-xp-pin", "aria-hidden": "true" }, pinTxt);
  const CENTRE = Math.floor(N * N / 2), centreTall = 0.12 + Math.pow((21 - ours[CENTRE]) / 20, 1.8) * 3.6;
  const vig = h("div", { class: "wl-xp-vig", "aria-hidden": "true" });
  const stage = h("div", { class: "wl-xp-stage" }, vig, big, tagBox, links,
    bubBox, pinEl, capsBox, rail, who, card, flash, h("div", { class: "wl-xp-ctl" }, progress));
  const el = h("section", { class: "wl-xp", "aria-label": "How a scan works, step by step" }, stage);
  let last = -1, lastWho = "", lastRev = -1, lastK = -1, lastWhoOn = "", lastCapOn = "";
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const api = {
    el, N, S, ours, rival, FOC, centreTall, pinAt: null,
    // The chapters take the first CORE of the section; the finale (m) takes the rest.
    p: () => (sp < 0 ? sp : Math.min(1, sp / CORE)),
    m: () => Math.min(1, Math.max(0, (sp - CORE) / (1 - CORE))),
    w: () => ease((sp + 0.16) / 0.16) * ease((1.07 - sp) / 0.07),
    // From wlParallax on scroll: the section's progress.
    setScroll(v) { sp = v; },
    // Each frame, from place(), with the film's progress. Writes only what changed.
    update(p) {
      const i = p < 0 ? 0 : p >= 1 ? chapters.length - 1 : AT.reduce((k, a, j) => (p >= a ? j : k), 0);
      if (i !== last) {
        // A cut: a flash of light between chapters.
        if (last !== -1 && !still) { flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); }
        last = i;
        caps.forEach((c, j) => c.classList.toggle("on", j === i));
        [...rail.children].forEach((li, j) => { li.classList.toggle("on", j === i); li.classList.toggle("done", j < i); });
      }
      const rev = Math.round(clamp((p - 0.26) / 0.22) * N * N);
      if (rev !== lastRev) { lastRev = rev; counter.textContent = String(rev); bar.style.transform = `scaleX(${(rev / (N * N)).toFixed(3)})`; }
      const k = Math.round(clamp((p - 0.63) / 0.08) * 100) / 100;
      if (k !== lastK) { lastK = k; for (const x of kpis) x.b.textContent = `${(kpi[x.key] * k).toFixed(x.d)}${x.suf}`; }
      const riv = clamp((p - 0.76) / 0.06) * (1 - clamp((p - 0.88) / 0.04));
      const name = riv > 0.5 ? RIV : BIZ;
      if (name !== lastWho) { lastWho = name; whoName.textContent = name; who.classList.toggle("rival", riv > 0.5); }
      const wo = (clamp((p - 0.14) / 0.06) * (1 - clamp((p - 0.97) / 0.03))).toFixed(3);
      if (wo !== lastWhoOn) { lastWhoOn = wo; who.style.opacity = wo; }
      const a = AT[i], b = i + 1 < AT.length ? AT[i + 1] : 1, lp = clamp((p - a) / (b - a));
      const imp = clamp((p - 0.91) / 0.08), wk = 1 + Math.round(imp * 11);
      const mg = Math.min(1, Math.max(0, (sp - CORE) / (1 - CORE)));
      const word = mg > 0.15 ? "EAGLE EYE" : BIG[i] !== null ? BIG[i] : i === 2 ? `${rev}/${N * N}` : i === 4 ? `${(kpi.lsov * k).toFixed(1)}%` : `WEEK ${wk}`;
      // In the finale the last caption steps aside for the merge.
      const capOn = (1 - clamp((mg - 0.05) / 0.2)).toFixed(3);
      // The shade behind the caption goes with it, so the finale has the whole screen.
      if (capOn !== lastCapOn) { lastCapOn = capOn; capsBox.style.opacity = capOn; vig.style.opacity = capOn; }
      const wl = `${(kpi.lsov + (lsovEnd - kpi.lsov) * imp).toFixed(1)}%`;
      if (weekB.textContent !== `Week ${wk}`) weekB.textContent = `Week ${wk}`;
      if (weekL.textContent !== wl) weekL.textContent = wl;
      if (big.textContent !== word) big.textContent = word;
      // The finale's word fades in and out over the merge; the last chapter's word holds
      // until the finale takes over; every other chapter's fades in and out with it.
      const fade = mg > 0.15 ? Math.min(clamp((mg - 0.15) / 0.15), clamp((1 - mg) / 0.2))
        : i === chapters.length - 1 ? Math.min(clamp(lp / 0.18), 1 - clamp(mg / 0.15))
        : Math.min(clamp(lp / 0.18), clamp((1 - lp) / 0.14));
      big.style.opacity = (p < 0 ? 0 : fade).toFixed(3);
      big.style.transform = `translate3d(${((0.5 - lp) * 8).toFixed(2)}vw, ${((1 - fade) * 6).toFixed(2)}vh, 0) scale(${(0.9 + lp * 0.16).toFixed(3)})`;
      prog.style.transform = `scaleX(${clamp(p).toFixed(4)})`;
    },
    // Each frame (rankCityGL), with its projection: world [x, y, z] to screen px.
    place(proj, p) {
      this.update(p);
      {
        // The bubbles: shown through "Read any street", each in turn popping up and away.
        const life = p < 0 ? 0 : Math.min(clamp((p - 0.5) / 0.02), clamp((0.61 - p) / 0.02));
        const now = performance.now() / 1000;
        // Measured once per showing: bubbles that would land on the caption stay hidden.
        // (On a phone there is no room beside the caption: no bubbles at all.)
        if (life > 0 && capR === null) capR = window.innerWidth > 760 ? capsBox.getBoundingClientRect().right + 24 : 1e9;
        if (life <= 0) capR = null;
        BUB.forEach((idx, k) => {
          const el = bubs[k];
          if (life <= 0) { if (el.style.opacity !== "0") el.style.opacity = "0"; return; }
          const ph = still ? 0.4 : (now * 0.35 + k / BUB.length) % 1, rise = ease(ph * 3) * 0.6 + ph * 0.4;
          const [x, y] = proj([(idx % N - mid) * S + 0.18, 0.62 + rise * 0.5, (Math.floor(idx / N) - mid) * S + 0.12]);
          el.style.opacity = (x < capR ? 0 : life * Math.min(1, ph * 6, (1 - ph) * 4)).toFixed(3);
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${(0.85 + 0.15 * ease(ph * 4)).toFixed(3)})`;
        });
      }
      {
        const mg = Math.min(1, Math.max(0, (sp - CORE) / (1 - CORE)));
        const inn = p < 0 ? 0 : clamp((p - 0.015) / 0.035), on = inn * (1 - clamp(mg / 0.25));
        if (on <= 0.001) { if (pinEl.style.opacity !== "0") pinEl.style.opacity = "0"; }
        else {
          // On top of the centre tower once the towers rise (the same height rule as the shader).
          // Above the 3D pin, wherever rankCityGL has it this frame; shown once it has landed.
          const [x, y] = proj(api.pinAt || [0, 1.6, 0]);
          pinEl.style.opacity = (on * clamp((p - 0.09) / 0.03)).toFixed(3);
          pinEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          // The label steps aside while the point card is open.
          pinTxt.style.opacity = p >= 0.5 && p < 0.62 ? "0" : "1";
        }
      }
      // The labels: the last ten points searched, each rising and fading for 3.5 points' time.
      const rev = p < 0 ? 0 : clamp((p - 0.26) / 0.22) * N * N;
      for (let k = 0; k < tags.length; k++) {
        const idx = Math.floor(rev) - 1 - k, age = rev - idx - 1, el = tags[k];
        if (idx < 0 || age > 3.5 || p > 0.5 || p < 0.26) { if (el.style.opacity !== "0") el.style.opacity = "0"; continue; }
        const r = ours[idx], [x, y] = proj([(idx % N - mid) * S, 0.4 + age * 0.55, (Math.floor(idx / N) - mid) * S]);
        const txt = r <= 20 ? `#${r}` : "20+";
        if (el.textContent !== txt) { el.textContent = txt; el.className = `wl-xp-tag ${r <= 3 ? "t1" : r <= 10 ? "t2" : r <= 20 ? "t3" : "tx"}`; }
        el.style.opacity = (1 - age / 3.5).toFixed(3);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      const on = p >= 0.5 && p < 0.62 ? Math.min(clamp((p - 0.5) / 0.02), clamp((0.62 - p) / 0.02)) : 0;
      if (on <= 0) {
        if (card.style.opacity !== "0") { card.style.opacity = "0"; links.style.opacity = "0"; card.classList.remove("on"); }
        return;
      }
      const fr = Math.floor(FOC / N), fc = FOC % N;
      const [x, y] = proj([(fc - mid) * S, 0.12, (fr - mid) * S]);
      card.style.opacity = on.toFixed(3); links.style.opacity = on.toFixed(3);
      if (!card.classList.contains("on")) { card.classList.add("on"); meY = meRow.offsetTop + meRow.offsetHeight / 2; }
      // The card stands off to the right, so the link has room to run.
      const vw = window.innerWidth, vh2 = window.innerHeight;
      // On a phone the card spans the top of the screen, under the bar, above the scene.
      const phone = vw <= 760;
      const cx = phone ? 16 : vw > 900 ? Math.max(x + 160, vw - 268 - Math.max(40, vw * 0.06)) : Math.min(vw - 236, x + 40);
      const cy = phone ? 76 : Math.min(vh2 - 340, Math.max(110, vh2 * 0.5 - 140));
      card.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      // The link: from the point, out and round into the card's row for the shop.
      const tx = cx - 2, ty = cy + meY, k = Math.max(50, (tx - x) * 0.55);
      const d = `M${x.toFixed(1)},${y.toFixed(1)} C${(x + k).toFixed(1)},${(y - 10).toFixed(1)} ${(tx - k).toFixed(1)},${ty.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
      mainBase.setAttribute("d", d); mainFlow.setAttribute("d", d);
      for (const c of [ring, ring2, dotA]) { c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); }
      dotB.setAttribute("cx", tx.toFixed(1)); dotB.setAttribute("cy", ty.toFixed(1));
      // Feeds: six neighbours around the point, each sending its own reading into the link.
      const NB = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]];
      NB.forEach(([dr, dc], j) => {
        const r = fr + dr, c = fc + dc, f = feeds[j];
        if (r < 0 || c < 0 || r >= N || c >= N) { f.setAttribute("d", ""); return; }
        const [nx, ny] = proj([(c - mid) * S, 0.12, (r - mid) * S]);
        f.setAttribute("d", `M${nx.toFixed(1)},${ny.toFixed(1)} Q${((nx + x) / 2).toFixed(1)},${(Math.min(ny, y) - 40).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`);
      });
    },
  };
  return api;
}

function wlParallax(page, hero, shade, story = null) {
  const tilts = [...page.querySelectorAll(".wl-tilt")];
  const final = page.querySelector(".wl-final");
  let raf = 0;
  const frame = () => {
    raf = 0;
    if (!page.isConnected) { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); return; }
    const vh = window.innerHeight, y = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - vh);
    const hp = Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight)));
    const pp = Math.min(1, Math.max(0, y / max));
    // ALL READS FIRST, THEN ALL WRITES. Reading a box after a style write forces the browser
    // to redo style and layout on the spot; interleaved, this ran it once per tilt card per
    // frame. And the page-wide progress is kept in a JS property, not a CSS variable on the
    // page root: --pp was read only by the city (camOf), yet setting it on .wl invalidated
    // the style of every element of the page on every scroll frame.
    const fr = final ? final.getBoundingClientRect() : null;
    const tops = tilts.map(el => el.getBoundingClientRect().top);
    const xr = story ? story.el.getBoundingClientRect() : null;
    // The scan story's progress: 0 when its stage pins to the top, 1 when it lets go.
    const stp = xr ? -xr.top / Math.max(1, xr.height - vh) : -1;
    const out = fr ? Math.min(1, Math.max(0, (vh - fr.top) / (vh * 0.8))) : 0;
    // Inside the story the city is the show, so the shade lifts off it.
    const inStory = xr ? Math.min(1, Math.max(0, Math.min((stp + 0.12) / 0.12, (1.06 - stp) / 0.06))) : 0;
    page._pp = pp;
    hero.style.setProperty("--hp", hp.toFixed(4));
    shade.style.setProperty("--dim", (Math.min(1, hp * 1.4) * (1 - out * .75) * (1 - inStory * 0.9)).toFixed(4));
    if (story) { story.setScroll(stp); if (story.redraw) story.redraw(); }
    tilts.forEach((el, i) => el.style.setProperty("--q", Math.min(1, Math.max(0, (vh - tops[i]) / (vh * 0.75))).toFixed(4)));
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  frame();
}

function wlJump(ev) {
  ev.preventDefault();
  const el = document.getElementById(ev.currentTarget.getAttribute("href").slice(1));
  if (el) el.scrollIntoView({ behavior: motionOff() ? "auto" : "smooth", block: "start" });
}

// ---- mount (mirrors dashboard.js welcomeView bg wiring, :2789-2806) ----
function mountWlBg() {
  var page = document.querySelector('.wl'); if (!page || page._wlbg) return; page._wlbg = 1;
  var reduce = (typeof motionOff === 'function') && motionOff();
  var fieldCanvas = h('canvas', { class: 'wl-city', 'aria-hidden': 'true' });
  var shade = h('div', { class: 'wl-shade', 'aria-hidden': 'true' });
  var hero = page.querySelector('.wl-hero') || page.querySelector('section.fx');
  page.insertBefore(shade, page.firstChild);
  page.insertBefore(fieldCanvas, page.firstChild);
  // THE HOME PAGE (data-xp) gets the welcome page's whole experience, wired exactly as
  // welcomeView does it: the scan story (wlScanStory, the seven pinned "NN OF 07" chapters)
  // placed straight after the hero, the city camera driven by page scroll (camOf = page._pp),
  // and wlParallax driving the hero fade, the shade and the story's progress.
  // THE INNER PAGES have no story: the city holds the hero camera (cam() == 0) so it stays
  // the calm hero shot at any scroll, and wlParallax only fades the hero and dims the shade.
  var xp = page.hasAttribute('data-xp') && hero;
  var story = xp ? wlScanStory() : null;
  if (story) hero.parentNode.insertBefore(story.el, hero.nextSibling);
  // The city camera follows the page's scroll on every page (wlParallax keeps page._pp), so the
  // skyline drifts and turns behind each page's own story; the home page also plays its scan story.
  var camOf = function () { return page._pp || 0; };
  requestAnimationFrame(function () {
    if (!page.isConnected) return;
    // The GPU city when the browser has WebGL; the 2D canvas city otherwise, and the story's
    // captions still read in order as the page scrolls (welcomeView).
    if (!rankCityGL(fieldCanvas, camOf, null, story)) { rankCity(fieldCanvas, camOf); if (story) story.el.classList.add('flat'); }
    if (hero) wlParallax(page, hero, shade, story);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWlBg);
else mountWlBg();
})();
