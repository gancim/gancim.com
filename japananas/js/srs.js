// SM-2 Spaced Repetition System
function initCardState() {
  return {
    interval: 0,
    easiness: 2.5,
    repetitions: 0,
    nextReview: 0,      // 0 = new card, due immediately
    lastReview: null,
    learned: false,     // true after first "good" or better
  };
}

// grade: 0=again, 1=hard, 2=good, 3=easy
function gradeCard(state, grade) {
  const s = { ...state };
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  if (grade === 0) {
    // Reset — see again in 10 minutes (stored as fractional day)
    s.repetitions = 0;
    s.interval = 1;
    s.nextReview = now + 10 * 60 * 1000;
  } else if (grade === 1) {
    // Hard — slight interval increase, don't count as full repetition
    s.interval = Math.max(1, Math.round(s.interval * 1.2));
    s.nextReview = now + s.interval * DAY;
    s.repetitions++;
  } else if (grade === 2) {
    // Good — standard SM-2 progression
    if (s.repetitions === 0)      s.interval = 1;
    else if (s.repetitions === 1) s.interval = 4;
    else                          s.interval = Math.round(s.interval * s.easiness);
    s.repetitions++;
    s.nextReview = now + s.interval * DAY;
    s.learned = true;
  } else {
    // Easy — accelerated
    if (s.repetitions === 0)      s.interval = 4;
    else if (s.repetitions === 1) s.interval = 7;
    else                          s.interval = Math.round(s.interval * s.easiness * 1.3);
    s.repetitions++;
    s.nextReview = now + s.interval * DAY;
    s.learned = true;
  }

  // Update easiness factor (min 1.3)
  s.easiness = Math.max(1.3,
    s.easiness + 0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02)
  );

  s.lastReview = now;
  return s;
}

function isDue(state) {
  if (!state) return true; // new card
  return Date.now() >= state.nextReview;
}

function getDueCards(allCards, cardStates) {
  return allCards.filter(card => {
    const state = cardStates[card.id];
    return !state || isDue(state);
  });
}

// XP per grade
const XP_MAP = { 0: 1, 1: 3, 2: 5, 3: 8 };
function xpForGrade(grade, isNew) {
  return (isNew ? 5 : 0) + XP_MAP[grade];
}
