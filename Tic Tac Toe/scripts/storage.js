/**
 * storage.js — localStorage wrapper for Tic Tac Toe
 *
 * Persists scores, level, draws, difficulty, theme, leaderboard, and lifetime stats.
 */

const STORAGE_KEY = 'tictactoe_state';
const LEADERBOARD_KEY = 'tictactoe_leaderboard';
const STATS_KEY = 'tictactoe_stats';

/**
 * Default state shape — used when nothing is stored yet.
 */
function defaultState() {
    return {
        playerScore: 0,
        aiScore: 0,
        level: 1,
        playerWins: 0,
        hardWins: 0,
        drawStreak: 0,
        difficulty: 'easy',
        manualDifficulty: false,
        theme: 'dark',
        gameMode: 'pvai',
        soundEnabled: true,
        playerRating: 1000,
        rank: 'Intermediate',
        aiPersonality: 'perfect',
        adaptiveWinStreak: 0,
        adaptiveLossStreak: 0,
        adaptiveDifficulty: true,
    };
}

/**
 * Default lifetime stats shape.
 */
function defaultStats() {
    return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0,
        fastestWin: null,
    };
}

/* ────────────── State ────────────── */

export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
        return defaultState();
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* Storage full */ }
}

export function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

/* ────────────── Lifetime Stats ────────────── */

export function loadStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return defaultStats();
        return { ...defaultStats(), ...JSON.parse(raw) };
    } catch {
        return defaultStats();
    }
}

export function saveStats(stats) {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch { /* Storage full */ }
}

/* ────────────── Leaderboard ────────────── */

export function getLeaderboard() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function addLeaderboardEntry(name, wins) {
    const board = getLeaderboard();
    board.push({ name, wins, date: new Date().toLocaleDateString() });
    board.sort((a, b) => b.wins - a.wins);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 10)));
}

/* ────────────── Match Replays ────────────── */

export function loadReplays() {
    try {
        const raw = localStorage.getItem('ttt_replays');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveReplay(replayData) {
    try {
        const replays = loadReplays();
        replays.unshift(replayData); // Add to beginning (newest first)

        // Keep only the last 10 replays to save storage
        if (replays.length > 10) replays.length = 10;

        localStorage.setItem('ttt_replays', JSON.stringify(replays));
    } catch { /* Storage full */ }
}
