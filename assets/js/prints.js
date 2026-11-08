// The Dad scene: three trails of footprints in the wet sand, seen from above.
// Two pairs of kids' shoes, one bigger and one smaller, and a shiba weaving
// between them. They're walked in from the left, then the sea comes up and
// takes them, and it starts again.
//
// Same format as shapes.js: Float32Array(n * 4) of x, y, z, brightness, in a
// flat frame (x along the beach, y up the beach toward the sea). z encodes what
// a particle is: sand (0..1), a print (4 + the moment it's pressed, 0..1) or
// water (8 + how far it sits into the water, 0..1).

const R = Math.random;
const TAU = Math.PI * 2;
const gauss = () => (R() + R() + R() - 1.5) * 0.8;

export const SAND = { x0: -2.4, x1: 2.4, y0: -0.95, y1: 0.95 };
// Where they walk: a little narrower than the beach, so trails run off both ends.
const WALK = { x0: -1.75, x1: 1.75 };
export const WATER_REST = 0.6;
// Low sun, up the beach and to the right: the far wall of every hollow catches it.
const SUN = (() => { const x = 0.75, y = 0.66, l = Math.hypot(x, y); return [x / l, y / l]; })();

/* A sneaker sole, unit length, toe toward +x, for a left foot (arch on -y). */
function soleOutline() {
  // A wide forefoot, a narrower heel, and a waist that's deeper on the arch side.
  const lobe = (u, c, r, w) => { const t = (u - c) / r; return t * t < 1 ? w * Math.sqrt(1 - t * t) : 0; };
  const hw = (u, inner) => {
    const fore = lobe(u, inner ? 0.15 : 0.12, inner ? 0.35 : 0.34, 0.215);
    const heel = lobe(u, -0.31, 0.19, 0.15);
    const bridge = u > -0.33 && u < 0.14 ? (inner ? 0.07 : 0.13) : 0;
    return Math.max(fore, heel, bridge);
  };
  const pts = [];
  const N = 90;
  for (let i = 0; i <= N; i++) { const u = -0.5 + i / N; pts.push([u, hw(u, false)]); }
  for (let i = N; i >= 0; i--) { const u = -0.5 + i / N; pts.push([u, -hw(u, true)]); }
  return { pts, hw };
}

/* Points around a closed polyline, evenly by length, each with its outward normal. */
function ring(pts) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    seg.push({ a, b, len, at: total });
    total += len;
  }
  // Orientation decides which side is "out".
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sgn = area > 0 ? 1 : -1;
  return () => {
    const d = R() * total;
    let lo = 0, hi = seg.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (seg[m].at <= d) lo = m; else hi = m - 1; }
    const s = seg[lo], t = (d - s.at) / s.len;
    const nx = (s.b[1] - s.a[1]) / s.len * sgn, ny = -(s.b[0] - s.a[0]) / s.len * sgn;
    return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t, nx, ny];
  };
}

const ellipse = (cx, cy, rx, ry, k = 48) => {
  const p = [];
  for (let i = 0; i < k; i++) { const a = (i / k) * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
};

const SOLE = soleOutline();
const SOLE_RIM = ring(SOLE.pts);
// A shiba's paw, unit size, toward +x: a heart-shaped main pad and four toes.
const PAW = [
  { w: 0.42, rim: ring(heartPad()), fill: [-0.14, 0, 0.2, 0.22] },
  { w: 0.15, rim: ring(ellipse(0.2, 0.25, 0.1, 0.085)), fill: [0.2, 0.25, 0.07, 0.06] },
  { w: 0.15, rim: ring(ellipse(0.2, -0.25, 0.1, 0.085)), fill: [0.2, -0.25, 0.07, 0.06] },
  { w: 0.14, rim: ring(ellipse(0.33, 0.085, 0.1, 0.08)), fill: [0.33, 0.085, 0.07, 0.055] },
  { w: 0.14, rim: ring(ellipse(0.33, -0.085, 0.1, 0.08)), fill: [0.33, -0.085, 0.07, 0.055] },
];

function heartPad() {
  // Three lobes at the back, a rounded point toward the toes.
  const p = [];
  const k = 80;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * TAU;
    const lobes = 1 + 0.09 * Math.cos(3 * (a - Math.PI)) * Math.max(0, -Math.cos(a));
    const rx = Math.cos(a) > 0 ? 0.24 : 0.2;
    p.push([-0.12 + Math.cos(a) * rx * lobes, Math.sin(a) * 0.26 * lobes]);
  }
  return p;
}

