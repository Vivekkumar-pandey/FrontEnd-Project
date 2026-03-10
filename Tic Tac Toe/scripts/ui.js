/**
 * ui.js — DOM rendering, animations, sound effects, and theme management
 *
 * Owns all DOM interaction. Provides exported functions consumed by game.js.
 * v2 — Premium redesign: enhanced particles, sound toggle, score-bump,
 *       accessible theme-radio sync, richer confetti.
 */

/* ══════════════════════════ Sound Engine (Web Audio API) ══════════════════════════ */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

/**
 * Play a short synthesised tone.
 */
function playTone(freq, type, duration, volume = 0.15) {
    if (!soundEnabled) return;
    try {
        const ctx = ensureAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch { /* audio not supported */ }
}

export function playMoveSound() {
    playTone(660, 'sine', 0.07, 0.1);
}

export function playWinSound() {
    [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => playTone(f, 'triangle', 0.28, 0.18), i * 110);
    });
}

export function playLoseSound() {
    [400, 350, 300, 200].forEach((f, i) => {
        setTimeout(() => playTone(f, 'sawtooth', 0.25, 0.08), i * 140);
    });
}

export function playDrawSound() {
    playTone(440, 'square', 0.25, 0.06);
    setTimeout(() => playTone(440, 'square', 0.25, 0.06), 320);
}

export function playLevelUpSound() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => playTone(f, 'triangle', 0.3, 0.2), i * 90);
    });
}

/** Toggle sound on/off. Returns new state. */
export function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (btn) {
        btn.textContent = soundEnabled ? '🔊 Sound' : '🔇 Muted';
        btn.classList.toggle('muted', !soundEnabled);
        btn.setAttribute('aria-pressed', String(soundEnabled));
    }
    return soundEnabled;
}

export function setSoundEnabled(val) {
    soundEnabled = val;
    const btn = document.getElementById('soundToggle');
    if (btn) {
        btn.textContent = val ? '🔊 Sound' : '🔇 Muted';
        btn.classList.toggle('muted', !val);
        btn.setAttribute('aria-pressed', String(val));
    }
}

/* ══════════════════════════ Confetti ══════════════════════════ */

let confettiCanvas = null;
let confettiCtx = null;
let confettiAnimId = null;

function createConfetti() {
    if (!confettiCanvas) {
        confettiCanvas = document.createElement('canvas');
        confettiCanvas.id = 'confettiCanvas';
        confettiCanvas.setAttribute('aria-hidden', 'true');
        confettiCanvas.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
        document.body.appendChild(confettiCanvas);
        confettiCtx = confettiCanvas.getContext('2d');
    }
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCanvas.style.display = 'block';
}

export function launchConfetti(durationMs = 3500) {
    createConfetti();
    const W = confettiCanvas.width;
    const H = confettiCanvas.height;

    const pieces = Array.from({ length: 180 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * -1,
        w: Math.random() * 8 + 4,
        h: Math.random() * 4 + 2,
        dx: (Math.random() - 0.5) * 5,
        dy: Math.random() * 4 + 2.5,
        color: `hsl(${Math.random() * 360}, 85%, 62%)`,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.1 + 0.03,
    }));

    const start = performance.now();

    function draw(now) {
        const elapsed = now - start;
        if (elapsed > durationMs) {
            confettiCanvas.style.display = 'none';
            cancelAnimationFrame(confettiAnimId);
            return;
        }

        const fadeRatio = elapsed > durationMs * 0.7
            ? 1 - (elapsed - durationMs * 0.7) / (durationMs * 0.3)
            : 1;

        confettiCtx.clearRect(0, 0, W, H);
        confettiCtx.globalAlpha = fadeRatio;

        for (const p of pieces) {
            p.x += p.dx + Math.sin(p.wobble) * 0.8;
            p.y += p.dy;
            p.rot += p.rotSpeed;
            p.wobble += p.wobbleSpeed;

            confettiCtx.save();
            confettiCtx.translate(p.x, p.y);
            confettiCtx.rotate((p.rot * Math.PI) / 180);
            confettiCtx.fillStyle = p.color;
            confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            confettiCtx.restore();
        }

        confettiCtx.globalAlpha = 1;
        confettiAnimId = requestAnimationFrame(draw);
    }
    confettiAnimId = requestAnimationFrame(draw);
}

