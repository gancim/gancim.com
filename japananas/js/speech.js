// ─── Text-to-Speech ──────────────────────────────────────────────────────────
let speechRate = 0.8;

function isTTSSupported() {
  return 'speechSynthesis' in window;
}

function speak(text, onEnd) {
  if (!isTTSSupported()) return;
  speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = speechRate;
  utter.pitch = 1;

  // Try to pick a Japanese voice
  const voices = speechSynthesis.getVoices();
  const jpVoice = voices.find(v => v.lang.startsWith('ja'));
  if (jpVoice) utter.voice = jpVoice;

  if (onEnd) utter.onend = onEnd;
  speechSynthesis.speak(utter);
}

// Wait for voices to load (needed on some browsers)
function ensureVoices(callback) {
  if (speechSynthesis.getVoices().length > 0) {
    callback();
  } else {
    speechSynthesis.onvoiceschanged = () => {
      speechSynthesis.onvoiceschanged = null;
      callback();
    };
    // Fallback: just try anyway after a delay
    setTimeout(callback, 300);
  }
}

function setSpeechRate(rate) {
  speechRate = parseFloat(rate);
}

// ─── Speech Recognition ──────────────────────────────────────────────────────
let recognition = null;
let isRecognizing = false;

function isSpeechRecognitionSupported() {
  return ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function startRecognition(onResult, onError) {
  if (!isSpeechRecognitionSupported()) {
    onError('not_supported');
    return;
  }
  if (isRecognizing) stopRecognition();

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'ja-JP';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  isRecognizing = true;

  recognition.onresult = (e) => {
    isRecognizing = false;
    const results = [];
    for (let i = 0; i < e.results[0].length; i++) {
      results.push(e.results[0][i].transcript.trim());
    }
    onResult(results);
  };

  recognition.onerror = (e) => {
    isRecognizing = false;
    onError(e.error);
  };

  recognition.onend = () => {
    isRecognizing = false;
  };

  recognition.start();
}

function stopRecognition() {
  if (recognition && isRecognizing) {
    recognition.stop();
    isRecognizing = false;
  }
}

// Check if spoken text matches target (flexible)
function checkSpeechMatch(spoken, target) {
  if (!spoken || !target) return false;
  // Normalize: remove punctuation, lowercase
  const normalize = s => s.replace(/[。、？！\s]/g, '').toLowerCase();
  const norm_spoken = normalize(spoken);
  const norm_target = normalize(target);
  if (norm_spoken === norm_target) return true;
  // Partial match (at least 70% of target present)
  if (norm_target.length > 3) {
    const overlap = longestCommonSubstring(norm_spoken, norm_target);
    return overlap / norm_target.length >= 0.7;
  }
  return norm_spoken.includes(norm_target) || norm_target.includes(norm_spoken);
}

function longestCommonSubstring(a, b) {
  let max = 0;
  const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i-1] === b[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
        if (dp[i][j] > max) max = dp[i][j];
      }
    }
  }
  return max;
}