/* Light on the walls of a hollow: the wall facing the sun is the far one. */
const wallLight = (nx, ny) => {
  const d = -(nx * SUN[0] + ny * SUN[1]);
  return d > 0 ? 0.3 + 1.1 * Math.pow(d, 1.3) : 0.16 + 0.1 * (1 + d);
};

function sampleShoe(pr, out) {
  let x, y, l;
  if (R() < 0.5) {
    const [px, py, nx, ny] = SOLE_RIM();
    const j = gauss() * 0.012;
    x = px + nx * j; y = py + ny * j;
    // Normals turn with the print.
    const my = pr.mirror ? -1 : 1;
    const c = Math.cos(pr.ang), s = Math.sin(pr.ang);
    const wx = nx * c - ny * my * s, wy = nx * s + ny * my * c;
    l = wallLight(wx, wy);
  } else {
    // Tread bars across the sole; the arch barely touches the sand.
    let u;
    do { u = -0.47 + Math.floor(R() * 14) * (0.96 / 13); } while (u > -0.15 && u < 0.0);
    const v = (R() * 2 - 1) * 0.86;
    x = u + gauss() * 0.006;
    y = v > 0 ? v * SOLE.hw(u, false) : v * SOLE.hw(u, true);
    l = 0.2 + 0.18 * R();
  }
  if (pr.mirror) y = -y;
  place(pr, x, y, l, out);
}

function samplePaw(pr, out) {
  let r = R(), part = PAW[0];
  for (const p of PAW) { if ((r -= p.w) <= 0) { part = p; break; } }
  let x, y, l;
  if (R() < 0.75) {
    const [px, py, nx, ny] = part.rim();
    const j = gauss() * 0.014;
    x = px + nx * j; y = py + ny * j;
    const c = Math.cos(pr.ang), s = Math.sin(pr.ang);
    l = wallLight(nx * c - ny * s, nx * s + ny * c) * 1.1;
  } else {
    const [cx, cy, rx, ry] = part.fill;
    const a = R() * TAU, d = Math.sqrt(R());
    x = cx + Math.cos(a) * rx * d; y = cy + Math.sin(a) * ry * d;
    l = 0.16 + 0.14 * R();
  }
  place(pr, x, y, l, out);
}

function place(pr, x, y, l, out) {
  const c = Math.cos(pr.ang), s = Math.sin(pr.ang);
  out[0] = pr.x + (x * c - y * s) * pr.size;
  out[1] = pr.y + (x * s + y * c) * pr.size;
  out[2] = 4 + pr.phase;
  out[3] = l;
}

