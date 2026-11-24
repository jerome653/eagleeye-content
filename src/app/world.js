// world.js — THE CINEMA CUT of a content page's story: the page's own Blender model as a three.js
// world, built piece by piece as the page scrolls.
//
// The stage is the Eagle Eye app's feature-page world (eagleeyes/ui/app/worlds/kit.js): the same
// renderer (ACES tone mapping, bloom), the same night-map floor with its rolling rings of light and
// radar sweep, the same finishes (red metal, white enamel, graphite, glow), the same drifting embers
// and the same camera that holds on each chapter's moment and then travels to the next stop. What
// is new is the choreography, written for any model: every PIECE of the model (EEQ2 keeps them
// apart) makes its own entrance in its chapter —
//   DROP     out of the sky, a shockwave ring where it lands, the camera jolted
//   RISE     up through the street, trailing sparks
//   EXPLODE  in from far out, tumbling, and snapping together
//   POP      scaled up out of nothing with a spin
// — the chapter that is the subject glows, the reveal gets a close-up, the bloom swells as each
// chapter lands, and the last shot cranes up and circles the finished thing.
// Everything moved is a function of the page's smoothed scroll p (0-1 the title, then one per
// chapter), so scrolling back plays it backwards.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
const backOut = (v) => { v = clamp(v); const c = 1.70158, u = v - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const span = (p, a, b) => clamp((p - a) / (b - a));
const hash = (i, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const M = 3.4;   // the model's largest side, in metres

// EEQ2 -> one geometry per piece, each centred on its own middle (so it can turn in place),
// standing on the floor (y = 0).
function pieces(ab) {
  const dv = new DataView(ab), tag = String.fromCharCode(...new Uint8Array(ab, 0, 4)), n = dv.getUint32(4, true);
  if (tag !== 'EEQ2') throw new Error('world.js needs an EEQ2 model');
  const S = 0.5 / 32767 * M, by = new Map();
  let minY = Infinity;
  for (let i = 0, o = 8; i < n; i++, o += 12) minY = Math.min(minY, dv.getInt16(o + 2, true) * S);
  for (let i = 0, o = 8; i < n; i++, o += 12) {
    const id = dv.getUint16(o + 10, true);
    let p = by.get(id); if (!p) { p = { part: dv.getUint8(o + 9), pos: [], nor: [] }; by.set(id, p); }
    p.pos.push(dv.getInt16(o, true) * S, dv.getInt16(o + 2, true) * S - minY, dv.getInt16(o + 4, true) * S);
    const nx = dv.getInt8(o + 6), ny = dv.getInt8(o + 7), nz = dv.getInt8(o + 8), l = Math.hypot(nx, ny, nz) || 1;
    p.nor.push(nx / l, ny / l, nz / l);
  }
  // NO Z-FIGHTING: where two pieces share a face (a band laid on a body, a sign on a wall) the GPU
  // cannot tell which is in front and the face flickers in stripes. Every piece is pushed out along
  // its own normals by a hair — a little more for later stages and alternating pieces — so any two
  // coplanar faces from different pieces always have a clear front one. (2-9 mm on a 3.4 m model.)
  for (const [id, p] of by) {
    const e = 0.002 + (p.part >> 2) * 0.0018 + (id % 4) * 0.0009;
    for (let i = 0; i < p.pos.length; i++) p.pos[i] += p.nor[i] * e;
  }
  return [...by.entries()].map(([id, p]) => {
    const c = [0, 0, 0], k = p.pos.length / 3;
    for (let i = 0; i < p.pos.length; i += 3) { c[0] += p.pos[i]; c[1] += p.pos[i + 1]; c[2] += p.pos[i + 2]; }
    c[0] /= k; c[1] /= k; c[2] /= k;
    for (let i = 0; i < p.pos.length; i += 3) { p.pos[i] -= c[0]; p.pos[i + 1] -= c[1]; p.pos[i + 2] -= c[2]; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
    return { id, part: p.part, stage: p.part >> 2, fin: p.part & 3, geo: g, home: new THREE.Vector3(...c) };
  });
}

export async function start({ canvas, stage, url, frame, reduce, C = 4, seed = 0, city = null }) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
  const ab = await (await fetch(url)).arrayBuffer();
  const parts = pieces(ab);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(small ? 1 : 1.5, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050203);
  scene.fog = new THREE.FogExp2(0x120405, 0.045);
  // near/far as tight as the shots allow: depth precision is what keeps close faces apart
  const camera = new THREE.PerspectiveCamera(38, 1, 0.4, 90);

  // THE FLOOR (kit.js): a night map, streets glowing in a grid that fades with distance; up to
  // four rings of light (x, z, radius, power) roll across it, and a radar sweep.
  const rings = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0));
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { uRings: { value: rings }, uSweep: { value: new THREE.Vector4(0, 0, 0, 0) } },
    vertexShader: `varying vec2 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vW; uniform vec4 uRings[4]; uniform vec4 uSweep;
      float line(float v, float w) { float f = abs(fract(v) - 0.5); return 1.0 - smoothstep(w, w + 0.02, 0.5 - f); }
      float ring(vec4 r) { float d = length(vW - r.xy); return r.w * (1.0 - smoothstep(0.0, 0.25, abs(d - r.z))) + r.w * 0.1 * (1.0 - smoothstep(0.0, max(r.z, 0.01), d)); }
      void main() {
        float big = max(line(vW.x / 3.1, 0.012), line(vW.y / 3.1, 0.012));
        float small = max(line(vW.x / 0.775, 0.01), line(vW.y / 0.775, 0.01)) * 0.35;
        float fade = exp(-length(vW) * 0.075);
        vec3 col = vec3(0.03, 0.012, 0.014) + vec3(0.9, 0.08, 0.07) * (big * 0.42 + small * 0.2) * fade;
        for (int i = 0; i < 4; i++) col += vec3(1.0, 0.25, 0.15) * ring(uRings[i]);
        if (uSweep.w > 0.0) { vec2 d = vW - uSweep.xy; float a = mod(atan(d.y, d.x) - uSweep.z, 6.2831853);
          float wake = exp(-(6.2831853 - a) * 2.2) * step(length(d), 7.0) * (1.0 - length(d) / 7.0);
          col += vec3(1.0, 0.18, 0.12) * wake * uSweep.w * 0.9; }
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);

  scene.add(new THREE.HemisphereLight(0x7a2a2a, 0x050000, 0.6));
  const key = new THREE.DirectionalLight(0xffe6dc, 1.7); key.position.set(-4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2a1e, 2.2); rim.position.set(5, 3, -6); scene.add(rim);
  // a red work-light that circles the model, so its edges catch light as the camera moves
  const orbit = new THREE.PointLight(0xff3a24, 6, 9, 1.6); scene.add(orbit);

  // The finishes (kit.js), one material per finish and stage so each chapter can glow on its own.
  const MAT = (fin) => fin === 0 ? new THREE.MeshStandardMaterial({ color: 0xc40c10, metalness: 0.55, roughness: 0.28, emissive: 0xff1a10, emissiveIntensity: 0.15 })
    : fin === 1 ? new THREE.MeshPhysicalMaterial({ color: 0xf2eeee, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, emissive: 0xff6a50, emissiveIntensity: 0 })
    : fin === 2 ? new THREE.MeshStandardMaterial({ color: 0x15100f, metalness: 0.75, roughness: 0.32, emissive: 0xff2010, emissiveIntensity: 0 })
    : new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2a10, emissiveIntensity: 1.6 });
  const mats = {}, GLOWC = new THREE.Color(0xff3a2a);
  const matFor = (fin, st) => mats[fin + '_' + st] || (mats[fin + '_' + st] = MAT(fin));
  const model = new THREE.Group(); scene.add(model);
  const P = parts.map((p, i) => {
    // a glowing piece gets its own material, its brightness set by its size: a small light sparkles,
    // a big glowing face (a ball, a vault's core, a lit tile field) stops short of a white flare
    p.geo.computeBoundingBox();
    const bb = p.geo.boundingBox, size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
    const glowK = p.fin === 3 ? Math.max(0.28, Math.min(1, 0.22 / Math.max(0.01, size))) : 1;
    const m = new THREE.Mesh(p.geo, p.fin === 3 ? MAT(3) : matFor(p.fin, p.stage)); m.position.copy(p.home); model.add(m);
    return { ...p, mesh: m, i, glowK };
  });
  const box = new THREE.Box3().setFromObject(model), top = box.max.y, R = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  const flat = (box.max.z - box.min.z) < 0.45 * (box.max.x - box.min.x);

  // Each stage's pieces, in the order they arrive (the base from the middle out, everything
  // else bottom up), and each stage's way in.
  const STYLES = ['drop', 'rise', 'explode', 'pop'];
  const stages = [0, 1, 2, 3].map(st => P.filter(p => p.stage === st).sort((a, b) =>
    st === 0 ? a.home.length() - b.home.length() : a.home.y - b.home.y || a.home.x - b.home.x));
  const styleOf = [0, 1, 2, 3].map(st => st === 0 ? 'rise' : st === 1 ? 'drop' : st === 3 ? (seed % 2 ? 'explode' : 'drop') : ['explode', 'pop'][seed % 2]);
  // where each stage plays, in story progress: the base builds on arrival (by the clock), each
  // later stage in its own chapter, the reveal (stage 3) taking the fourth
  // (stages 0 and 1 by the clock on arrival; stage 2 in chapter 1; chapter 2 is the scan; the reveal in 3)
  const WIN = [null, null, [1.12, 1.85], [3.1, 3.9]];
  const CLOCK = [[0.15, 1.5], [1.0, 2.6]];

  // EMBERS (kit.js): drifting dust, plus sparks thrown where pieces land.
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,200,160,.6)'); gr.addColorStop(1, 'rgba(255,80,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const particles = (n, size) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; scene.add(pts);
    return { n, set(i, x, y, z, r, gg, b) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b; },
      done() { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; } };
  };
  const dust = particles(small ? 120 : 220, 0.07);
  const NS = small ? 140 : 260, sparks = particles(NS, 0.11);

  // THE SCAN (chapter 2): a 9 x 9 geo-grid laid round the business, every point a search. The
  // points rise ring by ring out of the centre as the radar passes, as tall and as bright as the
  // business ranks there (the welcome page's rank heat), and stay lit for the rest of the story.
  const GN = 9, gm = (GN - 1) / 2, gstep = (R * 2 + 3.2) / (GN - 1);
  const HEAT = [0xff2a2e, 0xc8181c, 0x8e1114, 0x5a0b0d, 0x3a0809, 0x1a1214];
  const cells = [];
  for (let r = 0; r < GN; r++) for (let c = 0; c < GN; c++) {
    const x = (c - gm) * gstep, z = (r - gm) * gstep;
    // the business stands there: no point inside its real footprint (plus half a step), so a wide
    // thin model (a calendar, a card) is not speared by the grid
    if (x > box.min.x - gstep * 0.5 && x < box.max.x + gstep * 0.5 && z > box.min.z - gstep * 0.5 && z < box.max.z + gstep * 0.5) continue;
    const ring = Math.max(Math.abs(r - gm), Math.abs(c - gm));
    const band = Math.min(5, Math.floor(ring * 0.9 + hash(r * 31 + c, seed) * 2.2));
    // as tall as the rank is good, but never a wall round the business: the rings nearest it stay low
    // (and never taller than about half the model itself, so a low model is not buried)
    cells.push({ x, z, ring, band, hgt: Math.min(0.12 + (5 - band) * 0.16, 0.1 + (ring - 1) * 0.16, Math.max(0.12, top * 0.5)) });
  }
  const cellGeo = new THREE.BoxGeometry(gstep * 0.42, 1, gstep * 0.42); cellGeo.translate(0, 0.5, 0);
  const cellMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const grid = new THREE.InstancedMesh(cellGeo, cellMat, cells.length);
  const gcol = new THREE.Color(), gmx = new THREE.Matrix4(), gq = new THREE.Quaternion(), gsv = new THREE.Vector3(), gpv = new THREE.Vector3();
  cells.forEach((q, i) => grid.setColorAt(i, gcol.setHex(HEAT[q.band])));
  grid.frustumCulled = false; scene.add(grid);
  const SCAN = [2.08, 2.9];

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.6, 0.34);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // THE SHOTS, [eye, look] per stop: 0 the title (low and wide, the street at eye level),
  // 1-4 the chapters (round the side, over the shoulder, the close-up on the reveal, pulled back),
  // 5 the crane up over the finished thing. Mirrored and turned per page so no two pages frame alike.
  const sx = seed % 2 ? -1 : 1, rot = (seed % 5) * 0.35 - 0.7, h = Math.max(1.2, top);
  const STOPS = [
    [[-6.2 * sx, 1.5, 6.6], [0, h * 0.42, 0]],              // 0 the title: low, wide, the street at eye level
    [[6.6 * sx, h * 1.35, 6.4], [0, h * 0.5, 0]],           // 1 chapter 1: round the side as the details land
    [[1.2 * sx, h * 2.4 + 4.6, 6.6], [0, 0.2, 0]],          // 2 chapter 2: high over the scan, the grid below
    [[3.2 * sx, h * 1.3, 5.0], [0, h * 0.62, 0]],           // 3 chapter 3: in close on the reveal, the whole model still in frame
    [[-4.4 * sx, h * 1.4, 5.2], [0, h * 0.5, 0]],           // 4 chapter 4: pulled back, everything lit
    [[0.6 * sx, h * 3.4 + 3.5, 8.5], [0, h * 0.3, 0]],      // 5 the crane up over the finished thing
  ].map(([e, l]) => [[e[0] * Math.cos(rot) - e[2] * Math.sin(rot), e[1], e[0] * Math.sin(rot) + e[2] * Math.cos(rot)].map((v, k) => k === 1 ? v : v * Math.max(1, R / 1.6)), l])
    // A FLAT model (a calendar, a card, a dial: much wider than deep) is only legible from the
    // front, so its shots are swung round into the front half (within ~50° of straight on).
    .map(([e, l]) => {
      // every model is built to face the front (a coin, a sign, a screen); flat ones tighter still
      const d = Math.hypot(e[0], e[2]), a = Math.atan2(e[0], e[2]), lim = flat ? 0.8 : 0.95, ca = Math.max(-lim, Math.min(lim, a));
      return [[Math.sin(ca) * d, e[1], Math.cos(ca) * d], l];
    });
  // the camera holds the first half of each stretch while its moment plays, then travels (kit.js)
  const lerpStop = (p, k) => { const a = Math.min(5, Math.max(0, Math.floor(p))), b = Math.min(5, a + 1), w = ease((p - a - 0.5) / 0.5);
    return STOPS[a][k].map((v, j) => v + (STOPS[b][k][j] - v) * w); };

  let W = 0, H = 0, raf = 0, mx = 0, my = 0, tmx = 0, tmy = 0, kickAt = -99, kickAmp = 0, bloomKick = -99, visible = true, running = true;
  const resize = () => {
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    if (w === W && hh === H) return;
    W = w; H = hh;
    renderer.setSize(w, hh, false); composer.setSize(w, hh); bloom.setSize(w, hh);
    camera.aspect = w / Math.max(1, hh);
    // upright (phone, tablet held portrait): the words sit at the bottom, so the scene lifts above them;
    // wide: the words take the left, so the scene's centre moves right
    if (hh > w) camera.setViewOffset(w, hh, 0, hh * 0.17, w, hh);
    else if (w > 900) camera.setViewOffset(w, hh, -w * 0.16, 0, w, hh);
    else camera.setViewOffset(w, hh, -w * 0.2, 0, w, hh);   // narrow-landscape: the words take the left half
    camera.updateProjectionMatrix();
  };
  const onPM = (e) => { tmx = e.clientX / window.innerWidth * 2 - 1; tmy = e.clientY / window.innerHeight * 2 - 1; };
  if (!reduce) window.addEventListener('pointermove', onPM, { passive: true });

  const t0 = performance.now() / 1000;
  const landed = [0, 0, 0, 0];      // when each stage last finished landing (for the jolt and swell)
  const sparkSrc = [];              // [x, y, z, t] where sparks were thrown
  const throwSparks = (x, y, z, s) => { sparkSrc.push([x, y, z, s]); if (sparkSrc.length > 6) sparkSrc.shift(); };
  const tmp = new THREE.Vector3();

  const draw = () => {
    raf = 0;
    if (!canvas.isConnected) { stop(); return; }
    resize();
    const s = performance.now() / 1000, life = reduce ? 99 : s - t0;
    const d = frame ? frame(s) : {}, p = reduce ? C + 1 : (typeof d.p === 'number' ? d.p : 0);
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    rings.forEach(r => r.set(0, 0, 0, 0));
    floorMat.uniforms.uSweep.value.set(0, 0, 0, 0);
    const chapter = p < 0.72 ? -1 : Math.min(C - 1, Math.floor(p) - 1);

    // THE PIECES
    for (let st = 0; st < 4; st++) {
      const list = stages[st], n = list.length; if (!n) continue;
      const style = styleOf[st];
      // the stage's progress: the base by the clock on arrival, the others by the scroll
      const g = st < 2 ? clamp((life - CLOCK[st][0]) / (CLOCK[st][1] - CLOCK[st][0])) : span(p, WIN[st][0], WIN[st][1]);
      const hot = (chapter === 0 && st === 2) || (chapter === 2 && st === 3) || chapter === 3 ? 1 : 0;
      let all = g >= 1;
      list.forEach((q, j) => {
        const k = clamp((g - (j / n) * 0.45) / 0.55), m = q.mesh;
        if (k <= 0) { m.visible = false; return; }
        m.visible = true;
        const hx = q.home.x, hy = q.home.y, hz = q.home.z, r = hash(q.id, st);
        m.rotation.set(0, 0, 0); m.scale.setScalar(1); m.position.copy(q.home);
        if (style === 'drop') {
          const f = k < 0.7 ? Math.pow(k / 0.7, 2) : 1;                       // falling, accelerating
          const bounce = k < 0.7 ? 0 : Math.sin((k - 0.7) / 0.3 * Math.PI) * 0.18 * (1 - k); // the bounce
          m.position.y = hy + (1 - f) * (6 + r * 3) + bounce;
          m.rotation.y = (1 - f) * (r - 0.5) * 2;
          if (k > 0.68 && k < 0.8) { W_ring(0, hx, hz, 0.2 + (k - 0.68) * 9, 1.2); }
        } else if (style === 'rise') {
          const e = backOut(k);
          m.position.y = hy - (1 - e) * (hy + 1.4 + r);
          m.scale.y = Math.max(0.001, e);
        } else if (style === 'explode') {
          const e = backOut(k), out = 1 - e;
          tmp.set(hx, hy, hz).normalize();
          m.position.set(hx + (tmp.x || r - 0.5) * out * 7, hy + out * (3 + r * 3), hz + (tmp.z || r - 0.5) * out * 7);
          m.rotation.set(out * (r * 6 - 3), out * (hash(q.id, 9) * 8 - 4), out * (r * 4 - 2));
        } else {
          const e = backOut(k);
          m.scale.setScalar(Math.max(0.001, e));
          m.rotation.y = (1 - ease(k)) * Math.PI * 3;
        }
        if (k < 1) all = false;
      });
      // the stage's glow: the subject chapter burns brighter, the glow finish pulses
      list.forEach(q => {
        const mt = q.mesh.material;
        if (q.fin === 3) { mt.emissiveIntensity = (1.3 + hot * (1.2 + 0.5 * Math.sin(s * 4)) + (g < 1 ? (1 - g) * 2 : 0)) * q.glowK; mt.color.setScalar(1).multiplyScalar(0.55 + 0.45 * q.glowK).multiply(GLOWC); }
        else mt.emissiveIntensity = (q.fin === 0 ? 0.15 : 0) + hot * (0.18 + 0.1 * Math.sin(s * 3));
      });
      // a stage that has just finished landing: a shockwave from the middle, the camera jolted,
      // the bloom swelling, sparks thrown off the top
      if (all && !landed[st]) {
        landed[st] = s;
        if (st > 0) { kickAt = s; kickAmp = st === 3 ? 0.22 : 0.12; bloomKick = s; throwSparks(0, top * 0.9, 0, s); }
      } else if (!all) landed[st] = 0;
      if (landed[st] && st > 0) { const w = (s - landed[st]) / 1.4; if (w < 1) W_ring(1, 0, 0, 0.4 + Math.pow(w, 0.7) * 9, (1 - w) * 0.9); }
    }
    {
      const g = span(p, SCAN[0], SCAN[1]), maxRing = gm;
      cells.forEach((q, i) => {
        const k = clamp((g * (maxRing + 1.2) - q.ring) / 1.2);
        const e = backOut(k), y = Math.max(0.001, q.hgt * e);
        const pulse = 1 + (q.band === 0 ? 0.25 * Math.sin(s * 5 + i) : 0) * (k >= 1 ? 1 : 0);
        gsv.set(1, y * pulse, 1); gpv.set(q.x, k <= 0 ? -5 : 0, q.z); gmx.compose(gpv, gq, gsv); grid.setMatrixAt(i, gmx);   // not yet risen: under the street
        // bright while it lands, then settling to its heat
        gcol.setHex(HEAT[q.band]).multiplyScalar(k <= 0 ? 0 : 1 + (1 - k) * 2.5);
        grid.setColorAt(i, gcol);
      });
      grid.instanceMatrix.needsUpdate = true; grid.instanceColor.needsUpdate = true;
      // the sweep and the scan's front ring stay a guide, not a flood: the points are the subject
      if (g > 0 && g < 1) { floorMat.uniforms.uSweep.value.set(0, 0, g * Math.PI * 4, 0.55); W_ring(0, 0, 0, g * (gm + 1) * gstep, 0.45 * Math.sin(Math.PI * g)); }
      if (g >= 1 && !landed.scan) { landed.scan = s; kickAt = s; kickAmp = 0.1; bloomKick = s; } else if (g < 1) landed.scan = 0;
    }
    // the radar sweep turns under the title shot, and again round the finished model
    const sweepOn = Math.max(1 - ease(p * 1.4), ease((p - C - 0.4) * 2));
    if (sweepOn > 0.01) floorMat.uniforms.uSweep.value.set(0, 0, s * 1.3, sweepOn * 0.6);
    // two soft rings always breathing round the base
    [0, 0.5].forEach((ph, j) => { const k = (s / 3.4 + ph) % 1; W_ring(2 + j, 0, 0, R * 0.8 + k * 3, (1 - k) * 0.28); });

    // THE CAMERA: the stop for this stretch, a slow orbit in the finale, the pointer's lean,
    // a breath, and the jolt when a chapter lands
    const eye = lerpStop(p, 0), look = lerpStop(p, 1);
    const fin = ease((p - C - 0.3) * 1.6);
    if (fin > 0) { const a = fin * 0.9 + (s - t0) * 0.05 * fin; const c = Math.cos(a), sn = Math.sin(a); const x = eye[0], z = eye[2]; eye[0] = x * c - z * sn; eye[2] = x * sn + z * c; }
    // a tall phone screen stands further back, so close-ups still fit and do not burn out
    const back = camera.aspect < 1 ? Math.min(3.6, 1.3 / camera.aspect) : 1;
    scene.fog.density = 0.045 / back;
    const shake = reduce ? 0 : Math.exp(-Math.max(0, s - kickAt) * 7) * kickAmp;
    camera.position.set(look[0] + (eye[0] - look[0]) * back + mx * 0.8 + Math.sin(s * 0.3) * 0.15 + Math.sin(s * 61) * shake,
      look[1] + (eye[1] - look[1]) * back - my * 0.4 + Math.cos(s * 47) * shake, look[2] + (eye[2] - look[2]) * back);
    camera.lookAt(look[0], look[1], look[2]);
    orbit.position.set(Math.cos(s * 0.6) * (R + 1.2), top * 0.8 + 0.6, Math.sin(s * 0.6) * (R + 1.2));

    // the bloom swells for a moment when a chapter lands
    bloom.strength = (camera.aspect < 1 ? 0.6 : 0.85) + Math.exp(-Math.max(0, s - bloomKick) * 2.5) * (camera.aspect < 1 ? 0.45 : 0.75);

    // embers: dust over the floor; sparks fountaining from the last landings
    for (let i = 0; i < dust.n; i++) {
      const tw = 0.25 + 0.25 * Math.sin(s * 2 + i);
      dust.set(i, (hash(i) - 0.5) * 22, ((hash(i, 2) + s * (0.02 + hash(i, 3) * 0.03)) % 1) * 6, (hash(i, 1) - 0.5) * 14, tw * 0.6, tw * 0.12, tw * 0.08);
    }
    dust.done();
    for (let i = 0; i < sparks.n; i++) {
      const src = sparkSrc[i % Math.max(1, sparkSrc.length)];
      if (!src) { sparks.set(i, 0, -10, 0, 0, 0, 0); continue; }
      const t = s - src[3] - hash(i, 4) * 0.25, lifeK = clamp(1 - t / 1.6);
      if (t < 0 || lifeK <= 0) { sparks.set(i, 0, -10, 0, 0, 0, 0); continue; }
      const a = hash(i) * Math.PI * 2, v = 1.5 + hash(i, 1) * 3.5, up = 2.5 + hash(i, 2) * 4;
      sparks.set(i, src[0] + Math.cos(a) * v * t, src[1] + up * t - 4.9 * t * t, src[2] + Math.sin(a) * v * t, lifeK, lifeK * 0.42, lifeK * 0.16);
    }
    sparks.done();

    composer.render();
    if (!reduce && visible && running && !document.hidden) raf = requestAnimationFrame(draw);
  };
  function W_ring(i, x, z, r, power) { rings[i].set(x, z, r, power); }
  const kick = () => { if (!raf && running) raf = requestAnimationFrame(draw); };

  // Draw only while the stage is on screen and the tab is showing. While the world is on screen
  // the welcome city behind it (which it covers) pauses, so the two never render together.
  const io = new IntersectionObserver((es) => {
    visible = es.some(x => x.isIntersecting);
    if (city) { city.__paused = visible; if (!visible && city.__resume) city.__resume(); }
    if (visible) kick();
  }, { threshold: 0 });
  io.observe(stage || canvas);
  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', kick, { passive: true });
  function stop() { running = false; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onPM); document.removeEventListener('visibilitychange', onVis);
    if (city) { city.__paused = false; if (city.__resume) city.__resume(); } renderer.dispose(); }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); }, false);
  canvas.classList.add('ready');
  kick();
  return { stop };
}
