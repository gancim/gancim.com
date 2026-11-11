// Embroidery file writers: Brother PES (v1, with PEC block) and Tajima DST.
// The byte layouts follow pyembroidery's PesWriter / PecWriter / DstWriter (MIT, EmbroidePy).
// Coordinates are integers in 0.1 mm, y pointing down. A design is a list of [x, y, command].

export const STITCH = 0, JUMP = 1, COLOR = 2, END = 3;

// Brother's 64 built-in thread colours. A PES file refers to them by position (1-based).
export const THREADS = [[14,31,124,"Prussian Blue"],[10,85,163,"Blue"],[0,135,119,"Teal Green"],[75,107,175,"Cornflower Blue"],[237,23,31,"Red"],[209,92,0,"Reddish Brown"],[145,54,151,"Magenta"],[228,154,203,"Light Lilac"],[145,95,172,"Lilac"],[158,214,125,"Mint Green"],[232,169,0,"Deep Gold"],[254,186,53,"Orange"],[255,255,0,"Yellow"],[112,188,31,"Lime Green"],[186,152,0,"Brass"],[168,168,168,"Silver"],[125,111,0,"Russet Brown"],[255,255,179,"Cream Brown"],[79,85,86,"Pewter"],[0,0,0,"Black"],[11,61,145,"Ultramarine"],[119,1,118,"Royal Purple"],[41,49,51,"Dark Gray"],[42,19,1,"Dark Brown"],[246,74,138,"Deep Rose"],[178,118,36,"Light Brown"],[252,187,197,"Salmon Pink"],[254,55,15,"Vermilion"],[240,240,240,"White"],[106,28,138,"Violet"],[168,221,196,"Seacrest"],[37,132,187,"Sky Blue"],[254,179,67,"Pumpkin"],[255,243,107,"Cream Yellow"],[208,166,96,"Khaki"],[209,84,0,"Clay Brown"],[102,186,73,"Leaf Green"],[19,74,70,"Peacock Blue"],[135,135,135,"Gray"],[216,204,198,"Warm Gray"],[67,86,7,"Dark Olive"],[253,217,222,"Flesh Pink"],[249,147,188,"Pink"],[0,56,34,"Deep Green"],[178,175,212,"Lavender"],[104,106,176,"Wisteria Violet"],[239,227,185,"Beige"],[247,56,102,"Carmine"],[181,75,100,"Amber Red"],[19,43,26,"Olive Green"],[199,1,86,"Dark Fuchsia"],[254,158,50,"Tangerine"],[168,222,235,"Light Blue"],[0,103,62,"Emerald Green"],[78,41,144,"Purple"],[47,126,32,"Moss Green"],[255,204,204,"Flesh Pink"],[255,217,17,"Harvest Gold"],[9,91,166,"Electric Blue"],[240,249,112,"Lemon Yellow"],[227,243,91,"Fresh Green"],[255,153,0,"Orange"],[255,240,141,"Cream Yellow"]];

// The closest Brother thread to an RGB colour, skipping any already taken (1-based index).
export function nearestThread(rgb, taken = new Set()) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < THREADS.length; i++) {
    if (taken.has(i + 1)) continue;
    const t = THREADS[i];
    const rm = (rgb[0] + t[0]) / 2;
    const dr = rgb[0] - t[0], dg = rgb[1] - t[1], db = rgb[2] - t[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) { bestD = d; best = i + 1; }
  }
  return best;
}

