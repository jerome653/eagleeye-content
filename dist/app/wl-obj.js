/* wl-obj.js — the hero object on every content page: one Blender-built model (src/app/obj/*.eeq,
   made by tools/blender/make_objects.py) assembling stage by stage, lit, turning with the
   pointer and the scroll, with rings of light pulsing under it, a beam and rising sparks.

   The drawing is the Eagle Eye app's own featureObject (dashboard.js): the same shaders, the
   same four finishes (red metal, white enamel, graphite, glowing red), the same build-up
   effects and light. What this copy changes, for a marketing page that must stay light:
     - COMPACT MODELS: EEQ1 (10 bytes a vertex, int16 positions, int8 normals) expanded here to
       the app's EEM2 layout, about a third of the download; EEM2 still loads.
     - IT ONLY DRAWS WHEN IT CAN BE SEEN: the frame loop stops when the canvas is off screen
       or the tab is hidden, and starts again when it comes back (the app's loop never stops).
     - IT ONLY LOADS WHEN NEEDED: the model is fetched as the canvas nears the screen.
     - A CAPPED PIXEL RATIO (1.75) and no antialias pass on small or low-power screens.
     - Reduced motion: drawn once, whole, and left still.
   Usage: <canvas class="ft-gl" data-obj="storefront"> inside an .ft-stage; this script finds it. */
