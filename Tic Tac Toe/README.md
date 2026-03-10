# Tic Tac Toe — Neon Arena 🎮

A production-grade Tic Tac Toe browser game with intelligent AI, online multiplayer, and a modern neon UI.

**[▶ Play Live](./index.html)** · Built with vanilla HTML, CSS & JavaScript — zero build step required.

---

## ✨ Features

| Category | Details |
|----------|---------|
| **AI** | 3 levels: Easy (random), Medium (block/win heuristics), Hard (Minimax + α-β pruning + memoization) |
| **Multiplayer** | Local PvP · Online PvP via WebRTC (PeerJS) — create/join rooms with 6-char codes, share links |
| **Progression** | Level up by winning or consecutive draws · Champion mode at Hard |
| **UI/UX** | Glassmorphism · Neon glow effects · Particle background · Confetti · 3 themes (dark/light/neon) |
| **Sound** | Web Audio API synthesized effects — no external files |
| **Stats** | Lifetime statistics with win-rate ring · Best streak · Fastest win |
| **PWA** | Installable · Offline play via Service Worker |
| **Accessibility** | ARIA labels · Keyboard grid navigation · Skip-link · Reduced motion support |

---

## 🏗️ Architecture

```
project/
├── index.html              Main page
├── manifest.json           PWA manifest
├── service-worker.js       Cache-first service worker
├── styles/
│   └── style.css           Design system + all styles
├── scripts/
│   ├── game.js             Entry point — orchestrates everything
│   ├── state.js            Reactive state manager (pub/sub)
│   ├── ai.js               AI strategies (Easy/Medium/Hard)
│   ├── ui.js               DOM rendering, sounds, animations
│   ├── storage.js          localStorage persistence
│   ├── multiplayer.js      PeerJS WebRTC wrapper
│   ├── analytics.js        Lightweight event tracker
│   └── utils.js            Pure utility functions
├── tests/
│   └── test-runner.html    Browser-based test suite
├── docs/
│   └── ARCHITECTURE.md     Detailed architecture docs
└── .github/
    └── workflows/
        └── deploy.yml      GitHub Actions CI/CD
```

All modules use **ES6 imports** — no bundler needed. The `state.js` module provides a reactive store with `getState()`, `setState()`, `subscribe()`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.

---

## 🚀 Quick Start

```bash
# Option 1: Any static server
npx serve .

# Option 2: Python
python -m http.server 3000

# Option 3: VS Code Live Server extension
```

Open `http://localhost:3000` and play!

---

## 🧪 Testing

Open `tests/test-runner.html` in a browser — tests run automatically and display results.

Tests cover:
- Win detection (all 8 combos)
- Draw detection
- AI move validation (all 3 difficulties)
- State manager (setState, subscribe, reset)

---

## 🌐 Deployment

### Netlify
Drop the project folder into [Netlify](https://app.netlify.com/drop) — done.

### Vercel
```bash
npx vercel --prod
```

### GitHub Pages
Push to a repo and enable Pages from Settings → Pages → Source: main branch.

The included `.github/workflows/deploy.yml` auto-deploys to GitHub Pages on every push.

---

## 📊 Tech Stack

- **HTML5** — semantic structure, ARIA attributes
- **CSS3** — custom properties, glassmorphism, keyframe animations
- **JavaScript ES6+** — modules, async/await, structuredClone
- **Web Audio API** — synthesized sounds
- **PeerJS** — WebRTC peer-to-peer multiplayer
- **Service Worker** — offline caching

---

## 📄 License

MIT — feel free to use, modify, and deploy.
