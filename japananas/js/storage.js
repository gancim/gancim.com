const STORAGE_KEY = 'japananas_v2';

function defaultProgress() {
  return {
    language: null,
    streak: 0,
    lastStudyDate: null,
    xp: 0,
    studyDays: [],
    cardStates: {},
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch(e) { return defaultProgress(); }
}

function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch(e) {}
}

function updateStreak(p) {
  const today = new Date().toISOString().slice(0, 10);
  if (!p.studyDays) p.studyDays = [];
  if (!p.studyDays.includes(today)) {
    p.studyDays.push(today);
    if (p.studyDays.length > 30) p.studyDays = p.studyDays.slice(-30);
  }
  if (p.lastStudyDate === today) return p;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  p.streak = (p.lastStudyDate === yesterday) ? (p.streak || 0) + 1 : 1;
  p.lastStudyDate = today;
  return p;
}

function addXP(p, amount) {
  p.xp = (p.xp || 0) + amount;
  return p;
}

function getCardState(p, id) { return p.cardStates[id] || null; }

function setCardState(p, id, state) {
  p.cardStates[id] = state;
  return p;
}

function getChapterProgress(p, chapter) {
  if (!chapter.cards.length) return 0;
  const learned = chapter.cards.filter(c => {
    const s = p.cardStates[c.id];
    return s && s.learned;
  }).length;
  return learned / chapter.cards.length;
}

function isChapterUnlocked(p, chapter) {
  if (!chapter.unlockAfter) return true;
  const parent = CHAPTERS.find(c => c.id === chapter.unlockAfter);
  if (!parent) return true;
  return getChapterProgress(p, parent) >= chapter.unlockThreshold;
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