/* A walked line: a gentle wander along the beach, one print per step. */
function walk({ base, amp, freq, ph, step, gauge, size, kind, lag, wobble = 0 }) {
  const prints = [];
  const path = (x) => base + amp * Math.sin(freq * x + ph) + wobble * Math.sin(freq * 2.7 * x + ph * 1.9);
  const slope = (x) => (path(x + 1e-3) - path(x - 1e-3)) / 2e-3;
  let x = WALK.x0, side = 1, n = 0;
  while (x < WALK.x1) {
    const ang = Math.atan(slope(x));
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const off = gauge * side;
    const phase = Math.min(0.999, Math.max(0, (x - WALK.x0) / (WALK.x1 - WALK.x0) * 0.94 + lag));
    if (kind === 'shoe') {
      prints.push({
        kind, x: x + nx * off, y: path(x) + ny * off, size,
        ang: ang + side * 0.09 + gauss() * 0.04, mirror: side < 0, phase,
      });
    } else {
      // A trotting dog: each hind paw lands just behind where the front one was.
      const a = ang + gauss() * 0.12;
      prints.push({ kind, x: x + nx * off, y: path(x) + ny * off, size, ang: a, phase });
      if (n % 2 === 0) prints.push({ kind, x: x + nx * off - Math.cos(ang) * size * 0.55, y: path(x) + ny * off - Math.sin(ang) * size * 0.55 + gauss() * size * 0.15, size: size * 0.92, ang: a + gauss() * 0.1, phase: Math.min(0.999, phase + 0.004) });
    }
    // Steps aren't metronomic; and the dog darts.
    const dx = step * (1 + gauss() * (kind === 'shoe' ? 0.05 : 0.18));
    x += dx * Math.cos(ang);
    side = -side;
    n++;
  }
  return prints;
}

export function prints(n) {
  const a = new Float32Array(n * 4);
  const trails = [
    // The eldest, up the beach a little, longer stride.
    ...walk({ kind: 'shoe', base: 0.26, amp: 0.06, freq: 1.2, ph: 0.6, step: 0.36, gauge: 0.05, size: 0.16, lag: 0 }),
    // The youngest, nearer, a shorter quicker step, a step or two behind.
    ...walk({ kind: 'shoe', base: -0.22, amp: 0.07, freq: 1.5, ph: 2.1, step: 0.29, gauge: 0.042, size: 0.125, lag: -0.035 }),
    // Kuro, everywhere at once.
    ...walk({ kind: 'paw', base: 0.02, amp: 0.36, freq: 2.0, ph: 0.3, step: 0.14, gauge: 0.03, size: 0.068, lag: 0.02, wobble: 0.06 }),
  ];
  // Particles per print go with its area; the paws get more so they hold their shape.
  const weight = trails.map((p) => p.size * p.size * (p.kind === 'paw' ? 2.4 : 1));
  const cum = [];
  let sum = 0;
  for (const w of weight) cum.push((sum += w));

  const nSand = Math.floor(n * 0.42), nPrint = Math.floor(n * 0.42);
  const out = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (i < nSand) {
      // Sand: a fine dim grain, with the faint ripples the last tide left.
      const x = SAND.x0 + R() * (SAND.x1 - SAND.x0);
      const y = SAND.y0 + R() * (SAND.y1 - SAND.y0);
      const ripple = Math.pow(0.5 + 0.5 * Math.sin(y * 70 + Math.sin(x * 3.1) * 2.4 + Math.sin(x * 7.3) * 0.5), 3);
      const ex = 1;
      const ey = Math.min(1, (y - SAND.y0) / 0.45);
      a[o] = x; a[o + 1] = y; a[o + 2] = R() * 0.99;
      a[o + 3] = (0.07 + 0.09 * R() + 0.08 * ripple) * Math.max(0, ex) * Math.max(0, ey);
    } else if (i < nSand + nPrint) {
      const r = R() * sum;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      const pr = trails[lo];
      (pr.kind === 'shoe' ? sampleShoe : samplePaw)(pr, out);
      a[o] = out[0]; a[o + 1] = out[1]; a[o + 2] = out[2]; a[o + 3] = out[3];
    } else {
      // The sea: a bright edge of foam, then fine lines of water behind it.
      const foam = R() < 0.32;
      const u = foam ? Math.pow(R(), 2.2) * 0.05 : 0.04 + R() * 0.95;
      a[o] = SAND.x0 - 0.1 + R() * (SAND.x1 - SAND.x0 + 0.2);
      a[o + 1] = R();
      a[o + 2] = 8 + Math.min(0.999, u);
      a[o + 3] = foam ? 0.7 + 0.6 * R() : 0.2 + 0.3 * R();
    }
  }
  return a;
}
