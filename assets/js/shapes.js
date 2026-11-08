// Every shape is the same N particles arranged differently: Float32Array(N * 4)
// holding x, y, z and brightness. Shapes are centred on the origin at roughly
// unit size; world.js places and scales them for the current screen.

const TAU = Math.PI * 2;
const R = Math.random;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* Rows on the water, fitted to the view: they read as fine swell lines, not a grid. */
export function sea(n) {
  const a = new Float32Array(n * 4);
  const side = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const u = (i % side + R()) / side, v = Math.floor(i / side) / side;
    const z = 4.5 - Math.pow(v, 1.6) * 88;
    const span = (10.5 - z) * 1.25;
    a[i * 4] = (u - 0.5) * 2 * span;
    a[i * 4 + 1] = -1.55;
    a[i * 4 + 2] = z;
    a[i * 4 + 3] = 0.45 + R() * 0.55;
  }
  return a;
}

/* A hollow, peeling wave. Axis along X. */
export function wave(n) {
  const a = new Float32Array(n * 4);
  const STRANDS = 64;
  for (let i = 0; i < n; i++) {
    let x, y, z, l;
    x = R() * 7 - 3.5;
    const peel = smooth(-1.9, 2.7, x);            // 0 in the tube, 1 on the shoulder
    const maxTheta = TAU * (0.86 - 0.6 * peel);
    const Rad = 1.08 - 0.34 * peel;
    const pick = R();
    if (pick < 0.2) {
      // Flat water running out in front of the wave.
      const row = Math.floor(R() * 38);
      const t = Math.pow((row + 0.5) / 38, 1.4);
      y = -Rad - 0.01 + 0.012 * Math.sin(x * 3 + row);
      z = t * 4.5;
      l = 0.1 + (1 - t) * 0.34;
    } else if (pick < 0.3) {
      // Back of the wave.
      const t = R();
      y = Rad * 0.2 - t * 1.0 + Rad * (1 - t) * 0.7;
      z = -Rad - t * 3.6;
      l = 0.1;
    } else {
      // Spiral cross-section, thinning as it throws over.
      // Fine strands running along the wave, so it reads as moving water rather than noise.
      const strand = Math.floor(Math.pow(R(), 0.72) * STRANDS);
      const u = (strand + 0.5 + (R() - 0.5) * 0.16) / STRANDS;
      const theta = u * maxTheta + 0.018 * Math.sin(x * 2.3 + strand * 0.9);
      const r = Rad * (1 - 0.13 * (theta / Math.PI));
      const c = 0.1 + 0.05 * Math.sin(theta * 3 + x * 2);
      y = -r * Math.cos(theta);
      z = -r * Math.sin(theta) + c * 0.2;
      const lip = smooth(0.82, 1, u);
      l = 0.26 + 0.42 * Math.pow(Math.sin(strand * 12.9898) * 0.5 + 0.5, 3) + lip * 0.6;
      if (lip > 0.5 && R() < 0.22) {
        // Spray off the lip.
        y += (R() - 0.5) * 0.3 + R() * 0.1;
        z += (R() - 0.2) * 0.38;
        l *= 0.7;
      }
    }
    x += (R() - 0.5) * 0.03;
    a[i * 4] = x; a[i * 4 + 1] = y; a[i * 4 + 2] = z; a[i * 4 + 3] = l;
  }
  return a;
}

