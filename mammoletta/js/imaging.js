// Pixel work: background removal, colour reduction, clean-up. No DOM in here, so it also runs in Node.
// An image is { data: Uint8ClampedArray (RGBA), w, h }. A label map holds one palette index per pixel, -1 = empty.

function lab(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function hasTransparency(data) {
  let clear = 0;
  const n = data.length / 4;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) clear++;
  return clear / n > 0.03;
}

// Clears the backdrop: everything connected to the image edge that is close to the edge's main colour.
export function removeBackground(data, w, h, tol) {
  const buckets = new Map();
  const edge = (x, y) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 128) return;
    const key = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4);
    let b = buckets.get(key);
    if (!b) buckets.set(key, b = [0, 0, 0, 0]);
    b[0]++; b[1] += data[i]; b[2] += data[i + 1]; b[3] += data[i + 2];
  };
  for (let x = 0; x < w; x++) { edge(x, 0); edge(x, h - 1); }
  for (let y = 0; y < h; y++) { edge(0, y); edge(w - 1, y); }
  let best = null;
  for (const b of buckets.values()) if (!best || b[0] > best[0]) best = b;
  if (!best) return;
  const br = best[1] / best[0], bg = best[2] / best[0], bb = best[3] / best[0];
  const t2 = tol * tol;
  const close = (p) => {
    const i = p * 4;
    if (data[i + 3] < 128) return false;
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= t2;
  };
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (p) => { if (close(p)) { data[p * 4 + 3] = 0; stack[top++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (top) {
    const p = stack[--top];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
}

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reduces the image to k flat colours (k-means in Lab). Returns { labels, palette }.
export function quantize(data, w, h, k) {
  const n = w * h;
  const labels = new Int16Array(n).fill(-1);
  const step = Math.max(1, Math.floor(Math.sqrt(n / 20000)));
  const samples = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4;
    if (data[i + 3] >= 128) samples.push(lab(data[i], data[i + 1], data[i + 2]));
  }
  if (!samples.length) return { labels, palette: [] };
  k = Math.max(1, Math.min(k, samples.length));

  const rand = rng(7);
  const cent = [samples[Math.floor(rand() * samples.length)].slice()];
  const d2 = new Float64Array(samples.length).fill(Infinity);
  while (cent.length < k) {
    const c = cent[cent.length - 1];
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
      if (d < d2[i]) d2[i] = d;
      sum += d2[i];
    }
    if (sum === 0) break;
    let r = rand() * sum, pick = 0;
    for (let i = 0; i < samples.length; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } }
    cent.push(samples[pick].slice());
  }
  k = cent.length;
  const nearest = (s) => {
    let b = 0, bd = Infinity;
    for (let c = 0; c < k; c++) {
      const d = (s[0] - cent[c][0]) ** 2 + (s[1] - cent[c][1]) ** 2 + (s[2] - cent[c][2]) ** 2;
      if (d < bd) { bd = d; b = c; }
    }
    return b;
  };
  for (let it = 0; it < 12; it++) {
    const acc = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (const s of samples) {
      const a = acc[nearest(s)];
      a[0] += s[0]; a[1] += s[1]; a[2] += s[2]; a[3]++;
    }
    for (let c = 0; c < k; c++) if (acc[c][3]) cent[c] = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]];
  }

  // Assign every pixel; a 15-bit colour cache keeps this fast.
  const cache = new Int16Array(32768).fill(-1);
  const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (data[i + 3] < 128) continue;
    const key = (data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | (data[i + 2] >> 3);
    let c = cache[key];
    if (c < 0) c = cache[key] = nearest(lab(data[i], data[i + 1], data[i + 2]));
    labels[p] = c;
    const s = sums[c];
    s[0] += data[i]; s[1] += data[i + 1]; s[2] += data[i + 2]; s[3]++;
  }
  const palette = sums.map((s) => s[3] ? [Math.round(s[0] / s[3]), Math.round(s[1] / s[3]), Math.round(s[2] / s[3])] : [0, 0, 0]);

  // k is an upper limit: colours that are nearly the same shade collapse into one,
  // so a three-colour drawing stays three colours however high the slider is.
  const into = palette.map((_, i) => i);
  const size = sums.map((s) => s[3]);
  const labs = palette.map((c) => lab(c[0], c[1], c[2]));
  for (;;) {
    let bi = -1, bj = -1, bd = 9;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      if (into[i] !== i || into[j] !== j || !size[i] || !size[j]) continue;
      const d = Math.hypot(labs[i][0] - labs[j][0], labs[i][1] - labs[j][1], labs[i][2] - labs[j][2]);
      if (d < bd) { bd = d; bi = i; bj = j; }
    }
    if (bi < 0) break;
    const [keep, drop] = size[bi] >= size[bj] ? [bi, bj] : [bj, bi];
    const t = size[keep] + size[drop];
    palette[keep] = palette[keep].map((v, ch) => Math.round((v * size[keep] + palette[drop][ch] * size[drop]) / t));
    labs[keep] = lab(...palette[keep]);
    size[keep] = t; size[drop] = 0;
    for (let i = 0; i < k; i++) if (into[i] === drop) into[i] = keep;
  }
  if (into.some((v, i) => v !== i)) for (let p = 0; p < n; p++) if (labels[p] >= 0) labels[p] = into[labels[p]];
  return { labels, palette };
}

