import { hasTransparency, removeBackground, quantize, removeThin, cleanup, compact, floodMark, hex, transformImage, cropImage, mergeLabels, borderMasks } from './imaging.js';
import { traceLayers, traceMask, layerPath, buildSvg, setCornerLimit } from './trace.js';
import { digitize } from './stitch.js';
import { writePES, writeDST, STITCH, THREADS, nearestThread } from './formats.js';
import { t, initLang, onLangChange } from './i18n.js';

const $ = (s) => document.querySelector(s);
const WORK = 800;   // longest side, in pixels, of the picture everything is worked out from

const state = {
  original: null,   // the picture as first loaded, for "start over"
  src: null,        // { data, width, height }: the picture after turning, flipping and cropping
  erased: null,     // Uint8Array over src: parts the user tapped away
  merges: [],       // pairs of colours [keep, fold-in] the user merged
  undo: [],         // earlier { src, erased, merges, svgText } states
  mode: null,       // 'crop' | 'merge' while one of those tools is active
  order: [],        // stitching order, as palette indices
  picks: [],        // hand-picked Brother thread per palette index
  sig: '',          // the palette these choices belong to
  clean: null,      // src after background removal and erasing
  design: null,     // { labels, w, h, palette, x0, y0 }
  layers: null,     // traced loops per colour
  enabled: [],      // which colours get stitched
  svgText: null,    // the original SVG, when the source was one
  machine: null,    // 'cricut' | 'skitch'
  step: 1,          // wizard step on screen
  stitch: null,
};

// ---------- status line ----------

const statusEl = $('#status');
function status(msg, error = false) {
  statusEl.hidden = !msg;
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('error', error);
}

// ---------- loading pictures ----------

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t('err.open')));
    img.src = url;
  });
}

