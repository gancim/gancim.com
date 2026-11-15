'use strict';
/* Guardaroba di famiglia: one state object, saved in localStorage, rendered with plain template strings. */

// ---------- catalogue ----------
// slot = where the piece goes in an outfit; wears = how many times it is worn before it goes in the basket;
// a / k = default target for an adult / a kid.
const CATS = [
  { id: 'tshirt',     n: 'Magliette',            one: 'Maglietta',        e: '👕', slot: 'top',    wears: 1,  a: 10, k: 12 },
  { id: 'longsleeve', n: 'Maglie a manica lunga', one: 'Maglia lunga',     e: '👚', slot: 'top',    wears: 1,  a: 5,  k: 6 },
  { id: 'shirt',      n: 'Camicie',              one: 'Camicia',          e: '👔', slot: 'top',    wears: 1,  a: 4,  k: 2 },
  { id: 'sweatshirt', n: 'Felpe',                one: 'Felpa',            e: '🎽', slot: 'mid',    wears: 3,  a: 3,  k: 5 },
  { id: 'sweater',    n: 'Maglioni',             one: 'Maglione',         e: '🧶', slot: 'mid',    wears: 4,  a: 4,  k: 3, delicate: true },
  { id: 'pants',      n: 'Pantaloni',            one: 'Pantaloni',        e: '👖', slot: 'bottom', wears: 3,  a: 4,  k: 6 },
  { id: 'jeans',      n: 'Jeans',                one: 'Jeans',            e: '👖', slot: 'bottom', wears: 5,  a: 3,  k: 2 },
  { id: 'shorts',     n: 'Pantaloncini',         one: 'Pantaloncini',     e: '🩳', slot: 'bottom', wears: 2,  a: 4,  k: 6 },
  { id: 'skirt',      n: 'Gonne e vestiti',      one: 'Gonna o vestito',  e: '👗', slot: 'bottom', wears: 2,  a: 0,  k: 0 },
  { id: 'jacket',     n: 'Giacche leggere',      one: 'Giacca',           e: '🧥', slot: 'outer',  wears: 20, a: 1,  k: 1 },
  { id: 'coat',       n: 'Cappotti e piumini',   one: 'Cappotto',         e: '🧥', slot: 'outer',  wears: 40, a: 1,  k: 1 },
  { id: 'rain',       n: 'Impermeabili',         one: 'Impermeabile',     e: '☔', slot: 'outer',  wears: 30, a: 1,  k: 1 },
  { id: 'hat',        n: 'Sciarpe e cappelli',   one: 'Sciarpa e cappello', e: '🧣', slot: 'acc',  wears: 30, a: 1,  k: 1, delicate: true },
  { id: 'under',      n: 'Intimo',               one: 'Intimo',           e: '🩲', slot: 'under',  wears: 1,  a: 14, k: 14 },
  { id: 'socks',      n: 'Calzini',              one: 'Calzini',          e: '🧦', slot: 'socks',  wears: 1,  a: 14, k: 14 },
  { id: 'pajama',     n: 'Pigiami',              one: 'Pigiama',          e: '🌙', slot: 'night',  wears: 4,  a: 3,  k: 4 },
  { id: 'sport',      n: 'Abbigliamento sportivo', one: 'Tuta sportiva',  e: '⚽', slot: 'extra',  wears: 1,  a: 2,  k: 3 },
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

// g = wash group
const COLORS = [
  { id: 'white',  n: 'Bianco',        bg: '#ffffff', g: 'white' },
  { id: 'cream',  n: 'Panna',         bg: '#ece2cc', g: 'light' },
  { id: 'lgrey',  n: 'Grigio chiaro', bg: '#c8ccd0', g: 'light' },
  { id: 'sky',    n: 'Azzurro',       bg: '#9cc6ea', g: 'light' },
  { id: 'pink',   n: 'Rosa',          bg: '#f2b5c6', g: 'light' },
  { id: 'yellow', n: 'Giallo',        bg: '#f2cb45', g: 'color' },
  { id: 'red',    n: 'Rosso',         bg: '#d24a43', g: 'color' },
  { id: 'green',  n: 'Verde',         bg: '#4e9a5c', g: 'color' },
  { id: 'multi',  n: 'Fantasia',      bg: 'conic-gradient(#d24a43 0 25%, #f2cb45 0 50%, #4e9a5c 0 75%, #5b84c9 0)', g: 'color' },
  { id: 'brown',  n: 'Marrone',       bg: '#7a5236', g: 'dark' },
  { id: 'dgrey',  n: 'Grigio scuro',  bg: '#565c63', g: 'dark' },
  { id: 'navy',   n: 'Blu',           bg: '#1f3462', g: 'dark' },
  { id: 'black',  n: 'Nero',          bg: '#17191c', g: 'dark' },
];
const COLOR = Object.fromEntries(COLORS.map(c => [c.id, c]));
const GROUPS = {
  white:    { n: 'Bianchi',         t: '60°', bg: '#ffffff' },
  light:    { n: 'Chiari',          t: '40°', bg: 'linear-gradient(135deg,#ece2cc,#9cc6ea)' },
  color:    { n: 'Colorati',        t: '40°', bg: 'linear-gradient(135deg,#d24a43,#f2cb45,#4e9a5c)' },
  dark:     { n: 'Scuri',           t: '30°', bg: 'linear-gradient(135deg,#1f3462,#17191c)' },
  delicate: { n: 'Delicati e lana', t: '30°', bg: 'repeating-linear-gradient(45deg,#c8ccd0 0 4px,#ece2cc 4px 8px)' },
};
const MEMBER_COLORS = ['#2f6f62', '#c2553f', '#5b84c9', '#b07a2a', '#8a5bb8', '#3f8f9f', '#c25b8a'];

// ---------- state ----------
const KEY = 'guardaroba.v1';
const blank = () => ({ v: 1, members: [], items: [], targets: {}, wears: {}, capacity: 16, loads: [], loc: null, weather: null, worn: {} });
let S = load();
const ui = { tab: 'oggi', member: null, day: 0, open: {}, swap: {}, sheet: null, undo: null, manualT: null, wxLoading: false, wxErr: null, results: [], draft: { name: '', kind: 'adult' } };

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.members)) return Object.assign(blank(), s); } catch (e) {}
  return blank();
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save() { persist(); render(); }
function snap(msg) { ui.undo = JSON.stringify(S); toast(msg, true); }

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const iso = d => d.toLocaleDateString('sv');
const member = id => S.members.find(m => m.id === id);
const target = (mid, cat) => S.targets[mid]?.[cat] ?? 0;
const wearsFor = cat => S.wears[cat] ?? CAT[cat].wears;
const groupOf = it => (it.delicate ? 'delicate' : COLOR[it.color]?.g || 'color');
const dot = color => `<span class="dot" style="background:${COLOR[color]?.bg || '#ccc'}"></span>`;
const av = (m, cls = '') => `<span class="av ${cls}" style="background:${m.color}">${esc(m.name.trim()[0]?.toUpperCase() || '?')}</span>`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function stats(mid, cat) {
  const s = { total: 0, clean: 0, dirty: 0, away: 0 };
  for (const i of S.items) if (i.m === mid && i.cat === cat) {
    s.total++;
    if (i.state === 'clean') s.clean++; else if (i.state === 'dirty') s.dirty++; else s.away++;
  }
  return s;
}
// "low" = something is in the laundry and what is left clean is below ~30% of the goal
function isLow(mid, cat) {
  const t = target(mid, cat), s = stats(mid, cat);
  if (!t || s.total === s.clean) return false;
  return s.clean < Math.max(1, Math.ceil(t * 0.3));
}