// Dissolves slivers narrower than `width` pixels (the blurry fringe between two colours) into their neighbours.
export function removeThin(labels, w, h, width) {
  const n = w * h;
  const solid = new Uint8Array(n);
  for (let y = 0; y + width <= h; y++) for (let x = 0; x + width <= w; x++) {
    const p = y * w + x, l = labels[p];
    if (l < 0) continue;
    let same = true;
    for (let dy = 0; dy < width && same; dy++) for (let dx = 0; dx < width; dx++) if (labels[p + dy * w + dx] !== l) { same = false; break; }
    if (same) for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) solid[p + dy * w + dx] = 1;
  }
  for (let p = 0; p < n; p++) if (labels[p] < 0) solid[p] = 1;
  const tally = new Map();
  for (let round = 0; round < 6; round++) {
    const changes = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (solid[p]) continue;
      tally.clear();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (solid[q]) tally.set(labels[q], (tally.get(labels[q]) || 0) + 1);
      }
      let best, bc = 0;
      for (const [l, c] of tally) if (c > bc) { bc = c; best = l; }
      if (bc) changes.push(p, best);
    }
    if (!changes.length) break;
    for (let i = 0; i < changes.length; i += 2) { labels[changes[i]] = changes[i + 1]; solid[changes[i]] = 1; }
  }
}

// Smooths ragged edges and absorbs specks smaller than minArea into whatever surrounds them.
export function cleanup(labels, w, h, k, minArea) {
  const n = w * h;
  const counts = new Int32Array(k + 1);
  for (let pass = 0; pass < 2; pass++) {
    const src = labels.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      counts.fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) counts[src[p + dy * w + dx] + 1]++;
      const own = src[p] + 1;
      if (counts[own] >= 5) continue;
      let best = own, bc = counts[own];
      for (let c = 0; c <= k; c++) if (counts[c] > bc) { bc = counts[c]; best = c; }
      if (bc >= 5) labels[p] = best - 1;
    }
  }
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  for (let pass = 0; pass < 2; pass++) {
    seen.fill(0);
    for (let s = 0; s < n; s++) {
      if (seen[s]) continue;
      const lab0 = labels[s];
      let head = 0, tail = 0;
      queue[tail++] = s; seen[s] = 1;
      counts.fill(0);
      while (head < tail) {
        const p = queue[head++];
        const x = p % w;
        const visit = (q) => {
          if (labels[q] === lab0) { if (!seen[q]) { seen[q] = 1; queue[tail++] = q; } }
          else counts[labels[q] + 1]++;
        };
        if (x > 0) visit(p - 1); else counts[0]++;
        if (x < w - 1) visit(p + 1); else counts[0]++;
        if (p >= w) visit(p - w); else counts[0]++;
        if (p < n - w) visit(p + w); else counts[0]++;
      }
      if (tail >= minArea) continue;
      let best = 0, bc = -1;
      for (let c = 0; c <= k; c++) if (c !== lab0 + 1 && counts[c] > bc) { bc = counts[c]; best = c; }
      if (bc <= 0) continue;
      for (let i = 0; i < tail; i++) labels[queue[i]] = best - 1;
    }
  }
}

// Drops unused colours, orders the rest biggest-first, and trims the map to the artwork's bounding box.
export function compact(labels, w, h, palette) {
  const area = new Array(palette.length).fill(0);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = labels[y * w + x];
    if (l < 0) continue;
    area[l]++;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { labels: new Int16Array(0), w: 0, h: 0, palette: [], area: [], x0: 0, y0: 0 };
  const order = area.map((a, i) => i).filter((i) => area[i] > 0).sort((a, b) => area[b] - area[a]);
  const remap = new Int16Array(palette.length).fill(-1);
  order.forEach((old, i) => { remap[old] = i; });
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = new Int16Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const l = labels[(y + y0) * w + x + x0];
    out[y * cw + x] = l < 0 ? -1 : remap[l];
  }
  return { labels: out, w: cw, h: ch, palette: order.map((i) => palette[i]), area: order.map((i) => area[i]), x0, y0 };
}