/* ══════════════════════════ Particle Background ══════════════════════════ */

export function initParticleBackground() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create particles with varied colours
    const colors = [
        [0, 229, 255],   // cyan
        [255, 0, 110],   // magenta
        [168, 85, 247],  // purple
        [0, 229, 255],   // more cyan for bias
    ];

    const particles = Array.from({ length: 60 }, () => {
        const c = colors[Math.floor(Math.random() * colors.length)];
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2.2 + 0.4,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.35 + 0.05,
            color: c,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.02 + 0.005,
        };
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.dx;
            p.y += p.dy;
            p.pulse += p.pulseSpeed;

            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            const a = p.alpha + Math.sin(p.pulse) * 0.08;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a})`;
            ctx.fill();

            // Subtle glow ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a * 0.12})`;
            ctx.fill();
        }

        // Draw connection lines for nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 229, 255, ${0.04 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}

/* ══════════════════════════ Theme Switcher ══════════════════════════ */

const themes = {
    dark: {
        '--bg-primary': '#06060f',
        '--bg-secondary': '#0c0c1e',
        '--bg-card': 'rgba(255,255,255,0.035)',
        '--bg-card-solid': '#10102a',
        '--text-primary': '#e8ecf1',
        '--text-secondary': '#8892a4',
        '--text-muted': '#555e70',
        '--accent': '#00e5ff',
        '--accent-rgb': '0,229,255',
        '--accent-secondary': '#ff006e',
        '--accent-sec-rgb': '255,0,110',
        '--cell-bg': 'rgba(255,255,255,0.03)',
        '--cell-hover': 'rgba(0,229,255,0.1)',
        '--border-glow': 'rgba(0,229,255,0.2)',
        '--popup-bg': 'rgba(8,8,22,0.94)',
        '--overlay': 'rgba(0,0,0,0.65)',
    },
    light: {
        '--bg-primary': '#f0f2f7',
        '--bg-secondary': '#e4e8ef',
        '--bg-card': 'rgba(255,255,255,0.8)',
        '--bg-card-solid': '#ffffff',
        '--text-primary': '#1a1d2e',
        '--text-secondary': '#555e70',
        '--text-muted': '#8892a4',
        '--accent': '#0077b6',
        '--accent-rgb': '0,119,182',
        '--accent-secondary': '#e63946',
        '--accent-sec-rgb': '230,57,70',
        '--cell-bg': 'rgba(0,0,0,0.03)',
        '--cell-hover': 'rgba(0,119,182,0.08)',
        '--border-glow': 'rgba(0,119,182,0.15)',
        '--popup-bg': 'rgba(240,242,247,0.96)',
        '--overlay': 'rgba(255,255,255,0.65)',
    },
    neon: {
        '--bg-primary': '#0d0221',
        '--bg-secondary': '#150430',
        '--bg-card': 'rgba(168,85,247,0.06)',
        '--bg-card-solid': '#160535',
        '--text-primary': '#e0d0ff',
        '--text-secondary': '#b090e0',
        '--text-muted': '#7050aa',
        '--accent': '#a855f7',
        '--accent-rgb': '168,85,247',
        '--accent-secondary': '#00e5ff',
        '--accent-sec-rgb': '0,229,255',
        '--cell-bg': 'rgba(168,85,247,0.05)',
        '--cell-hover': 'rgba(168,85,247,0.12)',
        '--border-glow': 'rgba(168,85,247,0.3)',
        '--popup-bg': 'rgba(13,2,33,0.96)',
        '--overlay': 'rgba(0,0,0,0.7)',
    },
    woodBoard: {
        '--bg-primary': '#2c1e16',
        '--bg-secondary': '#3e2a1e',
        '--bg-card': 'rgba(0,0,0,0.4)',
        '--bg-card-solid': '#3e2a1e',
        '--text-primary': '#f4d1ad',
        '--text-secondary': '#c49a6c',
        '--text-muted': '#8c6239',
        '--accent': '#ffb050',
        '--accent-rgb': '255,176,80',
        '--accent-secondary': '#d97732',
        '--accent-sec-rgb': '217,119,50',
        '--cell-bg': 'rgba(0,0,0,0.2)',
        '--cell-hover': 'rgba(255,176,80,0.15)',
        '--border-glow': 'rgba(255,176,80,0.3)',
        '--popup-bg': 'rgba(44,30,22,0.96)',
        '--overlay': 'rgba(0,0,0,0.8)',
    },
    spaceTheme: {
        '--bg-primary': '#050b14',
        '--bg-secondary': '#0a192f',
        '--bg-card': 'rgba(100,255,218,0.05)',
        '--bg-card-solid': '#112240',
        '--text-primary': '#ccd6f6',
        '--text-secondary': '#8892b0',
        '--text-muted': '#495670',
        '--accent': '#64ffda',
        '--accent-rgb': '100,255,218',
        '--accent-secondary': '#0a192f',
        '--accent-sec-rgb': '10,25,47',
        '--cell-bg': 'rgba(100,255,218,0.03)',
        '--cell-hover': 'rgba(100,255,218,0.1)',
        '--border-glow': 'rgba(100,255,218,0.25)',
        '--popup-bg': 'rgba(10,25,47,0.95)',
        '--overlay': 'rgba(2,12,27,0.85)',
    }
};