// ---------- laundry ----------
function washPlan() {
  const by = {};
  for (const it of S.items) if (it.state === 'dirty') (by[groupOf(it)] ||= []).push(it);
  return Object.entries(by).map(([g, items]) => {
    const urgentKeys = new Set();
    for (const it of items) if (isLow(it.m, it.cat)) urgentKeys.add(it.m + ':' + it.cat);
    items.sort((a, b) => (urgentKeys.has(b.m + ':' + b.cat) - urgentKeys.has(a.m + ':' + a.cat)) || ((a.last || '') < (b.last || '') ? -1 : 1));
    const reasons = [...urgentKeys].map(k => {
      const [m, c] = k.split(':'); const s = stats(m, c);
      return `${member(m)?.name}: ${CAT[c].n.toLowerCase()}, ${!s.clean ? 'nessuno pulito' : s.clean === 1 ? 'ne resta 1' : 'ne restano ' + s.clean}`;
    });
    const fill = items.length / S.capacity;
    return { g, items, urgent: urgentKeys.size, reasons, fill };
  }).sort((a, b) => (b.urgent - a.urgent) || (b.fill - a.fill));
}

// ---------- outfit ----------
function slotsFor(t, rain) {
  const s = [
    { k: 'under', cats: ['under'] },
    { k: 'socks', cats: ['socks'] },
    { k: 'top', cats: t >= 20 ? ['tshirt', 'shirt', 'longsleeve'] : ['longsleeve', 'shirt', 'tshirt'] },
  ];
  if (t < 20) s.push({ k: 'mid', cats: t < 12 ? ['sweater', 'sweatshirt'] : ['sweatshirt', 'sweater'] });
  s.push({ k: 'bottom', cats: t >= 24 ? ['shorts', 'skirt', 'pants', 'jeans'] : t >= 17 ? ['pants', 'jeans', 'skirt', 'shorts'] : ['jeans', 'pants'] });
  if (t < 11) s.push({ k: 'outer', cats: rain ? ['coat', 'rain', 'jacket'] : ['coat', 'jacket'] });
  else if (t < 19) s.push({ k: 'outer', cats: rain ? ['rain', 'jacket'] : ['jacket', 'rain'] });
  else if (rain) s.push({ k: 'outer', cats: ['rain'], optional: true });
  if (t < 7) s.push({ k: 'acc', cats: ['hat'], optional: true });
  return s;
}
function candidates(mid, cats) {
  const out = [];
  for (const c of cats) {
    const multi = wearsFor(c) > 1;
    const list = S.items.filter(i => i.m === mid && i.cat === c && i.state === 'clean')
      // multi-wear pieces: keep using the one already started; single-wear: the one rested longest
      .sort((a, b) => (multi ? (b.wears || 0) - (a.wears || 0) : 0) || ((a.last || '') < (b.last || '') ? -1 : (a.last || '') > (b.last || '') ? 1 : 0));
    out.push(...list);
  }
  return out;
}
function outfit(mid, t, rain) {
  return slotsFor(t, rain).map(sl => {
    const cand = candidates(mid, sl.cats);
    const off = ui.swap[mid + ':' + sl.k] || 0;
    return { ...sl, item: cand.length ? cand[off % cand.length] : null, choices: cand.length };
  }).filter(sl => sl.item || !sl.optional);
}

// ---------- weather ----------
const WMO = c => c === 0 ? ['☀️', 'Sereno'] : c <= 2 ? ['🌤️', 'Poco nuvoloso'] : c === 3 ? ['☁️', 'Nuvoloso'] : c <= 48 ? ['🌫️', 'Nebbia']
  : c <= 57 ? ['🌦️', 'Pioviggine'] : c <= 67 ? ['🌧️', 'Pioggia'] : c <= 77 ? ['❄️', 'Neve'] : c <= 82 ? ['🌧️', 'Rovesci'] : c <= 86 ? ['🌨️', 'Neve'] : ['⛈️', 'Temporale'];
const feel = t => t >= 26 ? 'Caldo' : t >= 20 ? 'Mite' : t >= 14 ? 'Fresco' : t >= 7 ? 'Freddo' : 'Molto freddo';

function dayWeather(off) {
  if (ui.manualT != null && !S.loc) return { t: ui.manualT, rain: false, manual: true, date: iso(addDays(new Date(), off)) };
  const d = S.weather?.d; if (!d) return null;
  const today = iso(new Date());
  let i = d.time.indexOf(today); if (i < 0) i = 0;
  i += off; if (i >= d.time.length) return null;
  const hi = d.apparent_temperature_max[i], lo = d.apparent_temperature_min[i];
  return {
    date: d.time[i], code: d.weather_code[i], max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]),
    t: Math.round((hi * 2 + lo) / 3), rainP: d.precipitation_probability_max[i] ?? 0, rain: (d.precipitation_probability_max[i] ?? 0) >= 45,
  };
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

