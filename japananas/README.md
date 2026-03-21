# 🍍 Japananas

A mobile-first Japanese learning app for people living in Japan. No backend, no account, no subscription — runs entirely in the browser and saves progress in `localStorage`.

**Live:** [gancim.github.io/gancim.com/japananas](https://gancim.github.io/gancim.com/japananas/)

---

## What it does

Japananas uses two complementary learning modes:

**Live Conversations** — The primary mode. The app simulates real Japanese conversations (konbini checkout, taxi ride, doctor visit, phone call, etc.) using the browser's Text-to-Speech API. You respond with your actual voice. The app listens, matches keywords, and the conversation branches based on what you say. Miss twice and the model answer is spoken aloud for you to shadow.

**Kana Drill** — Spaced repetition flashcards for hiragana and katakana. Cards are scheduled using the SM-2 algorithm so you review at the optimal moment.

---

## Features

- 10 branching conversation simulations covering everyday life in Japan
- 95 hiragana + 79 katakana flashcards with SM-2 spaced repetition
- Voice input (Web Speech API) + Japanese TTS (`ja-JP`)
- Bilingual UI: English and Italian
- Readiness ring — 60% conversation progress + 40% kana mastery
- XP system: +30 XP first conversation completion, +10 XP replays
- Day streak tracker
- 100% static — works as a GitHub Pages site with no build step
- PWA manifest for mobile home screen installation

---

## Tech stack

| Layer | Detail |
|---|---|
| Language | Vanilla JS (ES6), no frameworks, no build step |
| Styling | CSS custom properties, mobile-first |
| Speech | `speechSynthesis` (TTS) + `SpeechRecognition` (STT) |
| Storage | `localStorage` under key `japananas_v2` |
| SRS | SM-2 algorithm (implemented in `js/srs.js`) |
| Hosting | GitHub Pages (static) |

---

## File structure

```
japananas/
├── index.html              # SPA shell — all views as hidden divs
├── style.css               # All styles, CSS variables, animations
├── icon.svg                # App icon (black rounded square + banana)
├── manifest.json           # PWA manifest
└── js/
    ├── i18n.js             # Translations (EN + IT), setLang(), t()
    ├── data.js             # HIRAGANA, KATAKANA arrays + CHAPTERS
    ├── conversations.js    # 10 conversation dialogue trees + template
    ├── srs.js              # SM-2 algorithm, gradeCard(), isDue()
    ├── speech.js           # speak(), startRecognition(), stopRecognition()
    ├── storage.js          # loadProgress(), saveProgress(), addXP()
    ├── convo-engine.js     # Conversation engine (runNode, branching, TTS loop)
    └── app.js              # View routing, renderHome(), renderLearn(), events
```

Script load order matters: `i18n → data → conversations → srs → speech → storage → convo-engine → app`

---

## Running locally

No build step required — just serve the folder over HTTP:

```bash
npx serve .
# or
python3 -m http.server 3000
```

Then open `http://localhost:3000`.

> Opening `index.html` directly as a `file://` URL will break the Web Speech API in some browsers. Always use a local server.

---

## Adding a conversation scenario

All conversations live in `js/conversations.js`. A full copy-paste template with documentation is at the bottom of that file. The short version:

```js
// Add this object to the CONVERSATIONS array (before the final ];)
{
  id: 'my-scenario',           // unique, no spaces
  icon: '🏷️',
  title:    { en: 'My Scenario',  it: 'Il mio scenario' },
  subtitle: { en: 'Step · Step', it: 'Passo · Passo' },
  situation:{ en: 'You are ...',  it: 'Sei ...' },
  start: 'first-node',
  nodes: {

    'first-node': {
      type: 'them',                        // Japanese side speaks
      japanese: 'いらっしゃいませ。',
      romaji:   'Irasshaimase.',
      meaning:  { en: 'Welcome!', it: 'Benvenuto!' },
      next: 'you-respond',
    },

    'you-respond': {
      type: 'you',                         // User's turn
      prompt: { en: 'Respond', it: 'Rispondi' },
      hint:   { en: 'Say はい', it: "Di' はい" },
      model:  { japanese: 'はい', romaji: 'Hai' },
      branches: [
        { keywords: ['はい','hai','yes'], next: 'end' },
      ],
      fallback: 'end',
    },

    end: {
      type: 'end',
      message: { en: 'Done! 🎉', it: "Fatto! 🎉" },
    },

  },
},
```

**Keyword tips:** include Japanese kana/kanji, romaji, and English equivalents. The engine does a case-insensitive substring match against the full transcript. Be generous — 5–15 keywords per branch is typical.

---

## Node types

| Type | Description |
|---|---|
| `narrator` | Grey italic text, auto-advances after 1.8s |
| `them` | Japanese side speaks via TTS (black bubble, left). Auto-advances after TTS + optional `pause` ms |
| `you` | Mic activates. Shows `prompt`, then `hint` after 1st fail, `model` answer spoken aloud after 2nd fail. `fallback` node used when user taps Skip |
| `end` | Completion screen with XP reward |

---

## Conversation engine flow

```
startConvo(scenario)
  └─ runConvoNode()
       ├─ 'narrator' → show text → wait 1.8s → next node
       ├─ 'them'     → show bubble → TTS → wait pause ms → next node
       ├─ 'you'      → show prompt → startRecognition()
       │                └─ match keywords → add bubble → next node
       │                └─ no match (attempt 1) → show hint → retry
       │                └─ no match (attempt 2) → speak model → show Skip
       └─ 'end'      → award XP → show completion screen
```

---

## Readiness ring

The ring combines two signals:

```
readiness = (kana_mastered / total_kana) × 0.4
          + (conversations_done / total_conversations) × 0.6
```

Conversations are weighted higher because they reflect real usability in Japan more accurately than reading drills.

---

## License

MIT