(function () {
  'use strict';
  var ABASE = (function () {
    try { var ss = document.getElementsByTagName('script');
      for (var i = ss.length - 1; i >= 0; i--) if (/wl-obj\.js(\?|$)/.test(ss[i].src)) return new URL('.', ss[i].src).href;
    } catch (e) {}
    return '/app/';
  })();
  var reduce = document.documentElement.classList.contains('no-motion') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // EEQ1 -> the EEM2 vertex layout (x, y, z, nx, ny, nz, part as float32).
  function decode(ab) {
    var tag = String.fromCharCode.apply(null, new Uint8Array(ab, 0, 4)), dv = new DataView(ab), n = dv.getUint32(4, true);
    if (tag === 'EEM2') return { count: n, data: new Float32Array(ab, 8, n * 7) };
    if (tag !== 'EEQ1' && tag !== 'EEQ2') throw new Error('not a model file');
    var step = tag === 'EEQ2' ? 12 : 10;   // EEQ2 adds the piece number (used by world.js)
    var out = new Float32Array(n * 7), o = 8, k = 0, S = 0.5 / 32767;
    for (var i = 0; i < n; i++, o += step) {
      out[k++] = dv.getInt16(o, true) * S; out[k++] = dv.getInt16(o + 2, true) * S; out[k++] = dv.getInt16(o + 4, true) * S;
      var nx = dv.getInt8(o + 6) / 127, ny = dv.getInt8(o + 7) / 127, nz = dv.getInt8(o + 8) / 127, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      out[k++] = nx / l; out[k++] = ny / l; out[k++] = nz / l; out[k++] = dv.getUint8(o + 9);
    }
    return { count: n, data: out };
  }

  // ext: an optional drive(s) -> { show, fx, dim, hi, burst, turn, tilt, zoom } (the scroll story).
  function heroObject(canvas, url, ext) {
    var small = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
    var gl = canvas.getContext('webgl', { antialias: !small, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) return false;
    // --- the app's shaders (featureObject), unchanged ---
    var VS = 'attribute vec3 aP; attribute vec3 aN; attribute float aPart;\n'
      + 'uniform vec4 uShow; uniform vec4 uFx; uniform vec4 uDim; uniform float uHi; uniform highp float uTime;\n'
      + 'uniform float uA; uniform float uTilt; uniform float uAspect; uniform float uK;\n'
      + 'varying vec3 vN; varying vec3 vW; varying float vFin; varying float vHi; varying float vDim;\n'
      + 'vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }\n'
      + 'vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }\n'
      + 'float pick(vec4 v, float i) { return i < 0.5 ? v.x : i < 1.5 ? v.y : i < 2.5 ? v.z : v.w; }\n'
      + 'void main() {\n'
      + '  float st = floor(aPart / 4.0 + 0.01); vFin = aPart - st * 4.0;\n'
      + '  float show = pick(uShow, st), fx = pick(uFx, st); vDim = pick(uDim, st);\n'
      + '  if (fx > 5.5) show = clamp(show * 1.9 - length(aP.xz) * 1.2, 0.0, 1.0);\n'
      + '  if (show < 0.002) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }\n'
      + '  float u = show - 1.0, k = 1.0 + 2.70158 * u * u * u + 1.70158 * u * u;\n'
      + '  vec3 q = aP, nq = aN;\n'
      + '  if (fx < 0.5) q.y += (1.0 - k) * 0.8;\n'
      + '  else if (fx < 1.5) q.y -= (1.0 - k) * 0.8;\n'
      + '  else if (fx < 2.5 || fx > 5.5) q *= k;\n'
      + '  else if (fx < 3.5) { q = rotY(q * k, (1.0 - k) * 3.5); nq = rotY(nq, (1.0 - k) * 3.5); }\n'
      + '  else q.x -= (1.0 - k) * 1.3;\n'
      + '  vHi = abs(st - uHi) < 0.5 ? 1.0 : 0.0;\n'
      + '  q.y += vHi * 0.012 * sin(uTime * 2.4) + 0.025 * sin(uTime * 1.3);\n'
      + '  vec3 p = rotY(rotX(q, uTilt), uA); vW = p; vN = rotY(rotX(nq, uTilt), uA);\n'
      + '  float z = p.z - 2.9;\n'
      + '  gl_Position = vec4(p.x * uK / uAspect, p.y * uK, -z * 1.02 - 0.2, -z); }';
    var FS = 'precision mediump float; uniform highp float uTime; varying vec3 vN; varying vec3 vW; varying float vFin; varying float vHi; varying float vDim;\n'
      + 'void main() { vec3 n = normalize(vN), v = normalize(vec3(0.0, 0.0, 2.9) - vW); if (dot(n, v) < 0.0) n = -n;\n'
      + '  vec3 sun = normalize(vec3(-0.55, 0.62, 0.55));\n'
      + '  bool gr = vFin > 1.5 && vFin < 2.5;\n'
      + '  vec3 base = vFin < 0.5 ? vec3(0.78, 0.05, 0.06) : vFin < 1.5 ? vec3(0.9, 0.88, 0.88) : gr ? vec3(0.09, 0.075, 0.08) : vec3(1.0, 0.16, 0.12);\n'
      + '  float diff = max(dot(n, sun), 0.0), spec = pow(max(dot(reflect(-sun, n), v), 0.0), gr ? 16.0 : 28.0), rim = pow(1.0 - abs(dot(n, v)), 2.5);\n'
      + '  vec3 col = base * (0.28 + 0.9 * diff) + vec3(1.0, 0.7, 0.62) * spec * (gr ? 0.35 : 0.9) + vec3(1.0, 0.25, 0.2) * rim * 0.6 + base * 0.18;\n'
      + '  if (vFin > 2.5) col += vec3(1.0, 0.2, 0.15) * 0.35;\n'
      + '  col += vec3(1.0, 0.22, 0.16) * vHi * (0.12 + 0.1 * sin(uTime * 4.0)) + vec3(1.0, 0.35, 0.3) * vHi * rim * 0.5;\n'
      + '  col *= 1.0 - vDim * 0.62;\n'
      + '  gl_FragColor = vec4(col, 1.0); }';
    var VIEW = 'vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }\n'
      + 'vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }\n'
      + 'uniform float uA; uniform float uTilt; uniform float uAspect; uniform float uK;\n'
      + 'vec4 proj(vec3 q) { vec3 p = rotY(rotX(q, uTilt), uA); float z = p.z - 2.9; return vec4(p.x * uK / uAspect, p.y * uK, -z * 1.02 - 0.2, -z); }\n';
    var RVS = 'attribute vec2 aQ; uniform float uR; varying vec2 vQ; ' + VIEW + 'void main() { vQ = aQ; gl_Position = proj(vec3(aQ.x * uR, -0.56, aQ.y * uR)); }';
    var RFS = 'precision mediump float; uniform float uF; varying vec2 vQ;\n'
      + 'void main() { float d = length(vQ); float ring = smoothstep(0.9, 0.975, d) * (1.0 - smoothstep(0.975, 1.0, d));\n'
      + '  float fill = (1.0 - smoothstep(0.0, 1.0, d)) * 0.05;\n'
      + '  gl_FragColor = vec4(vec3(1.0, 0.2, 0.15) * (ring * 0.9 + fill) * uF, 0.0); }';
    var BVS = 'attribute vec2 aQ; uniform float uAspect; uniform float uK; varying vec2 vQ;\n'
      + 'void main() { vQ = aQ; float w = mix(0.16, 0.5, aQ.y); float y = mix(-0.5, -2.2, aQ.y);\n'
      + '  gl_Position = vec4(aQ.x * w * uK / uAspect / 2.9, y * uK / 2.9, 0.999, 1.0); }';
    var BFS = 'precision mediump float; uniform float uF; varying vec2 vQ;\n'
      + 'void main() { float a = pow(1.0 - abs(vQ.x), 2.2) * pow(1.0 - vQ.y, 1.6); gl_FragColor = vec4(vec3(1.0, 0.25, 0.18) * a * 0.32 * uF, 0.0); }';
    var SVS = 'attribute vec3 aS; uniform highp float uTime; uniform float uDpr; varying float vA; ' + VIEW
      + 'void main() { float f = fract(uTime * (0.05 + aS.z * 0.06) + aS.z * 7.0);\n'
      + '  vec3 q = vec3(cos(aS.x) * aS.y, -0.6 + f * 1.5, sin(aS.x) * aS.y);\n'
      + '  vA = sin(f * 3.14159) * (0.4 + aS.z * 0.6);\n'
      + '  gl_Position = proj(q); gl_PointSize = uDpr * (1.5 + aS.z * 2.8); }';
    var SFS = 'precision mediump float; varying float vA;\n'
      + 'void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.2, 1.0, d)) * vA;\n'
      + '  gl_FragColor = vec4(vec3(1.0, 0.45, 0.35) * a, 0.0); }';
    var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    var mk = function (vs, fs) { var q = gl.createProgram(); gl.attachShader(q, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(q, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(q);
      if (!gl.getProgramParameter(q, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(q)); return q; };
    var P, FXR = null, FXB = null, FXS = null;
    try { P = mk(VS, FS); } catch (e) { console.warn('wl-obj:', e); return false; }
    try { FXR = mk(RVS, RFS); FXB = mk(BVS, BFS); FXS = mk(SVS, SFS); } catch (e) { FXR = FXB = FXS = null; }
    var U = {}; ['uShow', 'uFx', 'uDim', 'uHi', 'uTime', 'uA', 'uTilt', 'uAspect', 'uK'].forEach(function (n) { U[n] = gl.getUniformLocation(P, n); });
    // Uniform locations of the light programs, looked up once (the app's copy looked them up every frame).
    var loc = function (q, names) { var o = {}; names.forEach(function (n) { o[n] = gl.getUniformLocation(q, n); }); return o; };
    var VU = ['uA', 'uTilt', 'uAspect', 'uK'];
    var LB = FXB && loc(FXB, VU.concat(['uF'])), LR = FXR && loc(FXR, VU.concat(['uR', 'uF'])), LS = FXS && loc(FXS, VU.concat(['uTime', 'uDpr']));
    var quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    var beamQ = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, beamQ); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, 1, 0, 1, 1, -1, 0, 1, 1, -1, 1]), gl.STATIC_DRAW);
    var NSP = small ? 50 : 90, spk = [], sd = 17;
    var sr = function () { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (var i = 0; i < NSP; i++) spk.push(sr() * Math.PI * 2, 0.35 + sr() * 0.75, sr());
    var sbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spk), gl.STATIC_DRAW);
    var dpr = Math.min(1.75, window.devicePixelRatio || 1);
    var view = function (L, d, aspect, K) { gl.uniform1f(L.uA, d.turn); gl.uniform1f(L.uTilt, d.tilt); gl.uniform1f(L.uAspect, aspect); gl.uniform1f(L.uK, K); };
    var light = function (d, s, aspect, K) {
      if (!FXR) return;
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      gl.disable(gl.DEPTH_TEST); gl.useProgram(FXB); view(LB, d, aspect, K);
      gl.bindBuffer(gl.ARRAY_BUFFER, beamQ); var bq = gl.getAttribLocation(FXB, 'aQ'); gl.enableVertexAttribArray(bq); gl.vertexAttribPointer(bq, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(LB.uF, 0.8 + 0.2 * Math.sin(s * 2.1)); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.disableVertexAttribArray(bq);
      gl.enable(gl.DEPTH_TEST); gl.useProgram(FXR); view(LR, d, aspect, K);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad); var rq = gl.getAttribLocation(FXR, 'aQ'); gl.enableVertexAttribArray(rq); gl.vertexAttribPointer(rq, 2, gl.FLOAT, false, 0, 0);
      [0, 0.5].forEach(function (ph) { var k = (s / 3.2 + ph) % 1; gl.uniform1f(LR.uR, 0.35 + k * 1.1); gl.uniform1f(LR.uF, (1 - k) * 0.55); gl.drawArrays(gl.TRIANGLES, 0, 6); });
      var bk = d.burst ? (s - d.burst) / 1.1 : 2;
      if (bk >= 0 && bk < 1) { gl.uniform1f(LR.uR, 0.3 + Math.pow(bk, 0.7) * 2.2); gl.uniform1f(LR.uF, Math.pow(1 - bk, 1.2) * 1.6); gl.drawArrays(gl.TRIANGLES, 0, 6); }
      gl.disableVertexAttribArray(rq);
      gl.useProgram(FXS); view(LS, d, aspect, K);
      gl.uniform1f(LS.uTime, s); gl.uniform1f(LS.uDpr, dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, sbuf); var sa = gl.getAttribLocation(FXS, 'aS'); gl.enableVertexAttribArray(sa); gl.vertexAttribPointer(sa, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, NSP); gl.disableVertexAttribArray(sa);
      gl.disable(gl.BLEND); gl.depthMask(true);
    };
    var aP = gl.getAttribLocation(P, 'aP'), aN = gl.getAttribLocation(P, 'aN'), aPart = gl.getAttribLocation(P, 'aPart');
    var buf = null, count = 0, t0 = 0, raf = 0, px = 0, py = 0, ex = 0, ey = 0, visible = false, loading = false;
    // THE HERO DRIVE: the four stages land one after another, each its own way (dropped in,
    // scaled up, spun in, swept up from the floor), the last with a burst of light; then the
    // object sways, leans to the pointer, and turns a quarter more as the page scrolls past it.
    var FX = [0, 2, 3, 6], landed = 0;
    var scrollTurn = 0;
    var drive = function (s) {
      var t = reduce ? 99 : s - t0;
      var show = [0, 1, 2, 3].map(function (i) { return Math.max(0, Math.min(1, (t - 0.15 - i * 0.42) / 0.9)); });
      if (!landed && show[3] >= 1) landed = s;
      var hi = t > 2.6 ? Math.floor((t - 2.6) / 2.4) % 4 : -1;
      return { show: show, fx: FX, dim: [0, 0, 0, 0], hi: reduce ? -1 : hi, burst: landed ? landed - 0.15 : 0,
        turn: reduce ? -0.5 : -0.5 + Math.sin(s * 0.33) * 0.32 + scrollTurn * 1.4, tilt: 0.38 - scrollTurn * 0.25, zoom: 1.4 };
    };
    var size = function () {
      var w = canvas.clientWidth, hgt = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr); }
      gl.viewport(0, 0, canvas.width, canvas.height);
      return w / Math.max(1, hgt);
    };
    var draw = function (now) {
      raf = 0;
      if (!canvas.isConnected) return;
      var aspect = size();
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (buf) {
        var s = now / 1000;
        if (!t0) t0 = s;
        ex += (px - ex) * 0.06; ey += (py - ey) * 0.06;
        var d = (ext || drive)(s), K = 2.45 * d.zoom * Math.min(1, aspect);
        var dd = { turn: d.turn + (reduce ? 0 : ex * 0.5), tilt: d.tilt + (reduce ? 0 : ey * 0.2), burst: d.burst };
        gl.useProgram(P); gl.enable(gl.DEPTH_TEST);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 28, 12);
        gl.enableVertexAttribArray(aPart); gl.vertexAttribPointer(aPart, 1, gl.FLOAT, false, 28, 24);
        gl.uniform4fv(U.uShow, d.show); gl.uniform4fv(U.uFx, d.fx); gl.uniform4fv(U.uDim, d.dim); gl.uniform1f(U.uHi, d.hi);
        gl.uniform1f(U.uTime, s); gl.uniform1f(U.uA, dd.turn); gl.uniform1f(U.uTilt, dd.tilt);
        gl.uniform1f(U.uAspect, aspect); gl.uniform1f(U.uK, K);
        gl.drawArrays(gl.TRIANGLES, 0, count);
        gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aN); gl.disableVertexAttribArray(aPart);
        if (!reduce) light(dd, s, aspect, K);
      }
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(draw); };
    var load = function () {
      if (loading) return; loading = true;
      fetch(url).then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(r.status); }).then(function (ab) {
        var m = decode(ab); count = m.count;
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, m.data, gl.STATIC_DRAW);
        canvas.classList.add('ready'); if (canvas.parentNode) canvas.parentNode.classList.add('lit');
        kick();
      }).catch(function (e) { console.warn('wl-obj: ' + url, e); });
    };
    // Load as it nears the screen; draw only while it is on screen and the tab is showing.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) load(); }, { rootMargin: '300px' }).observe(canvas);
      new IntersectionObserver(function (es) { visible = es.some(function (x) { return x.isIntersecting; }); if (visible) kick(); }, { threshold: 0 }).observe(canvas);
    } else { visible = true; load(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) kick(); });
    window.addEventListener('resize', kick, { passive: true });
    if (!reduce) {
      window.addEventListener('pointermove', function (e) { px = e.clientX / window.innerWidth * 2 - 1; py = e.clientY / window.innerHeight * 2 - 1; }, { passive: true });
      var hero = canvas.closest('.wl-hero') || canvas.parentNode;
      var onScroll = function () { scrollTurn = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight))); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
    // A lost GPU context (a busy phone) is put back once it is restored.
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); visible = false; }, false);
    return true;
  }

  // THE EXPERIENCE (the app's featureStory): a section five screens tall whose stage sticks
  // while you scroll through it. The scroll is the timeline: the first screen is the page's
  // title over the first piece of its object; then four chapters, each bringing in the next
  // stage of the object (lit while it is the subject), with its caption arriving word by
  // word, its giant word behind, a flash as it lands, and the camera easing round to a new
  // side. With motion off there is no timeline: the object stands whole above the four
  // chapters, listed (the CSS for .fx.still does that).
  function story(el) {
    var canvas = el.querySelector('canvas[data-obj]'), url = ABASE + 'obj/' + canvas.getAttribute('data-obj') + '.eeq';
    var caps = [].slice.call(el.querySelectorAll('.wl-xp-cap')), C = caps.length;
    var rail = el.querySelector('.fx-rail'), prog = el.querySelector('.fx-prog i'), flash = el.querySelector('.fx-flash');
    var intro = el.querySelector('.fx-intro'), big = el.querySelector('.fx-big');
    var bigs = caps.map(function (c) { return c.getAttribute('data-big') || ''; });
    var still = reduce;
    var ease = function (v) { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
    // THE SHOTS: where the camera stands in each part, [turn, tilt, zoom]. The opening is a slow
    // dolly in from low and wide; each chapter swings to a new side; the last pulls back and cranes
    // up over the whole object for the final frame. (The app's CAM, opened up for a cinema cut.)
    var CAM = [[-1.1, 0.3, 0.92], [-0.6, 0.42, 1.0], [0.25, 0.3, 1.16], [0.75, 0.52, 1.06], [-0.2, 0.36, 1.12], [-0.55, 0.78, 0.9]];
    var lb = el.querySelector('.fx-lb'), endCard = el.querySelector('.fx-end'), skip = el.querySelector('.fx-skip'), stage = el.querySelector('.fx-stage');
    var sceneNo = el.querySelector('.fx-scene b');
    // Skip the trailer: straight to the page after the story.
    if (skip) skip.addEventListener('click', function () {
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().bottom - 60, behavior: still ? 'auto' : 'smooth' });
    });
    if (endCard) { var down = endCard.querySelector('button'); if (down) down.addEventListener('click', function () { skip.click(); }); }
    // Each stage arrives its own way: swept up radially, scaled up, spun in, dropped in.
    var FX = (el.getAttribute('data-fx') || '6,2,3,0').split(',').map(Number);
    var f0 = -1, chap = -2, burst = 0, sp = -1, lastS = 0;
    var at = function () {
      var r = el.getBoundingClientRect(), len = el.offsetHeight - window.innerHeight;
      return Math.max(0, Math.min(1, -r.top / Math.max(1, len))) * (C + 1);
    };
    // The rail jumps to a chapter.
    if (rail) [].forEach.call(rail.querySelectorAll('button'), function (b, i) {
      b.addEventListener('click', function () {
        var len = el.offsetHeight - window.innerHeight;
        window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + ((i + 1.55) / (C + 1)) * len, behavior: still ? 'auto' : 'smooth' });
      });
    });
    var drive = function (s) {
      // The scroll, smoothed (about 0.15 s), snapping only on a jump of more than a chapter.
      var target = still ? C + 1 : at(), dt = Math.min(0.1, Math.max(0, s - lastS)); lastS = s;
      sp = sp < 0 || Math.abs(target - sp) > 1.2 ? target : sp + (target - sp) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - sp) < 0.0005) sp = target;
      var p = sp, show = [0, 0, 0, 0];
      for (var i = 0; i < 4; i++) show[i] = i === 0 ? 1 : ease((p - i - 0.85) * 1.8);
      var ci = Math.min(C - 1, Math.max(0, Math.floor(p) - 1));
      // the camera: the shot for this stretch of scroll, eased into the next; the finale
      // (the last half of the last chapter) is the crane up
      var q = p >= C + 0.5 ? CAM.length - 2 + ease((p - C - 0.5) * 2) : Math.min(p, CAM.length - 2);
      var a = Math.min(CAM.length - 1, Math.floor(q)), b = Math.min(CAM.length - 1, a + 1), w = ease(q - a);
      var cam = CAM[a].map(function (x, k) { return x + (CAM[b][k] - x) * w; });
      // a punch-in on every landing: the lens pushes 7% closer and settles back over 0.7 s
      var pk = burst && s - burst < 0.7 ? Math.pow(1 - (s - burst) / 0.7, 2) : 0;
      cam[2] *= 1 + 0.07 * pk;
      if (!still && p !== f0) {
        f0 = p;
        if (prog) { prog.style.transform = 'scaleX(' + (p / (C + 1)).toFixed(4) + ')'; prog.parentNode.style.opacity = (1 - ease((p - C - 0.3) * 3)).toFixed(3); }
        // letterbox: the bars close in as the story starts and open again for the end card
        var bars = ease(p * 2.2) * (1 - ease((p - C - 0.55) * 2.5));
        if (stage) { stage.style.setProperty('--lb', bars.toFixed(3)); stage.style.setProperty('--fade', ease((p - C - 0.2) * 2.5).toFixed(3)); }
        if (endCard) { var e = ease((p - C - 0.55) * 2.4); endCard.style.opacity = e.toFixed(3); endCard.style.transform = 'translate3d(0,' + (24 * (1 - e)).toFixed(1) + 'px,0)'; endCard.style.pointerEvents = e > 0.5 ? 'auto' : 'none'; }
        if (skip) skip.classList.toggle('on', p > 0.15 && p < C + 0.4);
        intro.style.opacity = String(1 - ease(p * 1.6));
        intro.style.transform = 'translate3d(0, ' + (-60 * ease(p * 1.4)).toFixed(1) + 'px, 0)';
        intro.style.pointerEvents = p > 0.5 ? 'none' : '';
        // the last caption bows out for the end card (the finale belongs to the object)
        var now = p < 0.72 ? -1 : p > C + 0.5 ? -3 : ci;
        if (now !== chap) {
          if ((now > chap || now === -3) && chap > -2 && now !== -1) { burst = s; flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); }
          chap = now;
          caps.forEach(function (c, i) { c.classList.toggle('on', i === now); });
          if (rail) [].forEach.call(rail.children, function (li, i) { li.classList.toggle('on', i === now); li.classList.toggle('done', i < now || now === -3); });
          big.textContent = now < 0 ? '' : bigs[now];
          if (sceneNo) sceneNo.textContent = now === -1 ? '00' : now === -3 ? ('0' + C) : ('0' + (now + 1));
        }
        var local = p - Math.floor(p);
        big.style.opacity = chap < 0 ? '0' : String(Math.min(1, local * 4, (1 - local) * 5 + 0.25));
        big.style.transform = 'translate3d(' + (-40 * local).toFixed(1) + 'px, 0, 0) scale(' + (0.94 + local * 0.1).toFixed(3) + ')';
      }
      return { p: p, burst: burst, show: show, fx: FX, dim: [0, 0, 0, 0], hi: still || p < 0.72 || p > C + 0.6 ? -1 : Math.min(3, ci),
        turn: cam[0] + (still ? 0 : Math.sin(s * 0.3) * 0.12), tilt: cam[1], zoom: cam[2] * 1.14 };
    };
    if (still) { el.classList.add('still'); caps.forEach(function (c) { c.classList.add('on'); }); }
    var fallback = function () {
      canvas.classList.remove('fx-world');
      if (!heroObject(canvas, url, drive)) { el.classList.add('flat'); caps.forEach(function (c) { c.classList.add('on'); }); }
    };
    // THE CINEMA CUT (world.js, three.js with bloom) where the browser has WebGL 2 and modules;
    // the light renderer above otherwise, or if the world cannot load. Motion off: the light one.
    // (a feature check, not a test context: every getContext holds a GPU context the browser
    // counts against its limit, so probing with a throwaway canvas used one up on every page)
    var gl2 = typeof WebGL2RenderingContext !== 'undefined';
    if (!still && gl2 && HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) {
      canvas.classList.add('fx-world');
      // The 3D library is large: it is fetched only once the page itself has loaded and the browser
      // is idle, so the title and the copy paint first (what search engines time) and the story
      // starts a moment later.
      var whenIdle = function (fn) { var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(fn, { timeout: 1500 }); };
        if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true }); };
      new Promise(function (res) { whenIdle(res); }).then(function () { return import(ABASE + 'world.js?v=' + (el.getAttribute('data-v') || '')); }).then(function (m) {
        return m.start({ canvas: canvas, stage: el.querySelector('.fx-stage'), url: url, frame: drive, reduce: still, C: C,
          seed: +(el.getAttribute('data-seed') || 0), city: document.querySelector('canvas.wl-city') });
      }).catch(function (e) { console.warn('wl-obj: world', e); fallback(); });
    } else fallback();
  }

  function mount() {
    [].forEach.call(document.querySelectorAll('section.fx[data-fx]'), function (el) { if (!el._wlobj) { el._wlobj = 1; story(el); } });
    [].forEach.call(document.querySelectorAll('canvas[data-obj]'), function (c) {
      if (c._wlobj || c.closest('section.fx')) return; c._wlobj = 1;
      var url = ABASE + 'obj/' + c.getAttribute('data-obj') + '.eeq';
      if (!heroObject(c, url)) c.parentNode.classList.add('flat');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