async function blobToImageData(blob, maxUpscale = 2) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const nw = img.naturalWidth || 1000, nh = img.naturalHeight || 1000;
    const scale = Math.min(WORK / Math.max(nw, nh), maxUpscale);
    const w = Math.max(1, Math.round(nw * scale)), h = Math.max(1, Math.round(nh * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Gives an SVG a definite pixel size so it rasterises sharply whatever its own width and height say.
function prepareSvg(text) {
  const start = text.indexOf('<svg');
  const end = text.lastIndexOf('</svg>');
  if (start < 0 || end < 0) throw new Error(t('err.svg'));
  text = text.slice(start, end + 6);
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (doc.querySelector('parsererror') || svg.nodeName !== 'svg') throw new Error(t('err.svgParse'));
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  let vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(isNaN) || !vb[2] || !vb[3]) {
    const w = parseFloat(svg.getAttribute('width')) || 1000, h = parseFloat(svg.getAttribute('height')) || 1000;
    vb = [0, 0, w, h];
    svg.setAttribute('viewBox', vb.join(' '));
  }
  const s = WORK / Math.max(vb[2], vb[3]);
  svg.setAttribute('width', Math.round(vb[2] * s));
  svg.setAttribute('height', Math.round(vb[3] * s));
  return { clean: text, sized: new XMLSerializer().serializeToString(svg) };
}

async function useSvg(text, name) {
  const { clean, sized } = prepareSvg(text);
  const data = await blobToImageData(new Blob([sized], { type: 'image/svg+xml' }), 1);
  setSource(data, { name, svgText: clean });
}

async function useFile(file) {
  try {
    status(t('st.opening'));
    const name = file.name.replace(/\.[^.]+$/, '');
    if (/svg/.test(file.type) || /\.svg$/i.test(file.name)) await useSvg(await file.text(), name);
    else setSource(await blobToImageData(file), { name });
    status('');
  } catch (e) { status(e.message, true); }
}

function setSource(imageData, { name, svgText = null, colors = 6 } = {}) {
  state.src = imageData;
  state.erased = new Uint8Array(imageData.width * imageData.height);
  state.merges = [];
  state.undo = [];
  state.svgText = svgText;
  state.original = { src: imageData, svgText };
  setMode(null);
  state.enabled = [];
  $('#k').value = colors; $('#k-out').textContent = colors;
  if (name) $('#name').value = name.replace(/[^\w -]/g, '').trim().slice(0, 24) || 'design';
  $('#dl-original-wrap').hidden = !svgText;
  process();
  go(3);
}

// ---------- picture -> flat colours -> outlines ----------

const SPECK = { 1: 4, 2: 2, 3: 1, 4: 0.5, 5: 0.25 };                       // detail: how small a piece may be
const SMOOTH = { 1: [0.5, 0.8], 2: [0.8, 0.55], 3: [1.2, 0.35], 4: [1.8, 0.1], 5: [2.6, -2] };   // [simplify, corner limit]

function snapshot() {
  return { src: state.src, erased: state.erased.slice(), merges: state.merges.slice(), svgText: state.svgText };
}
function pushUndo() {
  state.undo.push(snapshot());
  if (state.undo.length > 20) state.undo.shift();
}
function restore(s) {
  state.src = s.src; state.erased = s.erased; state.merges = s.merges; state.svgText = s.svgText;
  $('#dl-original-wrap').hidden = !s.svgText;
}

function nearestColor(palette, live, rgb) {
  let best = -1, bd = 45 * 45;
  palette.forEach((c, i) => {
    if (!live[i]) return;
    const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function process() {
  const { width: w, height: h } = state.src;
  const data = new Uint8ClampedArray(state.src.data);
  const bg = $('#bg').value;
  if (bg !== 'off' && !hasTransparency(data)) removeBackground(data, w, h, bg === 'strong' ? 85 : 40);
  for (let p = 0; p < state.erased.length; p++) if (state.erased[p]) data[p * 4 + 3] = 0;
  state.clean = { data, w, h };

  const speck = SPECK[$('#detail').value];
  const [eps, corner] = SMOOTH[$('#smooth').value];
  state.eps = eps; state.minArea = 8 * speck;
  setCornerLimit(corner);
  const q = quantize(data, w, h, +$('#k').value);
  if (state.merges.length) {
    // merges are remembered by colour, so they survive erasing and other re-runs
    const live = q.palette.map(() => false);
    for (let p = 0; p < q.labels.length; p++) if (q.labels[p] >= 0) live[q.labels[p]] = true;
    for (const [keep, fold] of state.merges) {
      const a = nearestColor(q.palette, live, keep), b = nearestColor(q.palette, live, fold);
      if (a >= 0 && b >= 0 && a !== b) { mergeLabels(q.labels, b, a); live[b] = false; }
    }
  }
  removeThin(q.labels, w, h, +$('#detail').value >= 4 ? 2 : 3);
  cleanup(q.labels, w, h, q.palette.length, Math.max(6, Math.round(w * h * 0.00012 * speck)));
  const d = compact(q.labels, w, h, q.palette);
  state.design = d;
  state.layers = d.w ? traceLayers(d.labels, d.w, d.h, d.palette.length, { detail: eps, minArea: 8 * speck }) : [];
  // the outer edge of the whole design: for the outline cut file and the whole-design embroidery outline
  const inside = new Uint8Array(d.w * d.h);
  for (let p = 0; p < inside.length; p++) inside[p] = d.labels[p] >= 0 ? 1 : 0;
  state.outer = d.w ? traceMask(inside, d.w, d.h, { detail: eps, outerOnly: true }) : [];
  const sig = d.palette.map(hex).join();
  if (sig !== state.sig) {
    // a different set of colours: thread choices and order start afresh
    state.sig = sig;
    state.enabled = d.palette.map(() => true);
    state.order = d.palette.map((_, i) => i);
    state.picks = d.palette.map(() => 0);
  }

  $('#undo').disabled = !state.undo.length;
  $('#reset').disabled = !state.undo.length && state.src === state.original.src;
  drawPreview();
  drawSwatches();
  updateCutSize();
  scheduleStitch();
}

function drawPreview() {
  const d = state.design;
  const c = $('#preview');
  c.width = Math.max(1, d.w); c.height = Math.max(1, d.h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  state.layers.forEach((loops, i) => {
    ctx.fillStyle = hex(d.palette[i]);
    ctx.fill(new Path2D(layerPath(loops)));
  });
}

function drawSwatches() {
  const box = $('#swatches');
  box.textContent = '';
  let first = -1;
  state.design.palette.forEach((rgb, i) => {
    if (state.mode === 'merge') {
      // merging: tap the colour to keep, then the one to fold into it
      const b = document.createElement('button');
      b.style.background = hex(rgb);
      b.setAttribute('aria-label', t('sw.aria', { n: i + 1 }));
      b.addEventListener('click', () => {
        if (first < 0) { first = i; b.classList.add('picked'); return; }
        if (first !== i) {
          pushUndo();
          state.merges.push([state.design.palette[first].slice(), rgb.slice()]);
        }
        setMode(null);
        process();
      });
      box.append(b);
      return;
    }
    const label = document.createElement('label');
    label.style.background = hex(rgb);
    label.title = t('sw.title');
    const input = document.createElement('input');
    input.type = 'color';
    input.value = hex(rgb);
    input.setAttribute('aria-label', t('sw.aria', { n: i + 1 }));
    input.addEventListener('input', () => {
      const v = input.value;
      state.design.palette[i] = [1, 3, 5].map((o) => parseInt(v.slice(o, o + 2), 16));
      state.sig = state.design.palette.map(hex).join();
      label.style.background = v;
      drawPreview();
      scheduleStitch();
    });
    label.append(input);
    box.append(label);
  });
}

// ---------- picture tools: erase, turn, flip, crop, merge ----------

function setMode(mode) {
  state.mode = mode;
  $('#crop').setAttribute('aria-pressed', mode === 'crop');
  $('#merge').setAttribute('aria-pressed', mode === 'merge');
  $('#stage').classList.toggle('cropping', mode === 'crop');
  $('#crop-box').hidden = true;
  $('#hint').textContent = t(mode === 'crop' ? 's2.cropHint' : mode === 'merge' ? 's2.mergeHint' : 's2.tap');
  if (state.design) drawSwatches();
}
$('#crop').addEventListener('click', () => setMode(state.mode === 'crop' ? null : 'crop'));
$('#merge').addEventListener('click', () => setMode(state.mode === 'merge' ? null : 'merge'));

function replaceSource(img) {
  // the picture itself changed shape, so the original SVG no longer matches it
  state.src = { data: img.data, width: img.w, height: img.h };
  state.erased = img.mask || new Uint8Array(img.w * img.h);
  state.svgText = null;
  $('#dl-original-wrap').hidden = true;
  process();
}
for (const [id, kind] of [['rot-l', 'ccw'], ['rot-r', 'cw'], ['flip-h', 'fliph'], ['flip-v', 'flipv']]) {
  $('#' + id).addEventListener('click', () => {
    pushUndo();
    setMode(null);
    replaceSource(transformImage(state.src.data, state.src.width, state.src.height, state.erased, kind));
  });
}

let suppressTap = false;
$('#preview').addEventListener('click', (e) => {
  if (suppressTap) { suppressTap = false; return; }
  if (state.mode) return;
  const d = state.design, c = e.currentTarget;
  const r = c.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * d.w), y = Math.floor((e.clientY - r.top) / r.height * d.h);
  if (x < 0 || y < 0 || x >= d.w || y >= d.h) return;
  const before = snapshot();
  if (!floodMark(d.labels, d.w, d.h, x, y, state.erased, state.src.width, d.x0, d.y0)) return;
  state.undo.push(before);
  if (state.undo.length > 20) state.undo.shift();
  process();
});

// crop: drag a box on the preview
let cropStart = null;
const preview = $('#preview');
const cropPoint = (e) => {
  const r = preview.getBoundingClientRect();
  return [Math.min(r.width, Math.max(0, e.clientX - r.left)), Math.min(r.height, Math.max(0, e.clientY - r.top))];
};
function drawCropBox(a, b) {
  const box = $('#crop-box'), r = preview.getBoundingClientRect(), s = $('#stage').getBoundingClientRect();
  box.hidden = false;
  box.style.left = `${r.left - s.left + Math.min(a[0], b[0])}px`;
  box.style.top = `${r.top - s.top + Math.min(a[1], b[1])}px`;
  box.style.width = `${Math.abs(a[0] - b[0])}px`;
  box.style.height = `${Math.abs(a[1] - b[1])}px`;
}
preview.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'crop') return;
  e.preventDefault();
  preview.setPointerCapture(e.pointerId);
  cropStart = cropPoint(e);
});
preview.addEventListener('pointermove', (e) => { if (cropStart) drawCropBox(cropStart, cropPoint(e)); });
preview.addEventListener('pointerup', (e) => {
  if (!cropStart) return;
  const a = cropStart, b = cropPoint(e);
  cropStart = null;
  suppressTap = true;
  setTimeout(() => { suppressTap = false; }, 300);
  const r = preview.getBoundingClientRect(), d = state.design;
  const sx = d.w / r.width, sy = d.h / r.height;
  const x0 = Math.floor(Math.min(a[0], b[0]) * sx), y0 = Math.floor(Math.min(a[1], b[1]) * sy);
  const cw = Math.min(d.w - x0, Math.ceil(Math.abs(a[0] - b[0]) * sx)), ch = Math.min(d.h - y0, Math.ceil(Math.abs(a[1] - b[1]) * sy));
  setMode(null);
  if (cw < 12 || ch < 12) return;       // a tap or a sliver: not a crop
  pushUndo();
  const cut = cropImage(state.src.data, state.src.width, state.src.height, state.erased, x0 + d.x0, y0 + d.y0, cw, ch);
  // bring the cut-out back up to working size so it traces as cleanly as a fresh picture
  const scale = Math.min(WORK / Math.max(cw, ch), 3);
  const small = document.createElement('canvas');
  small.width = cw; small.height = ch;
  small.getContext('2d').putImageData(new ImageData(cut.data, cw, ch), 0, 0);
  const big = document.createElement('canvas');
  big.width = Math.max(1, Math.round(cw * scale)); big.height = Math.max(1, Math.round(ch * scale));
  const ctx = big.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, big.width, big.height);
  replaceSource({ data: ctx.getImageData(0, 0, big.width, big.height).data, w: big.width, h: big.height });
});
preview.addEventListener('pointercancel', () => { cropStart = null; $('#crop-box').hidden = true; });

