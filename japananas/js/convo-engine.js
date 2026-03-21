// ─── Conversation Engine ───────────────────────────────────────────────────────

let convo = {
  scenario: null,
  nodeId: null,
  history: [],
  attempts: 0,
  listening: false,
  complete: false,
};

function startConvo(scenario) {
  speechSynthesis.cancel && speechSynthesis.cancel();
  if (typeof stopRecognition === 'function') stopRecognition();

  convo = {
    scenario,
    nodeId: scenario.start,
    history: [],
    attempts: 0,
    listening: false,
    complete: false,
  };

  // Update header
  document.getElementById('convo-title').textContent =
    scenario.title[currentLang] || scenario.title.en;

  // Update situation
  document.getElementById('convo-situation').textContent =
    scenario.situation[currentLang] || scenario.situation.en;

  // Clear chat
  document.getElementById('convo-chat').innerHTML = '';

  // Show input area, hide end
  document.getElementById('convo-footer').style.display = 'flex';
  document.getElementById('convo-end').style.display = 'none';
  clearConvoHint();

  showView('convo');
  setTimeout(() => runConvoNode(), 400);
}

function runConvoNode() {
  const node = convo.scenario.nodes[convo.nodeId];
  if (!node) return;
  switch (node.type) {
    case 'narrator': handleNarrator(node); break;
    case 'them':     handleThem(node);     break;
    case 'you':      handleYou(node);      break;
    case 'end':      handleConvoEnd(node); break;
  }
}

function handleNarrator(node) {
  addChatBubble('narrator', { text: node.text[currentLang] || node.text.en });
  setConvoInputState('idle');
  setTimeout(() => { convo.nodeId = node.next; runConvoNode(); }, 1800);
}

function handleThem(node) {
  addChatBubble('them', {
    japanese: node.japanese,
    romaji: node.romaji,
    meaning: node.meaning[currentLang] || node.meaning.en,
  });
  setConvoInputState('speaking');
  speak(node.japanese, () => {
    setConvoInputState('idle');
    setTimeout(() => {
      convo.nodeId = node.next;
      runConvoNode();
    }, node.pause !== undefined ? node.pause : 800);
  });
}

function handleYou(node) {
  convo.attempts = 0;
  setConvoInputState('your-turn');
  document.getElementById('convo-prompt').textContent =
    node.prompt[currentLang] || node.prompt.en;
  clearConvoHint();
  listenForConvoResponse(node);
}

function listenForConvoResponse(node) {
  if (convo.complete) return;
  convo.listening = true;
  setConvoMicActive(true);
  startRecognition(
    (transcript) => {
      convo.listening = false;
      setConvoMicActive(false);
      handleConvoSpeech(transcript, node);
    },
    () => {
      convo.listening = false;
      setConvoMicActive(false);
      handleConvoMiss(node);
    }
  );
}

function handleConvoSpeech(transcripts, node) {
  // transcripts is an array of alternatives from speech.js (up to maxAlternatives)
  const alts = Array.isArray(transcripts) ? transcripts : [String(transcripts)];
  const lowers = alts.map(s => s.toLowerCase());
  const displayText = alts[0] || '';

  for (const branch of node.branches) {
    if (branch.keywords.some(kw => lowers.some(alt => alt.includes(kw.toLowerCase())))) {
      addChatBubble('you', { text: displayText });
      convo.attempts = 0;
      clearConvoHint();
      convo.nodeId = branch.next;
      setTimeout(() => runConvoNode(), 500);
      return;
    }
  }
  // No match across any alternative
  convo.attempts++;
  addChatBubble('you', { text: displayText, failed: true });
  handleConvoMiss(node);
}

function handleConvoMiss(node) {
  if (convo.attempts >= 2) {
    showConvoModel(node);
  } else {
    showConvoHint(node.hint[currentLang] || node.hint.en, false);
    setTimeout(() => listenForConvoResponse(node), 1400);
  }
}

function handleConvoEnd(node) {
  convo.complete = true;
  setConvoInputState('idle');
  document.getElementById('convo-footer').style.display = 'none';
  const endEl = document.getElementById('convo-end');
  endEl.style.display = 'flex';
  document.getElementById('convo-end-msg').textContent =
    node.message[currentLang] || node.message.en;

  // Record completion + award XP
  if (!progress.completedConvos) progress.completedConvos = {};
  progress.completedConvos[convo.scenario.id] =
    (progress.completedConvos[convo.scenario.id] || 0) + 1;
  const isFirst = progress.completedConvos[convo.scenario.id] === 1;
  progress = addXP(progress, isFirst ? 30 : 10);
  progress = updateStreak(progress);
  saveProgress(progress);
  renderSpeak(); // refresh the list checkmarks

  // Show XP gained on end screen
  const xpEl = document.getElementById('convo-end-xp');
  if (xpEl) xpEl.textContent = isFirst ? '+30 XP' : '+10 XP';
}

function skipConvoNode() {
  if (typeof stopRecognition === 'function') stopRecognition();
  convo.listening = false;
  const node = convo.scenario.nodes[convo.nodeId];
  if (!node) return;
  addChatBubble('you', { text: node.model.japanese });
  clearConvoHint();
  convo.attempts = 0;
  const next = node.fallback || (node.branches[0] && node.branches[0].next);
  if (next) { convo.nodeId = next; setTimeout(() => runConvoNode(), 400); }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function addChatBubble(type, data) {
  const chat = document.getElementById('convo-chat');
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + type;

  if (type === 'narrator') {
    div.textContent = data.text;
  } else if (type === 'them') {
    div.innerHTML =
      `<div class="bubble-jp">${data.japanese}</div>` +
      `<div class="bubble-sub">${data.romaji} · ${data.meaning}</div>`;
  } else if (type === 'you') {
    div.innerHTML = `<div class="bubble-you-text">${data.text}</div>`;
    if (data.failed) div.classList.add('failed');
  }

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function setConvoInputState(state) {
  const btn = document.getElementById('convo-mic-btn');
  btn.classList.remove('active', 'speaking');
  const prompt = document.getElementById('convo-prompt');
  if (state === 'your-turn') {
    btn.classList.add('active');
    prompt.style.opacity = '1';
  } else if (state === 'speaking') {
    btn.classList.add('speaking');
    prompt.style.opacity = '0.4';
  } else {
    prompt.style.opacity = '0.4';
  }
}

function setConvoMicActive(active) {
  document.getElementById('convo-mic-btn').classList.toggle('listening', active);
}

function showConvoHint(text, withModel) {
  const hint = document.getElementById('convo-hint');
  hint.textContent = text;
  hint.style.display = 'block';
}

function showConvoModel(node) {
  const hint = document.getElementById('convo-hint');
  hint.textContent = node.hint[currentLang] || node.hint.en;
  hint.style.display = 'block';

  const model = document.getElementById('convo-model');
  model.innerHTML =
    `<span class="model-jp">${node.model.japanese}</span>` +
    `<span class="model-romaji"> · ${node.model.romaji}</span>`;
  model.style.display = 'block';

  document.getElementById('convo-skip-wrap').style.display = 'flex';

  // Speak the model answer then let them try again
  speak(node.model.japanese, () => {
    setTimeout(() => listenForConvoResponse(node), 800);
  });
}

function clearConvoHint() {
  const hint = document.getElementById('convo-hint');
  hint.textContent = '';
  hint.style.display = 'none';
  const model = document.getElementById('convo-model');
  model.style.display = 'none';
  document.getElementById('convo-skip-wrap').style.display = 'none';
}