class Bytes {
  constructor() { this.b = []; }
  get pos() { return this.b.length; }
  u8(v) { this.b.push(v & 255); }
  u16(v) { this.b.push(v & 255, (v >> 8) & 255); }
  u24(v) { this.b.push(v & 255, (v >> 8) & 255, (v >> 16) & 255); }
  u32(v) { this.b.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255); }
  f32(v) { const d = new DataView(new ArrayBuffer(4)); d.setFloat32(0, v, true); for (let i = 0; i < 4; i++) this.b.push(d.getUint8(i)); }
  str(s) { for (let i = 0; i < s.length; i++) this.b.push(s.charCodeAt(i) & 127); }
  raw(a) { for (let i = 0; i < a.length; i++) this.b.push(a[i]); }
  fill(v, n) { for (let i = 0; i < n; i++) this.b.push(v); }
  patch(at, bytes) { for (let i = 0; i < bytes.length; i++) this.b[at + i] = bytes[i]; }
  done() { return new Uint8Array(this.b); }
}

function bounds(cmds) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cmds) {
    if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0];
    if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1];
  }
  if (!cmds.length) return [0, 0, 0, 0];
  return [x0, y0, x1, y1];
}

const safeName = (name) => (name || 'design').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 8) || 'design';

// ---------- PES ----------

// cmds: [x, y, command]; threads: one Brother thread index (1..64) per colour block.
export function writePES(cmds, threads, name) {
  const f = new Bytes();
  const ext = bounds(cmds);
  const cx = (ext[2] + ext[0]) / 2, cy = (ext[3] + ext[1]) / 2;
  const left = ext[0] - cx, top = ext[1] - cy, right = ext[2] - cx, bottom = ext[3] - cy;

  f.str('#PES0001');
  const pecPointer = f.pos;
  f.u32(0);
  f.u16(1); f.u16(1); f.u16(1);
  f.u16(0xFFFF); f.u16(0);

  // CEmbOne block
  f.u16(7); f.str('CEmbOne');
  const width = right - left, height = bottom - top;
  f.fill(0, 16);
  f.f32(1); f.f32(0); f.f32(0); f.f32(1);
  f.f32(350 + 1300 / 2 - width / 2);
  f.f32(100 + height + 1800 / 2 - height / 2);
  f.u16(1); f.u16(0); f.u16(0);
  f.u16(Math.trunc(width)); f.u16(Math.trunc(height));
  f.fill(0, 8);
  const sectionCountAt = f.pos;
  f.u16(0);
  f.u16(0xFFFF); f.u16(0);

  // CSewSeg block
  f.u16(7); f.str('CSewSeg');
  const ax = left + cx, ay = bottom + cy;
  let section = 0, prevColor = -1, started = false;
  const colorLog = [];
  let colorIdx = 0, colorCode = threads[0] ?? 20;
  let sx = 0, sy = 0;
  let i = 0;
  while (i < cmds.length) {
    const cmd = cmds[i][2];
    let j = i;
    while (j < cmds.length && cmds[j][2] === cmd) j++;
    let seg = null, flag = 0;
    if (cmd === JUMP) {
      const last = cmds[j - 1];
      seg = [[sx - ax, sy - ay], [last[0] - ax, last[1] - ay]];
      flag = 1;
    } else if (cmd === COLOR) {
      colorIdx += j - i;
      colorCode = threads[colorIdx] ?? 20;
    } else if (cmd === STITCH) {
      seg = [];
      for (let k = i; k < j; k++) { sx = cmds[k][0]; sy = cmds[k][1]; seg.push([sx - ax, sy - ay]); }
    }
    i = j;
    if (!seg) continue;
    if (started) f.u16(0x8003);
    started = true;
    if (prevColor !== colorCode) { colorLog.push([section, colorCode]); prevColor = colorCode; }
    f.u16(flag); f.u16(colorCode); f.u16(seg.length);
    for (const p of seg) { f.u16(Math.trunc(p[0])); f.u16(Math.trunc(p[1])); }
    section++;
  }
  f.u16(colorLog.length);
  for (const l of colorLog) { f.u16(l[0]); f.u16(l[1]); }
  f.patch(sectionCountAt, [section & 255, (section >> 8) & 255]);
  f.u16(0); f.u16(0);

  const at = f.pos;
  f.patch(pecPointer, [at & 255, (at >> 8) & 255, (at >> 16) & 255, (at >>> 24) & 255]);
  writePEC(f, cmds, threads, name, ext);
  return f.done();
}