$('#undo').addEventListener('click', () => { if (state.undo.length) { restore(state.undo.pop()); setMode(null); process(); } });
$('#reset').addEventListener('click', () => {
  restore({ src: state.original.src, erased: new Uint8Array(state.original.src.width * state.original.src.height), merges: [], svgText: state.original.svgText });
  state.undo = [];
  setMode(null);
  process();
});
$('#k').addEventListener('input', (e) => { $('#k-out').textContent = e.target.value; });
$('#k').addEventListener('change', process);
$('#detail').addEventListener('input', (e) => { $('#detail-out').textContent = t('detail.' + e.target.value); });
$('#detail').addEventListener('change', process);
$('#smooth').addEventListener('input', (e) => { $('#smooth-out').textContent = t('smooth.' + e.target.value); });
$('#smooth').addEventListener('change', process);
$('#bg').addEventListener('change', process);

// ---------- downloads ----------

const fileName = (ext) => ($('#name').value.trim().replace(/[^\w-]+/g, '-') || 'design') + ext;

// On an iPad or phone the share sheet is the useful route: it can save to Files or hand the file
// straight to Design Space or Artspira, and it also works when the page runs from the Home Screen.
const TOUCH = matchMedia('(pointer: coarse)').matches;

async function download(content, name, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  if (TOUCH && navigator.canShare) {
    const file = new File([blob], name, { type: blob.type || type || 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; }
      catch (e) { if (e.name === 'AbortError') return; /* otherwise fall through to a plain download */ }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function downloadMany(files) {
  const made = files.map((f) => new File([f.content], f.name, { type: f.type }));
  if (TOUCH && navigator.canShare && navigator.canShare({ files: made })) {
    try { await navigator.share({ files: made }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  for (const f of files) { await download(f.content, f.name, f.type); await new Promise((r) => setTimeout(r, 350)); }
}

// ---------- Cricut ----------

const widthIn = () => {
  const v = Math.max(0.1, parseFloat($('#cut-width').value) || 4);
  return $('#cut-unit').value === 'cm' ? v / 2.54 : v;
};
const trim = (v) => String(Math.round(v * 100) / 100);
// The finished cut design: the colour layers plus any border, on a frame grown to fit the border.
// The whole piece, border included, keeps the width that was set.
let cutCache = null;
function cutDesign() {
  const d = state.design, mode = $('#cut-border').value, B = +$('#cut-border-width').value, T = widthIn() * 25.4;
  const key = [mode, B, T.toFixed(3)].join();
  if (cutCache && cutCache.d === d && cutCache.layersRef === state.layers && cutCache.key === key) return cutCache;
  const hasBack = mode === 'whole' || mode === 'both', hasLines = mode === 'each' || mode === 'both';
  const ext = hasBack ? B : hasLines ? B / 2 : 0;
  const pad = ext ? Math.ceil(ext * d.w / Math.max(T * 0.3, T - 2 * ext)) + 1 : 0;
  const W = d.w + 2 * pad, H = d.h + 2 * pad, pxPerMm = W / T;
  const shift = (loops) => loops.map((loop) => loop.map((p) => [p[0] + pad, p[1] + pad]));
  const layers = [], colors = [], kinds = [];
  let outer = shift(state.outer);
  if (pad) {
    const m = borderMasks(d.labels, d.w, d.h, pad, hasBack ? B * pxPerMm : 0, hasLines ? B * pxPerMm / 2 : 0);
    const opts = { detail: state.eps, minArea: state.minArea };
    if (m.back) { layers.push(traceMask(m.back, W, H, { ...opts, outerOnly: true })); colors.push($('#cut-back-color').value); kinds.push('back'); }
    state.layers.forEach((loops, i) => { layers.push(shift(loops)); colors.push(hex(d.palette[i])); kinds.push(i); });
    if (m.lines) { layers.push(traceMask(m.lines, W, H, opts)); colors.push($('#cut-line-color').value); kinds.push('lines'); }
    outer = traceMask(m.union, W, H, { ...opts, outerOnly: true });
  } else {
    state.layers.forEach((loops, i) => { layers.push(loops); colors.push(hex(d.palette[i])); kinds.push(i); });
  }
  cutCache = { d, layersRef: state.layers, key, W, H, pad, layers, colors, kinds, outer };
  return cutCache;
}
// colours can change without re-tracing
const cutColors = (c) => c.kinds.map((k, i) => k === 'back' ? $('#cut-back-color').value : k === 'lines' ? $('#cut-line-color').value : c.colors[i]);

function drawCut() {
  const d = state.design;
  if (!d || !d.w || state.machine !== 'cricut' || state.step !== 4) return;
  const c = cutDesign(), cv = $('#cut-preview'), colors = cutColors(c);
  const scale = Math.min(1, 640 / Math.max(c.W, c.H));
  cv.width = Math.round(c.W * scale); cv.height = Math.round(c.H * scale);
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.save();
  if ($('#mirror').checked) { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
  ctx.scale(scale, scale);
  c.layers.forEach((loops, i) => { ctx.fillStyle = colors[i]; ctx.fill(new Path2D(layerPath(loops))); });
  ctx.restore();
  const unit = $('#cut-unit').value, f = unit === 'cm' ? 2.54 : 1, w = widthIn() * f;
  $('#cut-stats').textContent = `${trim(w)} × ${trim(w * c.H / c.W)} ${unit === 'cm' ? 'cm' : t('c.in')} · ${t('c.layers', { n: c.layers.filter((l) => l.length).length })}`;
}

function updateCutSize() {
  const d = state.design;
  if (!d || !d.w) return;
  const c = cutDesign();
  $('#cut-height').value = trim((parseFloat($('#cut-width').value) || 4) * c.H / c.W);
  drawCut();
}
$('#cut-width').addEventListener('input', updateCutSize);
$('#cut-height').addEventListener('input', () => {
  const d = state.design, hgt = parseFloat($('#cut-height').value);
  if (!d || !d.w || !(hgt > 0)) return;
  // the border's share of the frame depends on the width, so settle it in a couple of rounds
  for (let i = 0; i < 3; i++) { const c = cutDesign(); $('#cut-width').value = trim(hgt * c.W / c.H); }
  drawCut();
});
$('#cut-unit').addEventListener('change', () => {
  $('#cut-width').value = $('#cut-unit').value === 'cm' ? 10 : 4;
  updateCutSize();
});
function borderControls() {
  const mode = $('#cut-border').value;
  $('#cut-border-opts').hidden = mode === 'none';
  $('#cut-back-wrap').hidden = !(mode === 'whole' || mode === 'both');
  $('#cut-line-wrap').hidden = !(mode === 'each' || mode === 'both');
  $('#cut-border-out').textContent = `${$('#cut-border-width').value} mm`;
}
$('#cut-border').addEventListener('change', () => { borderControls(); updateCutSize(); });
$('#cut-border-width').addEventListener('input', () => { borderControls(); updateCutSize(); });
$('#cut-back-color').addEventListener('input', drawCut);
$('#cut-line-color').addEventListener('input', drawCut);
$('#mirror').addEventListener('change', drawCut);

// iron-on is cut face down, so its files are flipped left to right
const mirrored = (layers, w) => $('#mirror').checked
  ? layers.map((loops) => loops.map((loop) => loop.map((p) => [w - p[0], p[1]]).reverse()))
  : layers;

$('#dl-svg').addEventListener('click', () => {
  const c = cutDesign();
  download(buildSvg({ layers: mirrored(c.layers, c.W), colors: cutColors(c), w: c.W, h: c.H, widthIn: widthIn(), title: $('#name').value }), fileName('.svg'), 'image/svg+xml');
});

$('#dl-each').addEventListener('click', () => {
  const c = cutDesign(), layers = mirrored(c.layers, c.W), colors = cutColors(c);
  const suffix = (k, i) => k === 'back' ? '-border' : k === 'lines' ? '-lines' : `-${k + 1}`;
  // every file keeps the full frame, so the colours line up when stacked in Design Space
  downloadMany(layers.map((loops, i) => ({
    content: buildSvg({ layers: [loops], colors: [colors[i]], w: c.W, h: c.H, widthIn: widthIn(), title: `${$('#name').value}${suffix(c.kinds[i], i)}` }),
    name: fileName(`${suffix(c.kinds[i], i)}.svg`),
    type: 'image/svg+xml',
  })).filter((_, i) => layers[i].length));
});

$('#dl-outline').addEventListener('click', () => {
  const c = cutDesign();
  download(buildSvg({ layers: mirrored([c.outer], c.W), colors: ['#000000'], w: c.W, h: c.H, widthIn: widthIn(), title: $('#name').value }), fileName('-outline.svg'), 'image/svg+xml');
});

$('#dl-png').addEventListener('click', () => {
  const d = state.design, c = cutDesign(), { data, w, h } = state.clean, colors = cutColors(c);
  const full = document.createElement('canvas');
  full.width = w; full.height = h;
  full.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  // the printed picture keeps its photo detail; the border shapes are drawn behind and over it
  const out = document.createElement('canvas');
  out.width = c.W; out.height = c.H;
  const ctx = out.getContext('2d');
  c.kinds.forEach((k, i) => { if (k === 'back') { ctx.fillStyle = colors[i]; ctx.fill(new Path2D(layerPath(c.layers[i]))); } });
  ctx.drawImage(full, c.pad - d.x0, c.pad - d.y0);
  c.kinds.forEach((k, i) => { if (k === 'lines') { ctx.fillStyle = colors[i]; ctx.fill(new Path2D(layerPath(c.layers[i]))); } });
  let final = out;
  if ($('#mirror').checked) {
    final = document.createElement('canvas');
    final.width = out.width; final.height = out.height;
    const fc = final.getContext('2d');
    fc.translate(out.width, 0);
    fc.scale(-1, 1);
    fc.drawImage(out, 0, 0);
  }
  final.toBlob((blob) => download(blob, fileName('-sticker.png')), 'image/png');
});

$('#dl-original').addEventListener('click', () => download(state.svgText, fileName('-original.svg'), 'image/svg+xml'));

// ---------- embroidery ----------

let stitchTimer = 0;
function scheduleStitch() {
  // stitches are only worked out while the embroidery step is on screen
  if (state.step !== 4 || state.machine !== 'skitch') return;
  clearTimeout(stitchTimer);
  stitchTimer = setTimeout(runStitch, 120);
}

function runStitch() {
  const d = state.design;
  if (!d || !d.w) { state.stitch = null; drawStitches(); return; }
  state.stitch = digitize(d, {
    sizeMm: +$('#size').value,
    spacingMm: +$('#density').value,
    outline: $('#outline').value,
    outlineMm: +$('#outline-width').value,
    outlineThread: +$('#outline-thread').value,
    outer: state.outer,
    angleDeg: +$('#angle').value,
    underlay: $('#underlay').checked,
    stitchMm: +$('#stitch-len').value,
    overlapMm: +$('#overlap').value,
    enabled: state.enabled,
    order: state.order,
    threads: state.picks,
    layers: state.layers,
  });
  drawStitches();
  drawThreads();
  const s = state.stitch;
  const tooMany = s.jumps > 60;
  const threads = s.blocks.length === 1 ? t('stats.thread1') : t('stats.threads', { n: s.blocks.length });
  $('#stats').innerHTML = s.stitches
    ? `${t('stats.line', { n: s.stitches.toLocaleString(), t: threads, m: s.minutes })}
       <small>${t('stats.size', { w: s.widthMm.toFixed(0), h: s.heightMm.toFixed(0) })}${tooMany ? t('stats.many') : ''}</small>`
    : t('stats.none');
  $('#dl-pes').disabled = $('#dl-dst').disabled = !s.stitches;
}

function drawStitches() {
  const c = $('#stitches'), ctx = c.getContext('2d');
  const px = c.width / 1040;          // canvas pixels per 0.1 mm, with a little margin round the hoop
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.strokeStyle = 'rgba(60,40,20,.25)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-500 * px, -500 * px, 1000 * px, 1000 * px);
  ctx.setLineDash([]);
  const s = state.stitch;
  if (!s) return;
  ctx.lineWidth = Math.max(1, 3.4 * px);
  ctx.lineCap = 'round';
  let block = 0, prev = null;
  ctx.strokeStyle = s.blocks[0] ? hex(s.blocks[0].threadRgb) : '#000';
  ctx.beginPath();
  for (const cmd of s.cmds) {
    if (cmd[2] === STITCH) {
      if (prev) ctx.lineTo(cmd[0] * px, cmd[1] * px); else ctx.moveTo(cmd[0] * px, cmd[1] * px);
      prev = cmd;
    } else {
      ctx.stroke();
      ctx.beginPath();
      prev = null;
      if (cmd[2] !== 1 && s.blocks[++block]) ctx.strokeStyle = hex(s.blocks[block].threadRgb);
    }
  }
  ctx.stroke();
}

const THREAD_OPTIONS = THREADS.map((th, i) => `<option value="${i + 1}">${i + 1} · ${th[3]}</option>`).join('');

function drawThreads() {
  const box = $('#threads');
  box.textContent = '';
  const d = state.design, s = state.stitch;
  state.order.forEach((c, pos) => {
    const block = s.blocks.find((b) => b.color === c);
    const row = document.createElement('div');
    row.className = 'thread' + (state.enabled[c] ? '' : ' off');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.enabled[c];
    cb.setAttribute('aria-label', t('th.use', { n: c + 1 }));
    cb.addEventListener('change', () => { state.enabled[c] = cb.checked; scheduleStitch(); });
    const dot = document.createElement('i');
    dot.style.background = hex(block ? block.threadRgb : d.palette[c]);
    const pick = document.createElement('select');
    pick.innerHTML = THREAD_OPTIONS;
    pick.value = block ? block.thread : state.picks[c] || nearestThread(d.palette[c]);
    pick.disabled = !state.enabled[c];
    pick.setAttribute('aria-label', t('th.pick', { n: c + 1 }));
    pick.addEventListener('change', () => { state.picks[c] = +pick.value; scheduleStitch(); });
    const n = document.createElement('span');
    n.textContent = block ? block.stitches.toLocaleString() : t('th.off');
    const move = (dir, label, glyph) => {
      const b = document.createElement('button');
      b.textContent = glyph;
      b.title = t(label);
      b.setAttribute('aria-label', t(label));
      b.disabled = pos + dir < 0 || pos + dir >= state.order.length;
      b.addEventListener('click', () => {
        [state.order[pos], state.order[pos + dir]] = [state.order[pos + dir], state.order[pos]];
        scheduleStitch();
      });
      return b;
    };
    const tap = document.createElement('label');   // a finger-sized target around the small checkbox
    tap.className = 'tap';
    tap.append(cb);
    row.append(tap, dot, pick, n, move(-1, 'th.up', '↑'), move(1, 'th.down', '↓'));
    box.append(row);
  });
  const extra = s.blocks.find((b) => b.color === -1);
  if (extra) {
    const row = document.createElement('div');
    row.className = 'thread';
    row.innerHTML = `<span></span><i style="background:${hex(extra.threadRgb)}"></i><b>${t('th.outline')} · ${extra.name}</b><span>${extra.stitches.toLocaleString()}</span>`;
    box.append(row);
  }
}

$('#size').addEventListener('input', (e) => { $('#size-out').textContent = `${e.target.value} mm`; scheduleStitch(); });
$('#density').addEventListener('change', scheduleStitch);
// outline: where it goes, how wide, which thread
$('#outline-thread').innerHTML = `<option value="0"></option>${THREAD_OPTIONS}`;
$('#outline-thread').value = '20';
function outlineControls() {
  const scope = $('#outline').value, sel = $('#outline-thread'), v = +$('#outline-width').value;
  $('#outline-opts').hidden = scope === 'none';
  sel.options[0].textContent = t('e.same');
  // around the whole design there is no single "own colour" to match
  sel.options[0].hidden = sel.options[0].disabled = scope === 'whole';
  if (scope === 'whole' && sel.value === '0') sel.value = '20';
  $('#outline-width-out').textContent = `${v} mm · ${t(v <= 0.5 ? 'e.line' : 'e.satin')}`;
  const note = $('#outline-note');
  note.hidden = !(scope === 'both' && sel.value === '0');
  note.textContent = t('e.noteBlack');
}
$('#outline').addEventListener('change', () => { outlineControls(); scheduleStitch(); });
$('#outline-thread').addEventListener('change', () => { outlineControls(); scheduleStitch(); });
$('#outline-width').addEventListener('input', () => { outlineControls(); scheduleStitch(); });
$('#angle').addEventListener('change', scheduleStitch);
$('#underlay').addEventListener('change', scheduleStitch);
$('#stitch-len').addEventListener('input', (e) => { $('#stitch-len-out').textContent = `${e.target.value} mm`; scheduleStitch(); });
$('#overlap').addEventListener('input', (e) => { $('#overlap-out').textContent = `${e.target.value} mm`; scheduleStitch(); });
$('#dl-pes').addEventListener('click', () => {
  const s = state.stitch;
  download(writePES(s.cmds, s.blocks.map((b) => b.thread), $('#name').value), fileName('.pes'), 'application/octet-stream');
});
$('#dl-dst').addEventListener('click', () => download(writeDST(state.stitch.cmds, $('#name').value), fileName('.dst'), 'application/octet-stream'));

// ---------- source: tabs, upload ----------

document.querySelectorAll('.tabs button').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((t) => t.setAttribute('aria-selected', t === tab));
  document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
  status('');
}));

$('#file').addEventListener('change', (e) => { if (e.target.files[0]) useFile(e.target.files[0]); e.target.value = ''; });
const drop = $('#drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  if (e.dataTransfer.files[0]) useFile(e.dataTransfer.files[0]);
});

// ---------- source: text ----------

$('#text-go').addEventListener('click', async () => {
  const text = $('#text-input').value.trim();
  if (!text) { status(t('err.words'), true); return; }
  const font = $('#text-font').value;
  const size = 220;
  const spec = `700 ${size}px "${font}"`;
  try { await document.fonts.load(spec, text); } catch { /* falls back to a system font */ }
  const lines = text.split('\n');
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  ctx.font = spec;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const lineH = size * 1.2, pad = size * 0.5;
  c.width = Math.ceil(Math.max(...widths) + pad * 2);
  c.height = Math.ceil(lines.length * lineH + pad * 2);
  ctx = c.getContext('2d');
  ctx.font = spec;
  ctx.fillStyle = $('#text-color').value;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, pad + lineH * (i + 0.5)));
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  setSource(await blobToImageData(blob, 1), { name: lines[0], colors: 1 });
  status('');
});

// ---------- wizard ----------

const canReach = (n) => n === 1 || (n === 2 && state.machine) || (n >= 3 && state.machine && state.design && state.design.w > 0);

function go(n) {
  if (!canReach(n)) return;
  state.step = n;
  document.querySelectorAll('[data-step]').forEach((el) => {
    el.hidden = +el.dataset.step !== n || (el.dataset.for && el.dataset.for !== state.machine);
  });
  document.querySelectorAll('.stepper button').forEach((b) => {
    const s = +b.dataset.go;
    b.disabled = !canReach(s);
    b.classList.toggle('done', s < n);
    if (s === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  $('#back').hidden = n === 1;
  $('#next').hidden = !(n === 3 || (n === 2 && canReach(3)));
  const also = $('#also');
  also.hidden = n !== 4;
  also.textContent = t(state.machine === 'cricut' ? 'w.alsoSkitch' : 'w.alsoCricut');
  status('');
  if (n !== 3) setMode(null);
  if (n === 4 && state.machine === 'skitch') runStitch();
  if (n === 4 && state.machine === 'cricut') drawCut();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => go(+b.dataset.go)));
document.querySelectorAll('[data-machine]').forEach((b) => b.addEventListener('click', () => {
  state.machine = b.dataset.machine;
  document.querySelectorAll('[data-machine]').forEach((o) => o.setAttribute('aria-pressed', o === b));
  go(canReach(3) ? 3 : 2);
}));
$('#back').addEventListener('click', () => go(state.step - 1));
$('#next').addEventListener('click', () => go(state.step + 1));
$('#also').addEventListener('click', () => { state.machine = state.machine === 'cricut' ? 'skitch' : 'cricut'; go(4); });

// ---------- language ----------

function refreshText() {
  $('#detail-out').textContent = t('detail.' + $('#detail').value);
  $('#smooth-out').textContent = t('smooth.' + $('#smooth').value);
  status('');
  setMode(state.mode);
  outlineControls();
  borderControls();
  go(state.step);
}
onLangChange(refreshText);
initLang();
$('#text-input').value = t('tx.sample');
refreshText();