// Marks the whole touching blob of one colour around (x, y) in `mask`. Returns how many pixels it marked.
export function floodMark(labels, w, h, x, y, mask, maskW, offX, offY) {
  const start = y * w + x;
  const target = labels[start];
  if (target < 0) return 0;
  const seen = new Uint8Array(w * h);
  const stack = [start];
  seen[start] = 1;
  let count = 0;
  while (stack.length) {
    const p = stack.pop();
    const px = p % w, py = (p - px) / w;
    mask[(py + offY) * maskW + px + offX] = 1;
    count++;
    const visit = (q) => { if (!seen[q] && labels[q] === target) { seen[q] = 1; stack.push(q); } };
    if (px > 0) visit(p - 1);
    if (px < w - 1) visit(p + 1);
    if (py > 0) visit(p - w);
    if (py < h - 1) visit(p + w);
  }
  return count;
}

export const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

// Turns or mirrors a picture together with its erase mask. kind: 'cw' | 'ccw' | 'fliph' | 'flipv'.
export function transformImage(data, w, h, mask, kind) {
  const turn = kind === 'cw' || kind === 'ccw';
  const nw = turn ? h : w, nh = turn ? w : h;
  const out = new Uint8ClampedArray(data.length), outMask = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let nx, ny;
    if (kind === 'cw') { nx = h - 1 - y; ny = x; }
    else if (kind === 'ccw') { nx = y; ny = w - 1 - x; }
    else if (kind === 'fliph') { nx = w - 1 - x; ny = y; }
    else { nx = x; ny = h - 1 - y; }
    const s = (y * w + x) * 4, d = (ny * nw + nx) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    outMask[ny * nw + nx] = mask[y * w + x];
  }
  return { data: out, w: nw, h: nh, mask: outMask };
}

// Cuts a rectangle out of a picture. Erased parts are made transparent for good.
export function cropImage(data, w, h, mask, x0, y0, cw, ch) {
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const s = ((y + y0) * w + x + x0) * 4, d = (y * cw + x) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2];
    out[d + 3] = mask[(y + y0) * w + x + x0] ? 0 : data[s + 3];
  }
  return { data: out, w: cw, h: ch };
}

// Folds colour `from` into colour `into` on a label map.
export function mergeLabels(labels, from, into) {
  for (let p = 0; p < labels.length; p++) if (labels[p] === from) labels[p] = into;
}

// Squared distance from every pixel to the nearest seed pixel (exact; rows then columns of lower parabolas).
export function distance2(seed, w, h) {
  const INF = 1e12, n = Math.max(w, h);
  const out = new Float64Array(w * h);
  for (let p = 0; p < out.length; p++) out[p] = seed[p] ? 0 : INF;
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const pass = (len) => {
    let k = -1;
    for (let q = 0; q < len; q++) {
      if (f[q] >= INF) continue;
      let s = -Infinity;
      while (k >= 0) {
        s = (f[q] + q * q - f[v[k]] - v[k] * v[k]) / (2 * q - 2 * v[k]);
        if (s > z[k]) break;
        k--;
      }
      if (k < 0) s = -Infinity;
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    if (k < 0) { for (let q = 0; q < len; q++) d[q] = INF; return; }
    for (let q = 0, j = 0; q < len; q++) {
      while (z[j + 1] < q) j++;
      d[q] = (q - v[j]) ** 2 + f[v[j]];
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = out[y * w + x];
    pass(h);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  return out;
}

// Border masks for cut files, on a frame grown by pad pixels on every side.
// back: everything within backPx of the design (a backing shape behind it).
// lines: a band linePx either side of every edge between colours and round the outside.
export function borderMasks(labels, w, h, pad, backPx, linePx) {
  const W = w + 2 * pad, H = h + 2 * pad;
  const L = new Int32Array(W * H).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) L[(y + pad) * W + x + pad] = labels[y * w + x];
  const all = new Uint8Array(W * H);
  for (let p = 0; p < all.length; p++) all[p] = L[p] >= 0 ? 1 : 0;
  let back = null, lines = null;
  if (backPx > 0) {
    const d2 = distance2(all, W, H), r2 = backPx * backPx;
    back = new Uint8Array(W * H);
    for (let p = 0; p < back.length; p++) back[p] = d2[p] <= r2 ? 1 : 0;
  }
  if (linePx > 0) {
    const edge = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, c = L[p];
      if (c < 0) continue;
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1 || L[p - 1] !== c || L[p + 1] !== c || L[p - W] !== c || L[p + W] !== c) edge[p] = 1;
    }
    // edge pixels sit half a pixel off the true edge, so the band is trimmed by that much
    const d2 = distance2(edge, W, H), r = Math.max(0.5, linePx - 0.5), r2 = r * r;
    lines = new Uint8Array(W * H);
    for (let p = 0; p < lines.length; p++) lines[p] = d2[p] <= r2 ? 1 : 0;
  }
  const union = new Uint8Array(W * H);
  for (let p = 0; p < union.length; p++) union[p] = all[p] || (back && back[p]) || (lines && lines[p]) ? 1 : 0;
  return { W, H, back, lines, union };
}
