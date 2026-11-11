// Auto-digitizer: turns a flat-colour label map into embroidery stitches.
// Each colour is filled with rows of staggered stitches (a tatami fill), optionally over a sparse
// underlay and finished with an outline.
// Output coordinates are integers in 0.1 mm, centred on the design, y pointing down.

import { STITCH, JUMP, COLOR, END, nearestThread, THREADS } from './formats.js';
import { loopPolyline } from './trace.js';

export function digitize(design, opts) {
  const { labels, w, h, palette } = design;
  const {
    sizeMm = 80,          // longest side of the finished design
    spacingMm = 0.4,      // distance between fill rows
    stitchMm = 3,         // longest stitch inside a fill
    angleDeg = 0,         // direction of the fill rows
    underlay = false,     // sparse base layer across the fill direction
    overlapMm = 0.2,      // how far each row runs past its edge, so neighbouring colours meet
    outline = 'none',     // 'none' | 'whole' (around the whole design) | 'each' (around every colour) | 'both'
    outlineMm = 1,        // outline width: up to 0.5 mm a bold running line, wider a satin border
    outlineThread = 20,   // Brother thread for outlines; 0 = each colour's own thread (the whole-design one is then black)
    outer = [],           // traced outer edge of the whole design
    enabled = palette.map(() => true),
    order = palette.map((_, i) => i),   // stitching order, as palette indices
    threads = [],         // chosen Brother thread per palette index (0 or missing = closest match)
    layers = [],          // traced loops per colour, for outlines
  } = opts;

  // a satin border sits half outside the shapes, so the artwork shrinks to keep the total at sizeMm
  const border = outline !== 'none' && outlineMm > 0.5 ? outlineMm * 10 : 0;
  const S = Math.max(1, sizeMm * 10 - border) / Math.max(w, h);   // units per pixel
  const ox = w * S / 2, oy = h * S / 2;
  const R = Math.hypot(w, h) * S / 2;        // rows are laid out across a circle that covers the design

  const cmds = [];
  let cx = 0, cy = 0, sewing = false, count = 0, jumps = 0;

  const put = (x, y, force) => {
    x = Math.round(x); y = Math.round(y);
    if (!force && x === cx && y === cy) return;
    cmds.push([x, y, STITCH]); cx = x; cy = y; count++;
  };
  const stitchTo = (x, y, maxLen) => {
    const d = Math.hypot(x - cx, y - cy);
    const steps = Math.max(1, Math.ceil(d / maxLen));
    const sx = cx, sy = cy;
    for (let i = 1; i <= steps; i++) put(sx + (x - sx) * i / steps, sy + (y - sy) * i / steps);
  };
  const lock = () => { const x = cx, y = cy; put(x + 4, y); put(x, y); put(x + 4, y); put(x, y); };
  const jumpTo = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    cmds.push([x, y, JUMP]); cx = x; cy = y;
    put(x, y, true);
    lock();
  };
  const lineInside = (c, x0, y0, x1, y1) => {
    if (c < 0) return false;
    const ax = (x0 + ox) / S, ay = (y0 + oy) / S, bx = (x1 + ox) / S, by = (y1 + oy) / S;
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) || 1;
    for (let i = 0; i <= steps; i++) {
      const x = Math.floor(ax + (bx - ax) * i / steps), y = Math.floor(ay + (by - ay) * i / steps);
      if (x < 0 || y < 0 || x >= w || y >= h || labels[y * w + x] !== c) return false;
    }
    return true;
  };
  // Move to the start of the next piece: sew there if it's close or hidden under the fill, otherwise trim and jump.
  const travel = (x, y, c) => {
    if (!sewing) { jumpTo(x, y); sewing = true; return; }
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 15) stitchTo(x, y, 25);
    else if (lineInside(c, cx, cy, x, y)) stitchTo(x, y, 25);
    else { lock(); jumpTo(x, y); jumps++; }
  };

  // Fills colour c with rows running at `angle`. Rows live in a turned frame: u along the row, v across rows.
  function fill(c, angle, rowGap, L, pull) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const X = (u, v) => u * cos - v * sin, Y = (u, v) => u * sin + v * cos;
    const stepU = S * 0.5;
    const nU = Math.ceil(2 * R / stepU);

    // 1. cut the colour into runs, one set per stitch row
    const rows = [];
    for (let k = 0, v = -R + rowGap / 2; v < R; v += rowGap, k++) {
      const runs = [];
      let start = null;
      for (let i = 0; i <= nU; i++) {
        const u = -R + i * stepU;
        let inside = false;
        if (i < nU) {
          const px = Math.floor((X(u, v) + ox) / S), py = Math.floor((Y(u, v) + oy) / S);
          inside = px >= 0 && py >= 0 && px < w && py < h && labels[py * w + px] === c;
        }
        if (inside) { if (start === null) start = u; }
        else if (start !== null) {
          if (u - start + 2 * pull >= 6) runs.push({ a: start - pull, b: u + pull, v, k, next: [], prev: [], done: false });
          start = null;
        }
      }
      rows.push(runs);
    }
    // 2. link runs that touch the row below
    for (let k = 0; k + 1 < rows.length; k++) {
      for (const r of rows[k]) for (const q of rows[k + 1]) {
        if (q.a < r.b && r.a < q.b) { r.next.push(q); q.prev.push(r); }
      }
    }
    // 3. chains of single-linked runs become sections that sew as one zig-zag
    const left = [];
    for (const runs of rows) for (const r of runs) {
      if (r.done) continue;
      if (r.prev.length === 1 && r.prev[0].next.length === 1 && !r.prev[0].done) continue;
      const sec = [];
      let cur = r;
      while (cur) {
        sec.push(cur); cur.done = true;
        cur = cur.next.length === 1 && cur.next[0].prev.length === 1 && !cur.next[0].done ? cur.next[0] : null;
      }
      left.push(sec);
    }
    // 4. sew sections nearest-first
    while (left.length) {
      let bi = 0, bd = Infinity, bTop = true, bLeft = true;
      for (let i = 0; i < left.length; i++) {
        const s = left[i], t = s[0], e = s[s.length - 1];
        const cand = [[t.a, t.v, true, true], [t.b, t.v, true, false], [e.a, e.v, false, true], [e.b, e.v, false, false]];
        for (const [u, v, top, lft] of cand) {
          const d = (X(u, v) - cx) ** 2 + (Y(u, v) - cy) ** 2;
          if (d < bd) { bd = d; bi = i; bTop = top; bLeft = lft; }
        }
      }
      const sec = left.splice(bi, 1)[0];
      if (!bTop) sec.reverse();
      let goRight = bLeft;
      const u0 = goRight ? sec[0].a : sec[0].b;
      travel(X(u0, sec[0].v), Y(u0, sec[0].v), c);
      for (const r of sec) {
        const from = goRight ? r.a : r.b, to = goRight ? r.b : r.a;
        stitchTo(X(from, r.v), Y(from, r.v), L * 1.3);
        // staggered needle points so rows don't line up into ridges
        const off = ((r.k * 3) % 8) / 8 * L;
        const pts = [];
        for (let p = Math.ceil((r.a - off) / L) * L + off; p < r.b; p += L) {
          if (p - r.a > 8 && r.b - p > 8) pts.push(p);
        }
        if (!goRight) pts.reverse();
        for (const p of pts) put(X(p, r.v), Y(p, r.v));
        put(X(to, r.v), Y(to, r.v));
        goRight = !goRight;
      }
    }
  }

  // Even steps of `step` units around a closed polyline.
  function resample(poly, step) {
    let per = 0;
    for (let i = 1; i < poly.length; i++) per += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    const n = Math.max(3, Math.round(per / step));
    const stepLen = per / n;
    const pts = [poly[0]];
    let acc = 0, want = stepLen;
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1], b = poly[i];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (acc + seg >= want - 1e-6 && pts.length < n) {
        const t = (want - acc) / (seg || 1);
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        want += stepLen;
      }
      acc += seg;
    }
    return { pts, per };
  }

  function outlines(loops, c) {
    const width = outlineMm * 10;
    for (const loop of loops) {
      const poly = loopPolyline(loop).map((p) => [p[0] * S - ox, p[1] * S - oy]);
      if (width <= 5) {
        // bean stitch: forward, back, forward on every ~2 mm step for a bold line
        const { pts, per } = resample(poly, 20);
        if (per < 40) continue;
        pts.push(pts[0]);
        travel(pts[0][0], pts[0][1], c);
        for (let i = 1; i < pts.length; i++) {
          put(pts[i][0], pts[i][1]);
          put(pts[i - 1][0], pts[i - 1][1]);
          put(pts[i][0], pts[i][1]);
        }
        continue;
      }
      // satin border: stitches across the edge, 0.4 mm apart, over a running stitch that holds it flat
      const { pts: raw, per } = resample(poly, 4);
      if (per < 40) continue;
      const n = raw.length, hw = width / 2;
      // round the corners to about the border's half-width, so stitches fan out instead of crossing
      const k = Math.min(Math.floor(n / 4), Math.ceil(hw / 4));
      const pts = raw.map((_, i) => {
        let sx = 0, sy = 0;
        for (let j = -k; j <= k; j++) { const q = raw[(i + j + n) % n]; sx += q[0]; sy += q[1]; }
        return [sx / (2 * k + 1), sy / (2 * k + 1)];
      });
      travel(pts[0][0], pts[0][1], c);
      for (let i = 5; i < n; i += 5) put(pts[i][0], pts[i][1]);
      put(pts[0][0], pts[0][1]);
      for (let i = 0; i <= n; i++) {
        const a = pts[(i - 3 + n) % n], b = pts[(i + 3) % n], p = pts[i % n];
        const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl * hw, ny = tx / tl * hw;
        put(p[0] + nx, p[1] + ny);
        put(p[0] - nx, p[1] - ny);
      }
    }
  }

  const blocks = [];
  const taken = new Set();
  const begin = (rgb, color, chosen) => {
    if (blocks.length) { lock(); cmds.push([cx, cy, COLOR]); }
    sewing = false;
    const thread = chosen || nearestThread(rgb, taken);
    taken.add(thread);
    blocks.push({ color, thread, name: THREADS[thread - 1][3], threadRgb: THREADS[thread - 1].slice(0, 3), start: count });
  };
  const close = () => {
    const b = blocks[blocks.length - 1];
    b.stitches = count - b.start;
    if (b.stitches === 0) { blocks.pop(); if (blocks.length) cmds.pop(); }
  };

  // threads picked by hand are off-limits to the automatic matching
  for (const c of order) if (enabled[c] && threads[c]) taken.add(threads[c]);
  const eachOutline = outline === 'each' || outline === 'both';
  const wholeOutline = outline === 'whole' || outline === 'both';
  const angle = angleDeg * Math.PI / 180;
  const pull = overlapMm * 10;
  for (const c of order) {
    if (!enabled[c]) continue;
    begin(palette[c], c, threads[c]);
    if (underlay) fill(c, angle + Math.PI / 2, 22, 25, -4);
    fill(c, angle, spacingMm * 10, stitchMm * 10, pull);
    // outlines in each colour's own thread go straight after its fill, saving a thread change
    if (eachOutline && !outlineThread && layers[c]) outlines(layers[c], c);
    close();
  }
  // outlines in one chosen thread are sewn together at the end
  const lastThread = outlineThread || 20;
  if ((eachOutline && outlineThread) || wholeOutline) {
    begin(THREADS[lastThread - 1], -1, lastThread);
    if (eachOutline && outlineThread) for (const c of order) if (enabled[c] && layers[c]) outlines(layers[c], -1);
    if (wholeOutline) outlines(outer, -1);
    close();
  }
  if (cmds.length) { lock(); cmds.push([cx, cy, END]); }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of cmds) {
    if (s[2] !== STITCH) continue;
    if (s[0] < x0) x0 = s[0]; if (s[0] > x1) x1 = s[0];
    if (s[1] < y0) y0 = s[1]; if (s[1] > y1) y1 = s[1];
  }
  return {
    cmds, blocks, stitches: count, jumps,
    widthMm: count ? (x1 - x0) / 10 : 0,
    heightMm: count ? (y1 - y0) / 10 : 0,
    // roughly 400 stitches a minute, plus re-threading for each colour and a pause per trim
    minutes: Math.round(count / 400 + blocks.length * 1.5 + jumps * 0.1),
  };
}
