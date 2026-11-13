// Turns a label map into smooth vector outlines, one set of closed loops per colour.
// Loops run clockwise around filled areas and anticlockwise around holes, so any fill rule renders them correctly.

// Follows the pixel edges of every blob where inside(p) is true. Returns loops of [x, y] corner points.
function pixelLoops(inside, w, h) {
  const W = w + 1;
  const o1 = new Int32Array(W * (h + 1)).fill(-1);
  const o2 = new Int32Array(W * (h + 1)).fill(-1);
  const add = (a, b) => { if (o1[a] < 0) o1[a] = b; else o2[a] = b; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (!inside[p]) continue;
    const v = y * W + x;
    if (y === 0 || !inside[p - w]) add(v, v + 1);
    if (x === w - 1 || !inside[p + 1]) add(v + 1, v + 1 + W);
    if (y === h - 1 || !inside[p + w]) add(v + 1 + W, v + W);
    if (x === 0 || !inside[p - 1]) add(v + W, v);
  }
  const loops = [];
  for (let s = 0; s < o1.length; s++) {
    while (o1[s] >= 0) {
      const pts = [];
      let cur = s, prev = -1, lastDir = 0;
      do {
        let nxt;
        if (o2[cur] < 0) { nxt = o1[cur]; o1[cur] = -1; }
        else {
          // two ways out of a pinch point: take the right turn so diagonal neighbours stay separate
          const d = cur - prev;
          const right = d === 1 ? W : d === W ? -1 : d === -1 ? -W : 1;
          if (prev >= 0 && o2[cur] - cur === right) { nxt = o2[cur]; o2[cur] = -1; }
          else { nxt = o1[cur]; o1[cur] = o2[cur]; o2[cur] = -1; }
        }
        const dir = nxt - cur;
        if (dir !== lastDir) pts.push([cur % W, (cur - (cur % W)) / W]);
        lastDir = dir;
        prev = cur; cur = nxt;
      } while (cur !== s);
      loops.push(pts);
    }
  }
  return loops;
}

function area(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function rdp(pts, eps) {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = pts[a][0], ay = pts[a][1];
    const dx = pts[b][0] - ax, dy = pts[b][1] - ay;
    const len = Math.hypot(dx, dy) || 1;
    let far = -1, fd = eps;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function simplifyLoop(pts, eps) {
  if (pts.length < 4) return pts;
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > fd) { fd = d; far = i; }
  }
  const a = rdp(pts.slice(0, far + 1), eps);
  const b = rdp(pts.slice(far).concat([pts[0]]), eps);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

// A point is kept as a hard corner when the outline turns sharply there between two reasonably long edges.
let cornerLimit = 0.35;   // lower = fewer hard corners, so rounder outlines
export function setCornerLimit(v) { cornerLimit = v; }

function isCorner(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
  const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
  if (lu < 4 || lv < 4) return false;
  return (ux * vx + uy * vy) / (lu * lv) < cornerLimit;
}

// Traces every colour. Returns layers[colour] = loops (simplified polygons, in pixels).
export function traceLayers(labels, w, h, nColors, { detail = 1.2, minArea = 10 } = {}) {
  const layers = [];
  const inside = new Uint8Array(w * h);
  for (let c = 0; c < nColors; c++) {
    for (let p = 0; p < inside.length; p++) inside[p] = labels[p] === c ? 1 : 0;
    layers.push(traceMask(inside, w, h, { detail, minArea }));
  }
  return layers;
}

export function traceMask(inside, w, h, { detail = 1.2, minArea = 10, outerOnly = false } = {}) {
  const out = [];
  for (const raw of pixelLoops(inside, w, h)) {
    const a = area(raw);
    if (Math.abs(a) < minArea) continue;
    if (outerOnly && a < 0) continue;
    const loop = simplifyLoop(raw, detail);
    if (loop.length >= 3) out.push(loop);
  }
  return out;
}

const fmt = (v) => (Math.round(v * 10) / 10).toString();

// SVG path data for one loop: curves through edge midpoints, straight lines into hard corners.
export function loopPath(loop, scale = 1) {
  const n = loop.length;
  const P = (i) => loop[((i % n) + n) % n];
  const mid = (a, b) => [(a[0] + b[0]) / 2 * scale, (a[1] + b[1]) / 2 * scale];
  let m = mid(P(0), P(1));
  let d = `M${fmt(m[0])} ${fmt(m[1])}`;
  for (let i = 1; i <= n; i++) {
    const b = P(i);
    m = mid(b, P(i + 1));
    const bx = fmt(b[0] * scale), by = fmt(b[1] * scale);
    if (isCorner(P(i - 1), b, P(i + 1))) d += `L${bx} ${by}L${fmt(m[0])} ${fmt(m[1])}`;
    else d += `Q${bx} ${by} ${fmt(m[0])} ${fmt(m[1])}`;
  }
  return d + 'Z';
}

// The same smoothed outline as a dense polyline (closed: last point equals the first).
export function loopPolyline(loop) {
  const n = loop.length;
  const P = (i) => loop[((i % n) + n) % n];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(P(0), P(1));
  const pts = [m];
  for (let i = 1; i <= n; i++) {
    const b = P(i), m2 = mid(b, P(i + 1));
    if (isCorner(P(i - 1), b, P(i + 1))) pts.push(b, m2);
    else {
      for (let s = 1; s <= 5; s++) {
        const t = s / 5, u = 1 - t;
        pts.push([u * u * m[0] + 2 * u * t * b[0] + t * t * m2[0], u * u * m[1] + 2 * u * t * b[1] + t * t * m2[1]]);
      }
    }
    m = m2;
  }
  return pts;
}

export function layerPath(loops, scale = 1) {
  return loops.map((l) => loopPath(l, scale)).join('');
}

// A layered SVG sized in real units. Each colour is one group holding one compound path.
export function buildSvg({ layers, colors, w, h, widthIn, title }) {
  const heightIn = widthIn * h / w;
  const groups = layers.map((loops, i) => loops.length
    ? `  <g id="layer-${i + 1}" fill="${colors[i]}"><path d="${layerPath(loops)}"/></g>`
    : '').filter(Boolean).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthIn.toFixed(3)}in" height="${heightIn.toFixed(3)}in" viewBox="0 0 ${+w.toFixed(2)} ${+h.toFixed(2)}">
  <title>${(title || 'design').replace(/[<&>]/g, '')}</title>
${groups}
</svg>
`;
}

// Cuts loops down to a rectangle (Sutherland–Hodgman, one side at a time). Holes stay holes.
export function clipLoops(loops, x0, y0, x1, y1) {
  const sides = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]],
  ];
  const out = [];
  for (const loop of loops) {
    let pts = loop;
    for (const [inside, cross] of sides) {
      if (!pts.length) break;
      const next = [];
      for (let i = 0; i < pts.length; i++) {
        const cur = pts[i], prev = pts[(i + pts.length - 1) % pts.length];
        const ci = inside(cur), pi = inside(prev);
        if (ci) { if (!pi) next.push(cross(prev, cur)); next.push(cur); }
        else if (pi) next.push(cross(prev, cur));
      }
      pts = next;
    }
    if (pts.length >= 3 && Math.abs(area(pts)) >= 4) out.push(pts);
  }
  return out;
}