async function fetchWeather(force) {
  if (!S.loc) return;
  const fresh = S.weather && S.weather.lat === S.loc.lat && Date.now() - S.weather.at < 3 * 3600e3 && S.weather.d?.time?.includes(iso(new Date()));
  if (fresh && !force) return;
  ui.wxLoading = true; render();
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${S.loc.lat}&longitude=${S.loc.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max&timezone=auto&forecast_days=3`;
    const r = await fetch(u); if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    S.weather = { at: Date.now(), lat: S.loc.lat, d: j.daily }; ui.wxErr = null;
  } catch (e) { ui.wxErr = 'Meteo non raggiungibile ora.'; }
  ui.wxLoading = false; save();
}
let searchTimer;
async function searchCity(q) {
  clearTimeout(searchTimer);
  if (q.trim().length < 2) { ui.results = []; renderResults(); return; }
  searchTimer = setTimeout(async () => {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=it&format=json`);
      const j = await r.json();
      ui.results = (j.results || []).map(x => ({ name: x.name, sub: [x.admin1, x.country].filter(Boolean).join(', '), lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3) }));
    } catch (e) { ui.results = []; }
    renderResults();
  }, 280);
}
function renderResults() {
  const box = $('#results'); if (!box) return;
  box.innerHTML = ui.results.map((r, i) => `<button data-a="pickCity" data-i="${i}">${esc(r.name)}<small>${esc(r.sub)}</small></button>`).join('');
}

// ---------- views ----------
function render() {
  document.body.classList.toggle('onboarding', !S.members.length);
  if (!S.members.find(m => m.id === ui.member)) ui.member = S.members[0]?.id || null;
  const v = !S.members.length ? viewHello() : { oggi: viewToday, armadio: viewCloset, bucato: viewLaundry, regole: viewRules }[ui.tab]();
  $('#view').innerHTML = v;
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.v === ui.tab ? 'page' : 'false'));
  $('#washBadge').hidden = !washPlan().some(p => p.urgent);
  renderSheet();
}

function viewHello() {
  const d = ui.draft;
  return `<section class="hello">
    <img class="logo" src="icon.svg" alt="">
    <h1>Il guardaroba<br>di famiglia</h1>
    <p class="lead">Armadio in ordine, lavatrici al momento giusto e cosa mettersi con il tempo di oggi.</p>
    <div class="card">
      <label class="lb muted small" style="display:block;margin-bottom:10px">Chi c'è in famiglia?</label>
      <form class="inline" data-f="addDraft">
        <input class="field" name="n" placeholder="Nome" autocomplete="off" value="${esc(d.name)}" maxlength="24">
        <button class="btn primary" type="submit">Aggiungi</button>
      </form>
      <div style="margin-top:10px" class="seg" role="group" aria-label="Età">
        <button data-a="draftKind" data-v="adult" aria-pressed="${d.kind === 'adult'}">Adulto</button>
        <button data-a="draftKind" data-v="kid" aria-pressed="${d.kind === 'kid'}">Bambino</button>
      </div>
      <ul class="fam">${(ui.fam || []).map((m, i) => `<li>${av(m)}<b>${esc(m.name)}</b><span class="muted small">${m.kind === 'kid' ? 'Bambino' : 'Adulto'}</span><button class="icon-btn" data-a="dropDraft" data-i="${i}" aria-label="Togli">×</button></li>`).join('')}</ul>
    </div>
    <button class="btn primary block" data-a="start" ${(ui.fam || []).length ? '' : 'disabled'}>Inizia</button>
    <p style="text-align:center"><button class="link" data-a="demo">Oppure prova con una famiglia d'esempio</button></p>
  </section>`;
}

function memberPills() {
  return `<div class="pills" role="group" aria-label="Persona">${S.members.map(m =>
    `<button class="pill" data-a="member" data-id="${m.id}" aria-pressed="${m.id === ui.member}">${av(m)}${esc(m.name)}</button>`).join('')}</div>`;
}

