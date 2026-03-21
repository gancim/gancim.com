// ─── State ───────────────────────────────────────────────────────────────────
let progress = loadProgress();

let session = { cards:[], index:0, xpGained:0, correct:0 };
let unlockedSet = new Set();

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  initUnlockedSet();
  if (!progress.language) {
    showView('onboarding');
    document.getElementById('bottom-nav').classList.add('hidden');
  } else {
    setLang(progress.language);
    document.getElementById('bottom-nav').classList.remove('hidden');
    showView('home');
  }
  ensureVoices(() => {});
  bindEvents();
}

// ─── View Routing ─────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + name);
  if (target) target.classList.add('active');
  const navHidden = ['onboarding','review','convo'].includes(name);
  document.getElementById('bottom-nav').classList.toggle('hidden', navHidden || !progress.language);
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === name));
  if (name === 'home')  renderHome();
  if (name === 'learn') renderLearn();
  if (name === 'speak') renderSpeak();
}

// ─── Events ──────────────────────────────────────────────────────────────────
function bindEvents() {
  // Language
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.addEventListener('click', () => {
      progress.language = btn.dataset.lang;
      saveProgress(progress);
      setLang(btn.dataset.lang);
      document.getElementById('bottom-nav').classList.remove('hidden');
      showView('home');
    });
  });
  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => showView(btn.dataset.view)));
  // Home
  document.getElementById('btn-review-due').addEventListener('click', startDueReview);
  document.getElementById('btn-learn-new').addEventListener('click', () => showView('learn'));
  document.getElementById('btn-all-convos').addEventListener('click', () => showView('speak'));
  // Settings
  document.getElementById('btn-settings-home').addEventListener('click', () => showView('settings'));
  document.getElementById('btn-settings-back').addEventListener('click', () => showView('home'));
  document.getElementById('speech-rate').addEventListener('change', e => setSpeechRate(e.target.value));
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm(t('confirmReset'))) { resetProgress(); location.reload(); }
  });
  // Review
  document.getElementById('btn-reveal').addEventListener('click', revealCard);
  document.getElementById('review-card').addEventListener('click', () => { if (!session.flipped) revealCard(); });
  document.getElementById('btn-hear-review').addEventListener('click', hearCurrentCard);
  document.getElementById('grade-buttons').addEventListener('click', e => {
    const btn = e.target.closest('.btn-grade');
    if (btn) gradeCurrentCard(parseInt(btn.dataset.grade));
  });
  document.getElementById('btn-review-exit').addEventListener('click', () => {
    speechSynthesis.cancel && speechSynthesis.cancel();
    showView('home');
  });
  // Conversation view
  document.getElementById('btn-convo-exit').addEventListener('click', () => {
    speechSynthesis.cancel && speechSynthesis.cancel();
    if (typeof stopRecognition === 'function') stopRecognition();
    convo.complete = true;
    showView('speak');
  });
  document.getElementById('btn-convo-replay').addEventListener('click', () => {
    startConvo(convo.scenario);
  });
  document.getElementById('btn-convo-done').addEventListener('click', () => {
    showView('home');
  });
  document.getElementById('btn-convo-skip').addEventListener('click', skipConvoNode);
  document.getElementById('convo-mic-btn').addEventListener('click', () => {
    if (!convo.listening && !convo.complete) {
      const node = convo.scenario && convo.scenario.nodes[convo.nodeId];
      if (node && node.type === 'you') listenForConvoResponse(node);
    }
  });
  // Modals
  document.getElementById('btn-modal-home').addEventListener('click', () => {
    document.getElementById('modal-complete').classList.add('hidden');
    showView('home');
  });
  document.getElementById('btn-modal-unlock-ok').addEventListener('click', () =>
    document.getElementById('modal-unlock').classList.add('hidden'));
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function renderHome() {
  // ── Vocab progress
  const totalCards = CHAPTERS.reduce((sum, ch) => sum + ch.cards.length, 0);
  const learnedCards = CHAPTERS.reduce((sum, ch) =>
    sum + ch.cards.filter(c => { const s = progress.cardStates[c.id]; return s && s.learned; }).length, 0);
  const vocabPct = totalCards > 0 ? learnedCards / totalCards : 0;

  // ── Conversation progress
  const totalConvos = CONVERSATIONS.length;
  const doneConvos = Object.values(progress.completedConvos || {}).filter(n => n > 0).length;
  const convoPct = totalConvos > 0 ? doneConvos / totalConvos : 0;

  // ── Readiness = 40% vocab + 60% conversations
  const pct = vocabPct * 0.4 + convoPct * 0.6;
  document.getElementById('readiness-pct').textContent = Math.round(pct * 100) + '%';
  const circumference = 2 * Math.PI * 50;
  document.getElementById('readiness-ring-fill').style.strokeDashoffset = (circumference * (1 - pct)).toFixed(2);
  document.getElementById('readiness-level-name').textContent = getReadinessName(pct);
  renderWeekDots();

  // ── Featured conversation (least-completed)
  const featured = getFeaturedConvo();
  document.getElementById('featured-icon').textContent = featured.icon;
  document.getElementById('featured-title').textContent = featured.title[currentLang] || featured.title.en;
  document.getElementById('featured-sub').textContent = featured.subtitle[currentLang] || featured.subtitle.en;
  document.getElementById('featured-convo').onclick = () => startConvo(featured);

  // ── Due cards pill
  const allDue = getAllDueCards();
  const dueBadge = document.getElementById('due-count');
  const reviewBtn = document.getElementById('btn-review-due');
  if (allDue.length > 0) {
    dueBadge.textContent = allDue.length;
    dueBadge.style.display = 'inline-flex';
    reviewBtn.disabled = false;
    reviewBtn.classList.remove('pill-dim');
  } else {
    dueBadge.style.display = 'none';
    reviewBtn.disabled = true;
    reviewBtn.classList.add('pill-dim');
  }

  // ── Stats
  document.getElementById('stat-convos').textContent = doneConvos + '/' + totalConvos;
  const streak = progress.streak || 0;
  document.getElementById('stat-streak').textContent = streak + (streak > 0 ? ' 🔥' : '');
  document.getElementById('stat-vocab').textContent = Math.round(vocabPct * 100) + '%';
}

