const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
if (!touch && !reduced) root.classList.add('has-cursor');
$('#year').textContent = new Date().getFullYear();

/* Rolling hover text: the visible word plus a hidden duplicate beneath it. */
$$('[data-roll]').forEach((el) => {
  const text = el.textContent;
  el.textContent = '';
  const wrap = document.createElement('span');
  wrap.className = 'roll';
  const a = document.createElement('span');
  const b = document.createElement('span');
  a.textContent = b.textContent = text;
  b.setAttribute('aria-hidden', 'true');
  wrap.append(a, b);
  el.append(wrap);
});

/* Lines slide up as they come into view. */
const reveals = $$('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting && root.classList.contains('ready')) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.02 });

/* Scroll → position in the sequence. */
const sections = $$('[data-stage]');
const indexNow = $('#index-now');
let anchors = [];
function measure() {
  const max = root.scrollHeight - innerHeight;
  anchors = sections.map((s) => Math.min(s.getBoundingClientRect().top + scrollY, max));
}
function stageAt(y) {
  for (let i = anchors.length - 2; i >= 0; i--) {
    if (y >= anchors[i]) return Math.min(i + (y - anchors[i]) / Math.max(anchors[i + 1] - anchors[i], 1), anchors.length - 1);
  }
  return 0;
}

/* Cursor */
const cursor = $('#cursor');
const ptr = { x: innerWidth / 2, y: innerHeight / 2, sx: innerWidth / 2, sy: innerHeight / 2 };
document.addEventListener('pointerover', (e) => cursor.classList.toggle('on', !!e.target.closest?.('a')));

let world = null;
let last = performance.now();

/* Theme: the device setting, unless the visitor picked one with the switch. */
const themeBtn = $('#theme');
const sysLight = matchMedia('(prefers-color-scheme: light)');
const isLight = () => (root.dataset.theme || (sysLight.matches ? 'light' : 'dark')) === 'light';
function applyTheme(instant) {
  const light = isLight();
  themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  // Browser chrome follows the page, not just the device.
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', light ? '#efe9df' : '#08090b'));
  world?.setLight(light, instant);
}
themeBtn.addEventListener('click', () => {
  const next = isLight() ? 'dark' : 'light';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) { /* private mode: still switches for this visit */ }
  applyTheme(reduced);
});
sysLight.addEventListener('change', () => { if (!root.dataset.theme) applyTheme(reduced); });
applyTheme(true);
let prevY = scrollY, stage = 0, vel = 0, first = true, lastIndex = -1;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const y = scrollY;
  const inst = (y - prevY) / Math.max(innerHeight, 1) / Math.max(dt, 0.008);
  prevY = y;
  vel = damp(vel, clamp(inst * 0.3, -1.4, 1.4), 7, dt);

  const target = stageAt(y);
  stage = first || reduced ? target : damp(stage, target, 5, dt);
  first = false;

  const idx = Math.round(stage);
  if (idx !== lastIndex) {
    lastIndex = idx;
    indexNow.textContent = String(idx).padStart(2, '0');
  }

  if (world) {
    world.update(dt, stage, vel);
  }

  ptr.sx = damp(ptr.sx, ptr.x, 24, dt);
  ptr.sy = damp(ptr.sy, ptr.y, 24, dt);
  cursor.style.transform = `translate3d(${ptr.sx.toFixed(1)}px,${ptr.sy.toFixed(1)}px,0)`;
  requestAnimationFrame(frame);
}

async function boot() {
  const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

  // The words never wait for the particles, only briefly for their typeface.
  await Promise.race([document.fonts?.ready, timeout(600)]).catch(() => {});
  measure();
  root.classList.add('ready');
  reveals.forEach((el) => io.observe(el));
  requestAnimationFrame((n) => { last = n; frame(n); });

  addEventListener('resize', () => { world?.resize(); measure(); });
  addEventListener('pointermove', (e) => {
    ptr.x = e.clientX; ptr.y = e.clientY;
    if (!world || touch) return;
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = -(e.clientY / innerHeight) * 2 + 1;
    world.setPointer(nx, ny);
  }, { passive: true });
  addEventListener('click', (e) => {
    if (!world || e.target.closest('a, button')) return;
    world.poke((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  });

  // The code wall is drawn in this face; a fallback font still works if it's slow.
  await Promise.race([document.fonts?.load?.("42px 'Geist Mono'"), timeout(1500)]).catch(() => {});

  try {
    const { World } = await import('./world.js');
    const w = new World($('#gl'), { reduced, touch });    w.setLight(isLight(), true);
    await w.load();
    world = w;
  } catch (e) {
    console.warn('WebGL off, showing the static version:', e);
    root.classList.add('no-gl');
    root.classList.remove('has-cursor');
    measure();
  }
}

boot();