function viewToday() {
  const w = dayWeather(ui.day);
  const date = addDays(new Date(), ui.day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  let wx;
  if (!S.loc && ui.manualT == null) {
    wx = `<div class="card"><b>Che tempo fa?</b><p class="muted small" style="margin:4px 0 14px">Imposta la città per i consigli automatici, o scegli al volo.</p>
      <div class="row-btns"><button class="btn primary sm" data-a="sheet" data-v="loc">Imposta città</button>
      ${[['Caldo', 27], ['Mite', 21], ['Fresco', 15], ['Freddo', 6]].map(([n, t]) => `<button class="btn sm" data-a="manualT" data-v="${t}">${n}</button>`).join('')}</div></div>`;
  } else if (!w) {
    wx = `<div class="card muted">${ui.wxLoading ? 'Carico il meteo…' : esc(ui.wxErr || 'Meteo non disponibile.')} ${ui.wxLoading ? '' : '<button class="link" data-a="refreshWx">Riprova</button>'}</div>`;
  } else {
    const [ico, desc] = w.manual ? ['🌡️', 'Scelto a mano'] : WMO(w.code);
    wx = `<div class="card"><div class="wx"><span class="wx-ico">${ico}</span>
      <div class="wx-t">${w.manual ? feel(w.t) : `${w.max}°<small> / ${w.min}°</small>`}</div>
      <div class="wx-d">${w.manual ? 'circa ' + w.t + '°' : `${desc} · percepiti ${w.t}° · pioggia ${w.rainP}%`}</div></div>
      <div class="wx-foot"><div class="seg" role="group" aria-label="Giorno">
        <button data-a="day" data-v="0" aria-pressed="${ui.day === 0}">Oggi</button>
        <button data-a="day" data-v="1" aria-pressed="${ui.day === 1}">Domani</button></div>
        ${w.manual ? `<button class="link" data-a="manualT" data-v="">Cambia</button>` : `<button class="link" data-a="sheet" data-v="loc">${esc(S.loc.name)}</button>`}
      </div></div>`;
  }

  const plan = washPlan().filter(p => p.urgent);
  const alerts = plan.slice(0, 2).map(p => `<button class="alert" data-a="tab" data-v="bucato"><span>🧺</span><span><b>Lavatrice di ${GROUPS[p.g].n.toLowerCase()}</b>${esc(p.reasons.slice(0, 2).join(' · '))}</span></button>`).join('');

  let cards = '';
  if (w) {
    const key = w.date;
    cards = S.members.map(m => {
      const done = S.worn[key]?.[m.id];
      const o = outfit(m.id, w.t, w.rain);
      const has = S.items.some(i => i.m === m.id);
      const rows = !has ? `<li class="miss"><span class="emoji">＋</span><span class="lbl">Nessun capo ancora. <button class="link" data-a="goCloset" data-id="${m.id}">Riempi l'armadio</button></span></li>`
        : o.map(sl => sl.item
          ? `<li><span class="emoji">${CAT[sl.item.cat].e}</span>${dot(sl.item.color)}<span class="lbl">${esc(sl.item.name || CAT[sl.item.cat].one)}<small>${COLOR[sl.item.color]?.n.toLowerCase() || ''}</small></span>${sl.choices > 1 && !done ? `<button class="swap" data-a="swap" data-id="${m.id}" data-v="${sl.k}" aria-label="Un altro">↻</button>` : ''}</li>`
          : `<li class="miss"><span class="emoji">!</span><span class="lbl">Niente di pulito: ${CAT[sl.cats[0]].n.toLowerCase()}</span></li>`).join('')
          + (w.rain && !o.some(s => s.item?.cat === 'rain') ? `<li><span class="emoji">☂️</span><span class="lbl muted">Prendi l'ombrello</span></li>` : '');
      return `<article class="card outfit ${done ? 'done' : ''}"><header>${av(m, 'lg')}<b>${esc(m.name)}</b>
        ${has ? (done ? `<span class="chip ok">✓ Vestito</span>` : `<button class="btn sm primary" data-a="wear" data-id="${m.id}">Indossato</button>`) : ''}</header><ul>${rows}</ul></article>`;
    }).join('');
  }

  return `<header class="head"><div><h1>${ui.day ? 'Domani' : 'Oggi'}</h1><p>${date}</p></div></header>${wx}${alerts}${cards}`;
}

function viewCloset() {
  const mid = ui.member, m = member(mid);
  const all = S.items.filter(i => i.m === mid);
  const clean = all.filter(i => i.state === 'clean').length;
  const shown = CATS.filter(c => target(mid, c.id) > 0 || all.some(i => i.cat === c.id));
  const rows = shown.map(c => {
    const t = target(mid, c.id), s = stats(mid, c.id), max = Math.max(t, s.total, 1);
    const diff = s.total - t;
    const chip = !t ? '' : diff < 0 ? `<span class="chip less">mancano ${-diff}</span>` : diff > 0 ? `<span class="chip more">${diff} in più</span>` : `<span class="chip ok">✓</span>`;
    const open = ui.open[mid + c.id];
    const pieces = open ? `<div class="cat-b">${S.items.filter(i => i.m === mid && i.cat === c.id)
      .map(i => `<button class="pc ${i.state}" data-a="item" data-id="${i.id}" aria-label="${esc(CAT[i.cat].one)} ${COLOR[i.color]?.n || ''}">${dot(i.color)}</button>`).join('')}
      <button class="pc add" data-a="add" data-v="${c.id}" aria-label="Aggiungi">＋</button></div>` : '';
    return `<div class="card cat"><button class="cat-h" data-a="toggleCat" data-v="${c.id}" aria-expanded="${!!open}">
      <span class="emoji">${c.e}</span>
      <span class="mid"><span class="name">${c.n} ${chip}</span>
        <span class="bar"><i class="c" style="width:${s.clean / max * 100}%"></i><i class="d" style="width:${s.dirty / max * 100}%"></i><i class="w" style="width:${s.away / max * 100}%"></i>${t && t < max ? `<i class="t" style="left:${t / max * 100}%"></i>` : ''}</span></span>
      <span class="num">${s.total}<small>${t ? '/' + t : ''}</small></span></button>${pieces}</div>`;
  }).join('');

  return `<header class="head"><div><h1>Armadio</h1><p>${esc(m.name)} · ${plural(all.length, 'capo', 'capi')}, ${clean} pulit${clean === 1 ? 'o' : 'i'}</p></div>
    <button class="btn primary sm" data-a="add">＋ Aggiungi</button></header>
    ${memberPills()}
    <div class="legend"><span><i style="background:var(--clean)"></i>nell'armadio</span><span><i style="background:var(--dirty)"></i>nel cesto</span><span><i style="background:var(--away)"></i>in lavaggio</span><span class="muted">tocca una riga per vedere i capi</span></div>
    ${rows || `<div class="card empty"><b>Armadio vuoto</b>Imposta quanti capi volete nelle Regole, poi aggiungili qui.</div>`}`;
}

function viewLaundry() {
  const dirty = S.items.filter(i => i.state === 'dirty').length;
  const wash = S.items.filter(i => i.state === 'wash').length;
  const dry = S.items.filter(i => i.state === 'dry').length;
  const active = S.loads.map(l => {
    const its = l.items.map(id => S.items.find(i => i.id === id)).filter(Boolean);
    return `<article class="card"><div class="load-h"><span class="gsw" style="background:${GROUPS[l.g].bg}"></span><b>${GROUPS[l.g].n}</b><span class="muted small">${GROUPS[l.g].t}</span></div>
      <div class="stage">${l.stage === 'wash' ? 'In lavatrice' : 'Sullo stendino'} · ${plural(its.length, 'capo', 'capi')}</div>
      <div class="dots">${its.map(i => dot(i.color)).join('')}</div>
      ${l.stage === 'wash' ? `<button class="btn block" data-a="hang" data-id="${l.id}">Finita, stendo</button>` : `<button class="btn primary block" data-a="putAway" data-id="${l.id}">Asciutto, rimetto nell'armadio</button>`}</article>`;
  }).join('');

  const plan = washPlan();
  const next = plan.map(p => {
    const n = Math.min(p.items.length, S.capacity);
    const badge = p.urgent ? `<span class="chip less">da fare presto</span>` : p.fill >= .8 ? `<span class="chip more">carico pieno</span>` : `<span class="chip">può aspettare</span>`;
    const who = [...new Set(p.items.map(i => i.m))].map(member).filter(Boolean).map(m => esc(m.name)).join(', ');
    return `<article class="card"><div class="load-h"><span class="gsw" style="background:${GROUPS[p.g].bg}"></span><b>${GROUPS[p.g].n}</b><span class="muted small">${GROUPS[p.g].t}</span>${badge}</div>
      <div class="meter"><i style="width:${Math.min(1, p.fill) * 100}%"></i></div>
      <div class="load-m"><span>${p.items.length} di ${S.capacity} capi</span><span>${who}</span></div>
      ${p.reasons.length ? `<p class="why">${esc(p.reasons.slice(0, 3).join(' · '))}</p>` : ''}
      <div class="dots">${p.items.map(i => dot(i.color)).join('')}</div>
      <button class="btn ${p.urgent || p.fill >= .8 ? 'primary' : ''} block" data-a="startLoad" data-v="${p.g}">Avvia lavatrice${p.items.length > S.capacity ? ` (${n} capi)` : ''}</button></article>`;
  }).join('');

  return `<header class="head"><div><h1>Bucato</h1><p>Lavatrici suggerite in base a colori e urgenza</p></div></header>
    <div class="kpis"><div class="kpi"><b>${dirty}</b><span>nel cesto</span></div><div class="kpi"><b>${wash}</b><span>in lavatrice</span></div><div class="kpi"><b>${dry}</b><span>sullo stendino</span></div></div>
    ${active ? `<h2 class="sec">In corso</h2>${active}` : ''}
    <h2 class="sec">Prossime lavatrici</h2>
    ${next || `<div class="card empty"><b>Cesto vuoto</b>Quando qualcosa è da lavare, mettilo nel cesto.</div>`}
    <button class="btn block" data-a="sheet" data-v="toss" style="margin-top:6px">🧺 Metti capi nel cesto</button>`;
}

function viewRules() {
  const mid = ui.member, m = member(mid);
  const less = [], more = [];
  for (const mm of S.members) {
    const l = [], p = [];
    for (const c of CATS) {
      const t = target(mm.id, c.id), d = stats(mm.id, c.id).total - t;
      const lbl = n => `${n} ${(n === 1 ? c.one : c.n).toLowerCase()}`;
      if (d < 0) l.push(lbl(-d)); else if (d > 0 && t) p.push(lbl(d));
    }
    if (l.length) less.push(`<li>${av(mm)}<span>${esc(l.join(' · '))}</span></li>`);
    if (p.length) more.push(`<li>${av(mm)}<span>${esc(p.join(' · '))}</span></li>`);
  }
  const step = (a, id, v, extra = '') => `<span class="step ${v ? '' : 'zero'}"><button data-a="${a}" data-v="${id}" data-d="-1" ${extra} aria-label="Meno">−</button><output>${v}</output><button data-a="${a}" data-v="${id}" data-d="1" ${extra} aria-label="Più">+</button></span>`;

  return `<header class="head"><div><h1>Regole</h1><p>Quanti capi tenere, per avere sempre ordine</p></div></header>
    ${less.length || more.length ? `<div class="card todo">
      ${less.length ? `<b>Da comprare</b><ul>${less.join('')}</ul>` : ''}
      ${more.length ? `<b style="display:block;margin-top:${less.length ? 14 : 0}px">Da regalare o mettere via</b><ul>${more.join('')}</ul>` : ''}</div>`
      : `<div class="alert info"><span>✨</span><span><b>Tutto in ordine</b>Ogni armadio ha esattamente i capi previsti.</span></div>`}

    <h2 class="sec">Capi da avere</h2>
    ${memberPills()}
    <div class="card">${CATS.map(c => {
      const t = target(mid, c.id), s = stats(mid, c.id);
      return `<div class="rule"><span class="emoji">${c.e}</span><span class="mid">${c.n}<small>${s.total ? 'ne ha ' + s.total : 'nessuno'}</small></span>${step('target', c.id, t)}</div>`;
    }).join('')}</div>

    <h2 class="sec">Lavatrice</h2>
    <div class="card"><div class="rule"><span class="mid">Capi per lavatrice<small>quanti ne entrano in un carico</small></span>${step('capacity', '', S.capacity)}</div></div>
    <details class="card"><summary>Quante volte si mettono prima di lavarli</summary>
      ${CATS.map(c => `<div class="rule"><span class="emoji">${c.e}</span><span class="mid">${c.n}</span>${step('wears', c.id, wearsFor(c.id))}</div>`).join('')}
    </details>

    <h2 class="sec">Famiglia</h2>
    <div class="card">${S.members.map(mm => `<div class="member-row">${av(mm)}
      <input class="field" data-c="rename" data-id="${mm.id}" value="${esc(mm.name)}" maxlength="24" aria-label="Nome">
      <button class="btn sm ghost" data-a="kind" data-id="${mm.id}">${mm.kind === 'kid' ? 'Bambino' : 'Adulto'}</button>
      <button class="icon-btn" data-a="delMember" data-id="${mm.id}" aria-label="Rimuovi ${esc(mm.name)}">×</button></div>`).join('')}
      <form class="inline" data-f="addMember" style="margin-top:8px"><input class="field" name="n" placeholder="Aggiungi una persona" maxlength="24" autocomplete="off"><button class="btn" type="submit">Aggiungi</button></form>
    </div>

    <h2 class="sec">Meteo</h2>
    <div class="card"><div class="rule"><span class="mid">${S.loc ? esc(S.loc.name) : 'Nessuna città'}<small>per i consigli su cosa mettersi</small></span><button class="btn sm" data-a="sheet" data-v="loc">${S.loc ? 'Cambia' : 'Imposta'}</button></div></div>

    <h2 class="sec">Dati</h2>
    <div class="card"><p class="muted small" style="margin:0 0 12px">Tutto resta su questo dispositivo. Per usarlo su un altro telefono, salva una copia e aprila lì.</p>
      <div class="row-btns"><button class="btn sm" data-a="export">Salva una copia</button><button class="btn sm" data-a="import">Apri una copia</button><button class="btn sm ghost danger" data-a="reset">Cancella tutto</button></div></div>`;
}

// ---------- sheets ----------
function renderSheet() {
  const box = $('#sheet'), sh = ui.sheet;
  if (!sh) { box.innerHTML = ''; return; }
  let body = '';
  if (sh.type === 'add') {
    const c = CAT[sh.cat];
    body = `<h3>Aggiungi a ${esc(member(sh.m)?.name)}</h3><p class="sub">Scegli tipo e colore. Il colore decide in quale lavatrice va.</p>
      <label class="lb">Tipo</label><div class="catgrid">${CATS.map(x => `<button data-a="sCat" data-v="${x.id}" aria-pressed="${x.id === sh.cat}"><span>${x.e}</span>${x.n}</button>`).join('')}</div>
      <label class="lb">Colore</label>${swatches(sh.color, 'sColor')}
      <label class="lb">Quanti</label>
      <div class="toggle"><span>${sh.qty} ${sh.qty === 1 ? c.one.toLowerCase() : c.n.toLowerCase()}</span><span class="step"><button data-a="sQty" data-d="-1" aria-label="Meno">−</button><output>${sh.qty}</output><button data-a="sQty" data-d="1" aria-label="Più">+</button></span></div>
      <label class="lb">Nome (facoltativo)</label><input class="field" data-i="name" value="${esc(sh.name)}" placeholder="es. Felpa con la zip" maxlength="40">
      <div class="toggle" style="margin-top:12px"><span>Delicato / lana</span><button class="switch" role="switch" aria-checked="${sh.delicate}" data-a="sDel" aria-label="Delicato"></button></div>
      <div class="actions"><button class="btn" data-a="close">Annulla</button><button class="btn primary" data-a="sAdd">Aggiungi ${sh.qty > 1 ? sh.qty : ''}</button></div>`;
  } else if (sh.type === 'item') {
    const it = S.items.find(i => i.id === sh.id); if (!it) { ui.sheet = null; box.innerHTML = ''; return; }
    const c = CAT[it.cat], away = it.state === 'wash' || it.state === 'dry';
    const w = wearsFor(it.cat);
    body = `<h3>${c.e} ${esc(it.name || c.one)}</h3><p class="sub">${esc(member(it.m)?.name)} · ${w > 1 ? `messo ${it.wears || 0} volt${it.wears === 1 ? 'a' : 'e'} su ${w} prima del lavaggio` : 'si lava dopo ogni uso'}${it.last ? ' · ultima volta ' + new Date(it.last).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}</p>
      ${away ? `<div class="stage">${it.state === 'wash' ? 'In lavatrice' : 'Sullo stendino'}</div>` : `<div class="seg" role="group" aria-label="Stato" style="width:100%">
        <button style="flex:1" data-a="iState" data-v="clean" aria-pressed="${it.state === 'clean'}">Nell'armadio</button>
        <button style="flex:1" data-a="iState" data-v="dirty" aria-pressed="${it.state === 'dirty'}">Nel cesto</button></div>`}
      <label class="lb">Colore</label>${swatches(it.color, 'iColor')}
      <label class="lb">Nome</label><input class="field" data-c="iName" value="${esc(it.name)}" placeholder="${esc(c.one)}" maxlength="40">
      <div class="toggle" style="margin-top:12px"><span>Delicato / lana</span><button class="switch" role="switch" aria-checked="${!!it.delicate}" data-a="iDel" aria-label="Delicato"></button></div>
      <div class="actions"><button class="btn danger" data-a="iDelete">Elimina</button><button class="btn primary" data-a="close">Fatto</button></div>`;
  } else if (sh.type === 'toss') {
    const mid = sh.m || ui.member;
    const its = S.items.filter(i => i.m === mid && (i.state === 'clean' || (i.state === 'dirty' && sh.tossed?.includes(i.id))));
    const byCat = CATS.map(c => [c, its.filter(i => i.cat === c.id)]).filter(([, l]) => l.length);
    body = `<h3>Nel cesto</h3><p class="sub">Tocca i capi sporchi. Toccali di nuovo per toglierli.</p>
      <div class="pills" role="group">${S.members.map(m => `<button class="pill" data-a="tossMember" data-id="${m.id}" aria-pressed="${m.id === mid}">${av(m)}${esc(m.name)}</button>`).join('')}</div>
      ${byCat.map(([c, l]) => `<div class="toss-cat"><div class="t">${c.e} ${c.n}</div><div class="g">${l.map(i => `<button class="pc ${i.state}" data-a="toss" data-id="${i.id}" aria-label="${esc(i.name || c.one)} ${COLOR[i.color]?.n}">${dot(i.color)}</button>`).join('')}</div></div>`).join('') || '<p class="muted">Nessun capo pulito.</p>'}
      <div class="actions"><button class="btn primary" data-a="close">Fatto${sh.tossed?.length ? ` · ${sh.tossed.length} nel cesto` : ''}</button></div>`;
  } else if (sh.type === 'loc') {
    body = `<h3>Dove siete?</h3><p class="sub">Il meteo arriva da Open-Meteo, senza account.</p>
      <button class="btn block" data-a="geo">📍 Usa la mia posizione</button>
      <label class="lb">Oppure cerca una città</label>
      <input class="field" data-i="city" placeholder="es. Milano" autocomplete="off" enterkeyhint="search">
      <div class="results" id="results"></div>
      ${S.loc ? `<div class="actions"><button class="btn ghost danger" data-a="clearLoc">Togli città</button></div>` : ''}`;
  }
  const panel = box.querySelector('.panel');
  if (panel && panel.dataset.type === sh.type) {
    // same sheet: swap the content only, so it keeps its scroll and doesn't animate again
    const y = panel.scrollTop, focused = document.activeElement?.dataset?.i;
    panel.innerHTML = `<div class="grab"></div>${body}`; panel.scrollTop = y;
    if (focused) { const f = panel.querySelector(`[data-i="${focused}"]`); if (f) { f.focus(); f.setSelectionRange?.(f.value.length, f.value.length); } }
  } else {
    box.innerHTML = `<div class="backdrop" data-a="close"></div><div class="panel" role="dialog" aria-modal="true" data-type="${sh.type}"><div class="grab"></div>${body}</div>`;
  }
  if (sh.type === 'loc') renderResults();
}
const swatches = (cur, a) => `<div class="swatches" role="group" aria-label="Colore">${COLORS.map(c => `<button data-a="${a}" data-v="${c.id}" style="background:${c.bg}" aria-pressed="${c.id === cur}" aria-label="${c.n}" title="${c.n}"></button>`).join('')}</div>`;
function openSheet(s) {
  const first = !ui.sheet; ui.sheet = s; renderSheet();
  if (first) { const f = $('.panel input[data-i="city"]'); if (f) setTimeout(() => f.focus(), 250); }
}

// ---------- toast ----------
let toastTimer;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-a="undo">Annulla</button>' : ''}`;
  t.classList.add('on'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('on'); ui.undo = null; }, 4500);
}