function getFeaturedConvo() {
  const completions = progress.completedConvos || {};
  return [...CONVERSATIONS].sort((a, b) =>
    (completions[a.id] || 0) - (completions[b.id] || 0)
  )[0];
}

function getReadinessName(pct) {
  if (pct < 0.05) return t('rl_landed');
  if (pct < 0.15) return t('rl_survival');
  if (pct < 0.30) return t('rl_finding');
  if (pct < 0.50) return t('rl_comfortable');
  if (pct < 0.70) return t('rl_managed');
  if (pct < 0.85) return t('rl_local');
  if (pct < 0.95) return t('rl_fluent');
  return t('rl_ready');
}

function renderWeekDots() {
  const container = document.getElementById('week-dots');
  container.innerHTML = '';
  const studyDays = new Set(progress.studyDays || []);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dot = document.createElement('div');
    dot.className = 'week-dot' + (studyDays.has(d) ? ' active' : '');
    container.appendChild(dot);
  }
}


// ─── LEARN (kana only) ───────────────────────────────────────────────────────
function renderLearn() {
  const container = document.getElementById('learn-content');
  container.innerHTML = '';
  CHAPTERS.forEach(ch => {
    const prog = getChapterProgress(progress, ch);
    const pct = Math.round(prog * 100);
    const due = getDueCards(ch.cards, progress.cardStates).length;
    const title = ch.title[currentLang] || ch.title.en;
    const subtitle = ch.subtitle[currentLang] || ch.subtitle.en;
    const isNew = prog === 0;

    const badge = isNew
      ? `<span class="lesson-badge">${t('new')}</span>`
      : due > 0
        ? `<span class="lesson-badge">${due}</span>`
        : `<span class="lesson-badge done">${pct}%</span>`;

    const btn = document.createElement('button');
    btn.className = 'lesson-card';
    btn.innerHTML = `
      <div class="lesson-icon">${ch.icon}</div>
      <div class="lesson-info">
        <div class="lesson-name">${title}</div>
        <div class="lesson-sub">${subtitle}</div>
        <div class="lesson-sub">${ch.cards.length} ${t('cards')}</div>
      </div>
      ${badge}`;
    btn.addEventListener('click', () => startChapterReview(ch));
    container.appendChild(btn);
  });
}

// ─── REVIEW SESSION ──────────────────────────────────────────────────────────
function getAllDueCards() {
  let all = [];
  CHAPTERS.forEach(ch => {
    if (isChapterUnlocked(progress, ch))
      all = all.concat(getDueCards(ch.cards, progress.cardStates));
  });
  return all;
}

function startDueReview() {
  const cards = shuffleArray(getAllDueCards()).slice(0, 20);
  if (!cards.length) { alert(t('noReviews')); return; }
  beginSession(cards);
}