/* A margherita of radius 1, top facing +Y: raised rim, sauce, pools of mozzarella, basil. */
export function pizza(n) {
  const a = new Float32Array(n * 4);
  const blobs = [];
  for (let i = 0; i < 15; i++) {
    const ang = (i / 15) * TAU * 3.3 + R() * 0.4, rr = 0.1 + 0.68 * Math.sqrt((i + 0.5) / 15);
    blobs.push([Math.cos(ang) * rr, Math.sin(ang) * rr, 0.06 + R() * 0.09, R() * 6]);
  }
  const basil = [0.5, 1.85, 3.15, 4.4, 5.6].map((t, i) => [Math.cos(t) * (0.32 + (i % 2) * 0.2), Math.sin(t) * (0.32 + (i % 2) * 0.2), t * 1.7]);
  for (let i = 0; i < n; i++) {
    let x, y, z, l;
    if (i % 3 === 0) {
      // Cornicione: a blistered torus.
      const t = R() * TAU, p = R() * TAU;
      const lump = 1 + 0.2 * Math.sin(t * 7 + 1) * Math.sin(t * 13);
      const rt = 0.055 * lump + 0.012 * R();
      const rr = (0.925 + 0.012 * Math.sin(t * 3)) + Math.cos(p) * rt;
      x = Math.cos(t) * rr;
      z = Math.sin(t) * rr;
      y = 0.05 + Math.abs(Math.sin(p)) * rt * 1.25;
      const char = Math.sin(t * 23 + 2) * Math.sin(t * 41 + p * 3);
      l = char > 0.5 ? 0.12 : 0.62 + R() * 0.25;
    } else {
      const rr = Math.sqrt(R()) * 0.87, t = R() * TAU;
      x = Math.cos(t) * rr;
      z = Math.sin(t) * rr;
      if (R() < 0.3) {
        // Extra density in the cheese, so it melts together rather than looking like gravel.
        const [bx, bz, br] = blobs[(R() * blobs.length) | 0];
        const q = Math.sqrt(R()) * br * 1.1, w = R() * TAU;
        x = bx + Math.cos(w) * q; z = bz + Math.sin(w) * q;
      }
      y = 0.02;
      l = 0.2 + 0.08 * Math.sin(x * 9 + z * 5) * Math.sin(z * 8 - x * 3) + R() * 0.08; // sauce
      for (const [bx, bz, br, seed] of blobs) {
        const reach = br * 1.45;
        if (Math.abs(x - bx) > reach || Math.abs(z - bz) > reach) continue;
        const th = Math.atan2(z - bz, x - bx);
        const d = Math.hypot(x - bx, z - bz) * (1 + 0.24 * Math.sin(th * 2 + seed) + 0.14 * Math.sin(th * 5 + seed * 2));
        if (d < br) {
          l = 0.42 + 0.56 * smooth(1, 0.55, d / br);
          y = 0.02 + 0.03 * Math.sqrt(Math.max(0, 1 - (d / br) ** 2));
          break;
        }
      }
      for (const [bx, bz, ang] of basil) {
        const qx = x - bx, qz = z - bz, c = Math.cos(ang), s = Math.sin(ang);
        const u = (c * qx - s * qz) / 0.125, v = (s * qx + c * qz) / 0.07;
        if (Math.abs(u) < 1 && Math.abs(v) < Math.pow(1 - u * u, 1.15)) { l = Math.abs(v) < 0.1 ? -0.95 : -0.5; y = 0.06; break; }
      }
    }
    a[i * 4] = x; a[i * 4 + 1] = y; a[i * 4 + 2] = z; a[i * 4 + 3] = l;
  }
  return a;
}

/* Sample n points from dark-on-white canvas ink, returning the pixels' normalised positions. */
function inkPoints(canvas, n, each) {
  const { width: W, height: H } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const list = [];
  for (let i = 0; i < W * H; i++) if (d[i * 4] < 128) list.push(i);
  for (let k = 0; k < n; k++) {
    const i = list[(R() * list.length) | 0];
    each(k, (i % W + R()) / W, (Math.floor(i / W) + R()) / H);
  }
}

// From Marco's LinkedIn profile.
const CODE = [
  'const marco = {',
  '  role: "Senior Software leader",',
  '  team: "Mercari, Tokyo",',
  '  years: "nearly 20",',
  '  career: [',
  '    "Mercari, 2020",',
  '    "Georg Fischer, 2018",',
  '    "Autodesk, 2015",',
  '    "IBM, 2008",',
  '  ],',
  '  speaks: ["it", "en", "fr"],',
  '  studied: "Computer Eng., Roma Tre",',
  '};',
];
export const CODE_LINES = CODE.length;

/* A wall of code on a gentle curve. */
export function code(n) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 960;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1200, 960);
  x.fillStyle = '#000';
  x.font = "500 44px 'Geist Mono', Menlo, monospace";
  CODE.forEach((l, i) => x.fillText(l, 30, 64 + i * 60));
  const a = new Float32Array(n * 4);
  inkPoints(c, n, (k, u, v) => {
    const ang = (u - 0.5) * 1.0;
    a[k * 4] = Math.sin(ang) * 1.3;
    a[k * 4 + 1] = (0.5 - v) * 1.04;
    a[k * 4 + 2] = (Math.cos(ang) - 1) * 1.3;
    a[k * 4 + 3] = 0.55 + R() * 0.3;
  });
  return a;
}