// ---------- members ----------
function newMember(name, kind) {
  const m = { id: uid(), name: name.trim(), kind, color: MEMBER_COLORS[S.members.length % MEMBER_COLORS.length] };
  S.members.push(m);
  S.targets[m.id] = Object.fromEntries(CATS.map(c => [c.id, kind === 'kid' ? c.k : c.a]));
  return m;
}
function demo() {
  S = blank();
  const fam = [['Papà', 'adult'], ['Mamma', 'adult'], ['Leo', 'kid'], ['Sofia', 'kid']].map(([n, k]) => newMember(n, k));
  S.targets[fam[1].id].skirt = 4; S.targets[fam[3].id].skirt = 5;
  const pal = { under: ['white', 'black', 'lgrey', 'navy'], socks: ['white', 'black', 'dgrey', 'multi'], jeans: ['navy'], coat: ['black', 'navy', 'red'] };
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const days = ['2026-11-08', '2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14'];
  for (const m of fam) for (const c of CATS) {
    const t = S.targets[m.id][c.id]; if (!t) continue;
    const n = Math.max(0, Math.round(t * (0.65 + Math.random() * 0.55)));
    for (let i = 0; i < n; i++) {
      const dirty = c.wears <= 4 && Math.random() < 0.2;
      S.items.push({ id: uid(), m: m.id, cat: c.id, color: rnd(pal[c.id] || COLORS.map(x => x.id)), name: '', delicate: !!c.delicate, state: dirty ? 'dirty' : 'clean', wears: dirty ? c.wears : 0, last: dirty ? rnd(days) : '' });
    }
  }
  ui.tab = 'oggi'; toast("Famiglia d'esempio pronta. Puoi cancellarla dalle Regole.");
}