function startChapterReview(ch) {
  let cards = getDueCards(ch.cards, progress.cardStates);
  if (!cards.length) cards = ch.cards;
  // Bring tips to front so they're seen first
  const tips = cards.filter(c => c.type === 'tip');
  const rest = cards.filter(c => c.type !== 'tip');
  cards = [...tips, ...shuffleArray(rest)].slice(0, 20);
  beginSession(cards);
}

function beginSession(cards) {
  session = { cards, index:0, xpGained:0, correct:0, flipped:false };
  progress = updateStreak(progress);
  saveProgress(progress);
  showView('review');
  showCard();
}

function showCard() {
  const card = session.cards[session.index];
  session.flipped = false;
  const total = session.cards.length;

  document.getElementById('session-count').textContent = `${session.index}/${total}`;
  document.getElementById('session-bar').style.width = `${(session.index/total)*100}%`;
  document.getElementById('card-inner').classList.remove('flipped');

  if (card.type === 'tip') {
    renderTipCard(card);
  } else if (card.type === 'scenario') {
    renderScenarioCard(card);
  } else if (card.type === 'hiragana' || card.type === 'katakana') {
    renderKanaCard(card);
  } else {
    renderVocabPhraseCard(card);
  }
}

function renderTipCard(card) {
  const lang = currentLang;
  document.getElementById('card-front').innerHTML = `
    <div class="card-type">${t('tip')}</div>
    <div class="tip-title">${card.title[lang] || card.title.en}</div>
    <div class="tip-body">${card.content[lang] || card.content.en}</div>`;
  document.getElementById('card-back').innerHTML = '';
  document.getElementById('btn-reveal').textContent = t('gotIt');
  document.getElementById('btn-reveal').classList.remove('hidden');
  document.getElementById('card-actions').classList.remove('hidden');
  document.getElementById('grade-buttons').classList.add('hidden');
  document.getElementById('btn-hear-review').classList.add('hidden');
}

function renderScenarioCard(card) {
  const lang = currentLang;
  const sit = card.situation[lang] || card.situation.en;
  const they = card.theyAsk;
  document.getElementById('card-front').innerHTML = `
    <div class="card-type">${t('scenario')}</div>
    <div class="scenario-situation">${sit}</div>
    <div class="scenario-label">${t('theySay')}</div>
    <div class="card-jp" style="font-size:18px;margin-bottom:4px">${they.japanese}</div>
    <div class="card-romaji">${they.romaji}</div>
    <div class="card-hint">${they.meaning[lang] || they.meaning.en}</div>`;
  const you = card.youSay;
  document.getElementById('card-back').innerHTML = `
    <div class="card-type">${t('scenario')}</div>
    <div class="scenario-label">${t('youSay')}</div>
    <div class="card-jp" style="font-size:${you.japanese.length > 15 ? '16px' : '22px'}">${you.japanese}</div>
    <div class="card-romaji">${you.romaji}</div>
    <div class="card-meaning">${you.meaning[lang] || you.meaning.en}</div>`;
  showRevealMode();
  document.getElementById('btn-hear-review').classList.remove('hidden');
}

function renderKanaCard(card) {
  document.getElementById('card-front').innerHTML = `
    <div class="card-type">${t(card.type)}</div>
    <div class="card-jp">${card.char}</div>
    <div class="card-hint">${t('tapToHear')}</div>`;
  document.getElementById('card-back').innerHTML = `
    <div class="card-type">${t(card.type)}</div>
    <div class="card-jp">${card.char}</div>
    <div class="card-romaji">${card.romaji}</div>
    <div class="card-example">${card.example.jp}<br><small>${card.example[currentLang] || card.example.en}</small></div>`;
  showRevealMode();
  document.getElementById('btn-hear-review').classList.remove('hidden');
}

function renderVocabPhraseCard(card) {
  const lang = currentLang;
  const ctx = card.context ? (card.context[lang] || card.context.en) : '';
  const meaning = card.meaning[lang] || card.meaning.en;
  document.getElementById('card-front').innerHTML = `
    <div class="card-type">${ctx}</div>
    <div class="card-meaning" style="font-size:${meaning.length > 40 ? '16px' : '20px'}">${meaning}</div>
    <div class="card-hint">${t('tapToHear')}</div>`;
  const jpSize = card.japanese.length > 12 ? '22px' : card.japanese.length > 6 ? '30px' : '42px';
  document.getElementById('card-back').innerHTML = `
    <div class="card-type">${ctx}</div>
    <div class="card-jp" style="font-size:${jpSize}">${card.japanese}</div>
    <div class="card-romaji">${card.romaji}</div>
    <div class="card-meaning" style="font-size:14px;color:var(--gray-600)">${meaning}</div>`;
  showRevealMode();
  document.getElementById('btn-hear-review').classList.remove('hidden');
}