const PEC_BLANK = [0,0,0,0,0,0,240,255,255,255,255,15,8,0,0,0,0,16,4,0,0,0,0,32,
  ...Array.from({ length: 30 }, () => [2,0,0,0,0,64]).flat(),
  4,0,0,0,0,32,8,0,0,0,0,16,240,255,255,255,255,15,0,0,0,0,0,0];

function writePEC(f, cmds, threads, name, ext) {
  f.str('LA:' + safeName(name).padEnd(16, ' ') + '\r');
  f.fill(0x20, 12); f.u8(0xFF); f.u8(0x00);
  f.u8(6); f.u8(38);
  const count = threads.length;
  f.fill(0x20, 12);
  f.u8(count - 1);
  for (const t of threads) f.u8(t);
  f.fill(0x20, 463 - count);

  // stitch block
  const start = f.pos;
  f.u8(0); f.u8(0);
  f.u24(0);
  f.u8(0x31); f.u8(0xFF); f.u8(0xF0);
  f.u16(Math.round(ext[2] - ext[0])); f.u16(Math.round(ext[3] - ext[1]));
  f.u16(0x1E0); f.u16(0x1B0);
  pecEncode(f, cmds);
  const len = f.pos - start;
  f.patch(start + 2, [len & 255, (len >> 8) & 255, (len >> 16) & 255]);

  // thumbnails: one of the whole design, then one per colour
  const all = PEC_BLANK.slice();
  drawScaled(ext, cmds.filter((c) => c[2] === STITCH), all, 4);
  f.raw(all);
  let block = [];
  const flush = () => { const g = PEC_BLANK.slice(); drawScaled(ext, block, g, 5); f.raw(g); block = []; };
  for (const c of cmds) {
    if (c[2] === STITCH) block.push(c);
    else if (c[2] === COLOR) flush();
  }
  flush();
}

function pecValue(f, value, long, flag) {
  if (!long && value > -64 && value < 63) { f.u8(value & 0x7F); return; }
  value &= 0x0FFF;
  value |= 0x8000;
  value |= flag << 8;
  f.u8((value >> 8) & 255); f.u8(value & 255);
}

function pecEncode(f, cmds) {
  let colorTwo = true, jumping = true, init = true, xx = 0, yy = 0;
  for (const c of cmds) {
    const dx = Math.round(c[0] - xx), dy = Math.round(c[1] - yy);
    xx += dx; yy += dy;
    if (c[2] === STITCH) {
      if (jumping) {
        if (dx !== 0 && dy !== 0) { pecValue(f, 0, false, 0); pecValue(f, 0, false, 0); }
        jumping = false;
      }
      pecValue(f, dx, false, 0); pecValue(f, dy, false, 0);
    } else if (c[2] === JUMP) {
      jumping = true;
      const flag = init ? 0x10 : 0x20;
      pecValue(f, dx, true, flag); pecValue(f, dy, true, flag);
    } else if (c[2] === COLOR) {
      if (jumping) { pecValue(f, 0, false, 0); pecValue(f, 0, false, 0); jumping = false; }
      f.u8(0xFE); f.u8(0xB0); f.u8(colorTwo ? 2 : 1);
      colorTwo = !colorTwo;
    } else if (c[2] === END) {
      f.u8(0xFF);
      break;
    }
    init = false;
  }
}

function drawScaled(ext, pts, g, buffer) {
  const stride = 6, gw = 48, gh = 38;
  const dw = (ext[2] - ext[0]) || 1, dh = (ext[3] - ext[1]) || 1;
  const scale = Math.min((gw - buffer) / dw, (gh - buffer) / dh);
  const tx = -((ext[2] + ext[0]) / 2) * scale + gw / 2;
  const ty = -((ext[3] + ext[1]) / 2) * scale + gh / 2;
  for (const p of pts) {
    const x = Math.floor(p[0] * scale + tx), y = Math.floor(p[1] * scale + ty);
    if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
    g[y * stride + (x >> 3)] |= 1 << (x % 8);
  }
}