// ---------- actions ----------
const ACT = {
  tab: d => { ui.tab = d.v; render(); scrollTo(0, 0); },
  member: d => { ui.member = d.id; render(); },
  goCloset: d => { ui.member = d.id; ui.tab = 'armadio'; render(); scrollTo(0, 0); },
  day: d => { ui.day = +d.v; ui.swap = {}; render(); },
  manualT: d => { ui.manualT = d.v === '' ? null : +d.v; render(); },
  refreshWx: () => fetchWeather(true),
  swap: d => { const k = d.id + ':' + d.v; ui.swap[k] = (ui.swap[k] || 0) + 1; render(); },
  wear: d => {
    const w = dayWeather(ui.day); if (!w) return;
    snap(`${member(d.id).name} è vestito`);
    for (const sl of outfit(d.id, w.t, w.rain)) if (sl.item) {
      const it = sl.item; it.wears = (it.wears || 0) + 1; it.last = w.date;
      if (it.wears >= wearsFor(it.cat)) it.state = 'dirty';
    }
    (S.worn[w.date] ||= {})[d.id] = true;
    // forget days older than a week
    const cut = iso(addDays(new Date(), -7)); for (const k in S.worn) if (k < cut) delete S.worn[k];
    for (const k in ui.swap) if (k.startsWith(d.id + ':')) delete ui.swap[k];
    save();
  },
  undo: () => { if (!ui.undo) return; S = JSON.parse(ui.undo); ui.undo = null; $('#toast').classList.remove('on'); save(); },

  toggleCat: d => { const k = ui.member + d.v; ui.open[k] = !ui.open[k]; render(); },
  add: d => openSheet({ type: 'add', m: ui.member, cat: d.v || 'tshirt', color: 'navy', qty: 1, name: '', delicate: !!CAT[d.v || 'tshirt'].delicate }),
  sCat: d => { ui.sheet.cat = d.v; ui.sheet.delicate = !!CAT[d.v].delicate; renderSheet(); },
  sColor: d => { ui.sheet.color = d.v; renderSheet(); },
  sQty: d => { ui.sheet.qty = Math.max(1, Math.min(30, ui.sheet.qty + +d.d)); renderSheet(); },
  sDel: () => { ui.sheet.delicate = !ui.sheet.delicate; renderSheet(); },
  sAdd: () => {
    const s = ui.sheet;
    for (let i = 0; i < s.qty; i++) S.items.push({ id: uid(), m: s.m, cat: s.cat, color: s.color, name: s.name.trim(), delicate: s.delicate, state: 'clean', wears: 0, last: '' });
    ui.open[s.m + s.cat] = true; ui.sheet = null;
    toast(`${s.qty === 1 ? CAT[s.cat].one : s.qty + ' ' + CAT[s.cat].n.toLowerCase()} nell'armadio`); save();
  },
  item: d => openSheet({ type: 'item', id: d.id }),
  iState: d => { const it = S.items.find(i => i.id === ui.sheet.id); it.state = d.v; if (d.v === 'clean') it.wears = 0; save(); },
  iColor: d => { S.items.find(i => i.id === ui.sheet.id).color = d.v; save(); },
  iDel: () => { const it = S.items.find(i => i.id === ui.sheet.id); it.delicate = !it.delicate; save(); },
  iDelete: () => {
    const id = ui.sheet.id; snap('Capo eliminato');
    S.items = S.items.filter(i => i.id !== id);
    for (const l of S.loads) l.items = l.items.filter(x => x !== id);
    S.loads = S.loads.filter(l => l.items.length);
    ui.sheet = null; save();
  },
  close: () => { ui.sheet = null; render(); },

  sheet: d => openSheet(d.v === 'toss' ? { type: 'toss', m: ui.member, tossed: [] } : { type: d.v }),
  tossMember: d => { ui.sheet.m = d.id; renderSheet(); },
  toss: d => {
    const it = S.items.find(i => i.id === d.id), t = ui.sheet.tossed;
    if (it.state === 'clean') { it.state = 'dirty'; it.last ||= iso(new Date()); t.push(it.id); }
    else { it.state = 'clean'; ui.sheet.tossed = t.filter(x => x !== it.id); }
    save();
  },
  startLoad: d => {
    const p = washPlan().find(x => x.g === d.v); if (!p) return;
    const its = p.items.slice(0, S.capacity);
    snap(`Lavatrice di ${GROUPS[d.v].n.toLowerCase()} avviata`);
    its.forEach(i => (i.state = 'wash'));
    S.loads.push({ id: uid(), g: d.v, items: its.map(i => i.id), stage: 'wash', at: Date.now() });
    save();
  },
  hang: d => { const l = S.loads.find(x => x.id === d.id); l.stage = 'dry'; l.items.forEach(id => { const i = S.items.find(x => x.id === id); if (i) i.state = 'dry'; }); save(); },
  putAway: d => {
    const l = S.loads.find(x => x.id === d.id); snap('Tutto di nuovo nell\'armadio');
    l.items.forEach(id => { const i = S.items.find(x => x.id === id); if (i) { i.state = 'clean'; i.wears = 0; } });
    S.loads = S.loads.filter(x => x !== l); save();
  },

  target: d => { const t = (S.targets[ui.member] ||= {}); t[d.v] = Math.max(0, Math.min(60, (t[d.v] ?? 0) + +d.d)); save(); },
  capacity: d => { S.capacity = Math.max(4, Math.min(40, S.capacity + +d.d)); save(); },
  wears: d => { S.wears[d.v] = Math.max(1, Math.min(60, wearsFor(d.v) + +d.d)); save(); },
  kind: d => { const m = member(d.id); m.kind = m.kind === 'kid' ? 'adult' : 'kid'; save(); },
  delMember: d => {
    const m = member(d.id);
    if (!confirm(`Rimuovere ${m.name} e tutti i suoi capi?`)) return;
    snap(`${m.name} rimosso`);
    const ids = new Set(S.items.filter(i => i.m === d.id).map(i => i.id));
    S.items = S.items.filter(i => i.m !== d.id); S.members = S.members.filter(x => x.id !== d.id); delete S.targets[d.id];
    for (const l of S.loads) l.items = l.items.filter(x => !ids.has(x)); S.loads = S.loads.filter(l => l.items.length);
    save();
  },

  geo: () => {
    if (!navigator.geolocation) return toast('Posizione non disponibile su questo dispositivo');
    toast('Cerco la posizione…');
    navigator.geolocation.getCurrentPosition(p => {
      S.loc = { name: 'La tua posizione', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) };
      S.weather = null; ui.sheet = null; ui.manualT = null; save(); fetchWeather(true);
    }, () => toast('Posizione negata: cerca la città'), { timeout: 10000, maximumAge: 3600e3 });
  },
  pickCity: d => { const r = ui.results[+d.i]; S.loc = { name: r.name, lat: r.lat, lon: r.lon }; S.weather = null; ui.sheet = null; ui.manualT = null; save(); fetchWeather(true); },
  clearLoc: () => { S.loc = null; S.weather = null; ui.sheet = null; save(); },

  draftKind: d => { ui.draft.kind = d.v; render(); },
  dropDraft: d => { ui.fam.splice(+d.i, 1); render(); },
  start: () => { (ui.fam || []).forEach(m => newMember(m.name, m.kind)); ui.fam = []; ui.tab = 'regole'; save(); toast('Ecco quanti capi tenere: cambia i numeri come preferite'); },
  demo: () => { demo(); save(); },

  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    a.download = `guardaroba-${iso(new Date())}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import: () => $('#importFile').click(),
  reset: () => { if (!confirm('Cancellare famiglia, capi e regole da questo dispositivo?')) return; S = blank(); ui.sheet = null; save(); },
};

const FORMS = {
  addDraft: f => {
    const n = f.n.value.trim(); if (!n) return;
    (ui.fam ||= []).push({ name: n, kind: ui.draft.kind, color: MEMBER_COLORS[ui.fam.length % MEMBER_COLORS.length] });
    ui.draft.name = ''; render(); $('form[data-f="addDraft"] input')?.focus();
  },
  addMember: f => { const n = f.n.value.trim(); if (!n) return; const m = newMember(n, 'adult'); ui.member = m.id; save(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  e.preventDefault(); ACT[el.dataset.a]?.(el.dataset, el);
});
document.addEventListener('submit', e => { const f = e.target.closest('[data-f]'); if (!f) return; e.preventDefault(); FORMS[f.dataset.f]?.(f); });
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.i === 'city') searchCity(el.value);
  else if (el.dataset.i && ui.sheet) ui.sheet[el.dataset.i] = el.value;
  else if (el.closest('form[data-f="addDraft"]')) ui.draft.name = el.value;
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.c === 'rename') { const m = member(el.dataset.id); const v = el.value.trim(); if (v) { m.name = v; save(); } else el.value = m.name; }
  if (el.dataset.c === 'iName') { S.items.find(i => i.id === ui.sheet.id).name = el.value.trim(); persist(); render(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) ACT.close(); });
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!Array.isArray(s.members) || !Array.isArray(s.items)) throw 0;
    if (S.members.length && !confirm('Sostituire i dati di questo dispositivo con la copia?')) return;
    S = Object.assign(blank(), s); save(); toast('Copia aperta'); fetchWeather();
  } catch (err) { toast('Questo file non è una copia del guardaroba'); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchWeather(); });

render();
fetchWeather();