export function applyTheme(themeName) {
    const vars = themes[themeName] || themes.dark;
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) {
        root.style.setProperty(prop, val);
    }

    // Update ARIA radio state on theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const isActive = btn.dataset.theme === themeName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', String(isActive));
    });
}

/* ══════════════════════════ Board Rendering ══════════════════════════ */

/**
 * Render a cell mark with animation.
 */
export function renderMark(cellEl, mark) {
    const span = document.createElement('span');
    span.textContent = mark;
    span.className = `mark mark-${mark.toLowerCase()}`;
    span.setAttribute('aria-label', mark === 'X' ? 'Player X' : 'Player O');
    cellEl.appendChild(span);
    cellEl.setAttribute('aria-label', `Cell ${cellEl.dataset.index}: ${mark}`);

    // 3D flip animation
    cellEl.classList.add('cell-flip');
    setTimeout(() => cellEl.classList.remove('cell-flip'), 450);

    // Trigger reflow then animate
    void span.offsetWidth;
    span.classList.add('appear');
}

/**
 * Shake the board (used on AI win / loss).
 */
export function shakeBoard() {
    const board = document.getElementById('board');
    if (board) {
        board.classList.add('board-shake');
        setTimeout(() => board.classList.remove('board-shake'), 600);
    }
}

/**
 * Highlight winning cells with pulse animation.
 */
export function highlightWinningCells(combo) {
    combo.forEach(i => {
        const cell = document.querySelector(`.cell[data-index="${i}"]`);
        if (cell) cell.classList.add('win-cell');
    });
}

/**
 * Update the turn indicator.
 */
export function setTurnIndicator(text) {
    const el = document.getElementById('turnIndicator');
    if (el) el.textContent = text;
}

/**
 * Update score display with bump animation.
 */
export function updateScoreDisplay(playerScore, aiScore) {
    const ps = document.getElementById('playerScore');
    const as = document.getElementById('aiScore');

    if (ps) {
        const prev = parseInt(ps.textContent);
        ps.textContent = playerScore;
        if (playerScore > prev) {
            ps.classList.remove('score-bump');
            void ps.offsetWidth;
            ps.classList.add('score-bump');
        }
    }

    if (as) {
        const prev = parseInt(as.textContent);
        as.textContent = aiScore;
        if (aiScore > prev) {
            as.classList.remove('score-bump');
            void as.offsetWidth;
            as.classList.add('score-bump');
        }
    }
}