// ---------- DST ----------

function dstRecord(x, y, cmd) {
  y = -y;
  let b0 = 0, b1 = 0, b2 = 0;
  if (cmd === COLOR) return [0, 0, 0b11000011];
  if (cmd === END) return [0, 0, 0b11110011];
  if (cmd === JUMP) b2 |= 0x80;
  b2 |= 3;
  if (x > 40) { b2 |= 4; x -= 81; } if (x < -40) { b2 |= 8; x += 81; }
  if (x > 13) { b1 |= 4; x -= 27; } if (x < -13) { b1 |= 8; x += 27; }
  if (x > 4) { b0 |= 4; x -= 9; } if (x < -4) { b0 |= 8; x += 9; }
  if (x > 1) { b1 |= 1; x -= 3; } if (x < -1) { b1 |= 2; x += 3; }
  if (x > 0) { b0 |= 1; x -= 1; } if (x < 0) { b0 |= 2; x += 1; }
  if (y > 40) { b2 |= 32; y -= 81; } if (y < -40) { b2 |= 16; y += 81; }
  if (y > 13) { b1 |= 32; y -= 27; } if (y < -13) { b1 |= 16; y += 27; }
  if (y > 4) { b0 |= 32; y -= 9; } if (y < -4) { b0 |= 16; y += 9; }
  if (y > 1) { b1 |= 128; y -= 3; } if (y < -1) { b1 |= 64; y += 3; }
  if (y > 0) { b0 |= 128; y -= 1; } if (y < 0) { b0 |= 64; y += 1; }
  return [b0, b1, b2];
}

export function writeDST(cmds, name) {
  const body = new Bytes();
  let xx = 0, yy = 0, stitches = 0, colors = 0;
  for (const c of cmds) {
    if (c[2] === COLOR) { body.raw(dstRecord(0, 0, COLOR)); colors++; continue; }
    if (c[2] === END) { body.raw(dstRecord(0, 0, END)); break; }
    let dx = Math.round(c[0] - xx), dy = Math.round(c[1] - yy);
    xx += dx; yy += dy;
    // one record moves at most 12.1 mm, so long moves are split
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 121));
    for (let s = 0; s < steps; s++) {
      const px = Math.round(dx * (s + 1) / steps) - Math.round(dx * s / steps);
      const py = Math.round(dy * (s + 1) / steps) - Math.round(dy * s / steps);
      const last = s === steps - 1;
      body.raw(dstRecord(px, py, c[2] === STITCH && last ? STITCH : JUMP));
    }
    if (c[2] === STITCH) stitches++;
  }
  const ext = bounds(cmds);
  const f = new Bytes();
  const num = (v, n) => String(Math.abs(Math.trunc(v))).padStart(n, ' ');
  const signed = (v) => (v >= 0 ? '+' : '-') + num(v, 5);
  f.str('LA:' + safeName(name).padEnd(16, ' ') + '\r');
  f.str('ST:' + num(stitches, 7) + '\r');
  f.str('CO:' + num(colors, 3) + '\r');
  f.str('+X:' + num(ext[2], 5) + '\r');
  f.str('-X:' + num(ext[0], 5) + '\r');
  f.str('+Y:' + num(ext[3], 5) + '\r');
  f.str('-Y:' + num(ext[1], 5) + '\r');
  f.str('AX:' + signed(xx) + '\r');
  f.str('AY:' + signed(-yy) + '\r');
  f.str('MX:' + signed(0) + '\r');
  f.str('MY:' + signed(0) + '\r');
  f.str('PD:******\r');
  f.u8(0x1A);
  f.fill(0x20, 512 - f.pos);
  f.raw(body.b);
  return f.done();
}
