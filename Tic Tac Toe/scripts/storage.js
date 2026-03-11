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
        playerWins: 0,
        theme: 'dark',
        gameMode: 'pvai',
        soundEnabled: true,
        playerRating: 1000,
        rank: 'Easy',
        aiPersonality: 'perfect',
        adaptiveDifficulty: true,
        matchHistory: [],
        levelWins: 0,
        drawStreak: 0,
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