/**
 * Update rank / ELO display.
 */
export function updateStatsDisplay(rank, rating, playerWins) {
    const rd = document.getElementById('rankDisplay');
    const ed = document.getElementById('eloDisplay');
    const pw = document.getElementById('playerWinsDisplay');
    if (rd) rd.textContent = `🏆 ${rank || 'Intermediate'}`;
    if (ed) ed.textContent = rating || 1000;
    if (pw) pw.textContent = playerWins ?? 0;
}

/**
 * Show / hide a popup.
 */
export function showPopup(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        // Focus the CTA button inside
        const btn = el.querySelector('.btn');
        if (btn) setTimeout(() => btn.focus(), 100);
    }
}

export function hidePopup(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

export function hideAllPopups() {
    document.querySelectorAll('.popup.active').forEach(p => p.classList.remove('active'));
}


/**
 * Set the timer display.
 */
export function setTimerDisplay(seconds) {
    const el = document.getElementById('timer');
    if (el) el.textContent = `⏱ ${seconds}s`;
}

/**
 * Update the game-mode label ("AI" / "Player 2").
 */
export function updateModeLabel(mode) {
    const label = document.getElementById('opponentLabel');
    if (label) {
        if (mode === 'online') label.textContent = 'Opponent';
        else if (mode === 'pvp') label.textContent = 'Player 2';
        else label.textContent = 'AI';
    }
}

/**
 * Update the room info bar (only visible in online mode).
 * @param {string} code
 * @param {number} playerCount
 * @param {string} status
 */
export function updateRoomInfoBar(code, playerCount, status) {
    const codeEl = document.getElementById('roomCodeDisplay');
    const countEl = document.getElementById('roomPlayersCount');
    const statusEl = document.getElementById('roomConnectionStatus');

    if (codeEl) codeEl.textContent = code || '—';
    if (countEl) countEl.textContent = `${playerCount} / 2`;

    if (statusEl) {
        statusEl.textContent = status || 'Waiting...';
        if (status?.toLowerCase().includes('connected')) {
            statusEl.classList.add('connected');
        } else {
            statusEl.classList.remove('connected');
        }
    }
}

/**
 * Render lifetime game statistics in the stats sidebar.
 * @param {{gamesPlayed:number, wins:number, losses:number, draws:number, bestStreak:number, fastestWin:number|null}} stats
 */
export function renderStatsPanel(stats) {
    const el = (id) => document.getElementById(id);
    const winRate = stats.gamesPlayed > 0
        ? Math.round((stats.wins / stats.gamesPlayed) * 100)
        : 0;

    const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };

    set('statGamesPlayed', stats.gamesPlayed);
    set('statWins', stats.wins);
    set('statLosses', stats.losses);
    set('statDraws', stats.draws);
    set('statWinRate', winRate + '%');
    set('statBestStreak', stats.bestStreak);
    set('statFastestWin', stats.fastestWin !== null ? stats.fastestWin + 's' : '—');

    // Win-rate progress ring
    const ring = el('winRateRing');
    if (ring) {
        const circumference = 2 * Math.PI * 54;
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${circumference - (circumference * winRate / 100)}`;
    }
}

/**
 * Render the Match History sidebar list.
 * @param {Array} matches array of match objects
 */
export function renderMatchHistory(matches) {
    const list = document.getElementById('historyList');
    if (!list) return;

    if (!matches || matches.length === 0) {
        list.innerHTML = '<p class="history-empty">No games played yet.</p>';
        return;
    }

    list.innerHTML = matches.map(m => `
        <div class="history-item ${m.outcome}">
            <div class="hi-info">
                <strong>${m.outcome.toUpperCase()}</strong>
                <span>vs ${m.aiPersonality} AI</span>
                <span class="hi-date">${m.date}</span>
            </div>
            <button class="btn btn-sm" onclick="window.startReplay(${m.id})">▶ Replay</button>
        </div>
    `).join('');
}