function showRevealMode() {
  document.getElementById('btn-reveal').textContent = t('reveal');
  document.getElementById('btn-reveal').classList.remove('hidden');
  document.getElementById('card-actions').classList.remove('hidden');
  document.getElementById('grade-buttons').classList.add('hidden');
}

function revealCard() {
  const card = session.cards[session.index];
  if (card.type === 'tip') { gradeCurrentCard(3); return; } // auto-grade tips
  if (session.flipped) return;
  session.flipped = true;
  document.getElementById('card-inner').classList.add('flipped');
  document.getElementById('btn-reveal').classList.add('hidden');
  document.getElementById('card-actions').classList.add('hidden');
  document.getElementById('grade-buttons').classList.remove('hidden');
  // Auto-play TTS on reveal for kana and scenarios
  if (card.type === 'hiragana' || card.type === 'katakana') speak(card.char);
  if (card.type === 'scenario') speak(card.youSay.japanese);
}

function hearCurrentCard() {
  const card = session.cards[session.index];
  if (card.type === 'hiragana' || card.type === 'katakana') speak(card.char);
  else if (card.type === 'scenario') {
    const text = session.flipped ? card.youSay.japanese : card.theyAsk.japanese;
    speak(text);
  }
  else speak(card.japanese || card.kana);
}

function gradeCurrentCard(grade) {
  const card = session.cards[session.index];
  const isNew = !progress.cardStates[card.id];
  const prev = progress.cardStates[card.id] || initCardState();
  progress = setCardState(progress, card.id, gradeCard(prev, grade));
  const xp = xpForGrade(grade, isNew);
  session.xpGained += xp;
  if (grade >= 2) session.correct++;
  progress = addXP(progress, xp);
  checkUnlocks();
  saveProgress(progress);
  session.index++;
  if (session.index >= session.cards.length) endSession();
  else showCard();
}

function endSession() {
  const total = session.cards.length;
  const acc = total > 0 ? Math.round((session.correct / total) * 100) : 0;
  document.getElementById('modal-xp').textContent = `+${session.xpGained} XP`;
  document.getElementById('modal-stats').innerHTML = `${t('reviewed')}: ${total}<br>${t('accuracy')}: ${acc}%`;
  document.getElementById('modal-complete').classList.remove('hidden');
  renderHome();
}

// ─── SPEAK / CONVERSATIONS ────────────────────────────────────────────────────
function renderSpeak() {
  const container = document.getElementById('convo-list');
  if (!container) return;
  container.innerHTML = '';
  CONVERSATIONS.forEach(scenario => {
    const completions = (progress.completedConvos || {})[scenario.id] || 0;
    const title = scenario.title[currentLang] || scenario.title.en;
    const subtitle = scenario.subtitle[currentLang] || scenario.subtitle.en;
    const btn = document.createElement('button');
    btn.className = 'convo-card';
    btn.innerHTML =
      `<div class="convo-card-icon">${scenario.icon}</div>` +
      `<div class="convo-card-info">` +
        `<div class="convo-card-title">${title}</div>` +
        `<div class="convo-card-sub">${subtitle}</div>` +
      `</div>` +
      (completions > 0
        ? `<div class="convo-done">✓</div>`
        : `<div class="convo-arrow">›</div>`);
    btn.addEventListener('click', () => startConvo(scenario));
    container.appendChild(btn);
  });
}

// ─── Unlocks ─────────────────────────────────────────────────────────────────
function initUnlockedSet() {
  CHAPTERS.forEach(ch => { if (isChapterUnlocked(progress, ch)) unlockedSet.add(ch.id); });
}

function checkUnlocks() {
  CHAPTERS.forEach(ch => {
    if (!unlockedSet.has(ch.id) && isChapterUnlocked(progress, ch)) {
      unlockedSet.add(ch.id);
      const title = ch.title[currentLang] || ch.title.en;
      document.getElementById('unlock-name').textContent = title;
      document.getElementById('modal-unlock').classList.remove('hidden');
    }
  });
}

// ─── Utils ───────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// ─── Boot ────────────────────────────────────────────────────────────────────
init();
