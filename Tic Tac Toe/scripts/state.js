/**
 * state.js — Central reactive state manager
 *
 * Single source of truth for all game data.
 * Provides getState(), setState(), subscribe() for reactive UI updates.
 */

/* ─────────── Initial State Shape ─────────── */

const initialState = {
    // Board
    board: Array(9).fill(''),
    currentPlayer: 'X',
    gameStatus: 'idle', // 'idle' | 'playing' | 'won' | 'lost' | 'draw'
    isAIThinking: false,
    moveHistory: [],

    // Scores (current session)
    playerScore: 0,
    aiScore: 0,

    // Progression
    playerWins: 0,

    // Lifetime statistics
    stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0,
        fastestWin: null, // seconds
    },

    // Settings
    theme: 'dark',
    gameMode: 'pvai',
    soundEnabled: true,

    // Advanced Indie Features
    playerRating: 1000,
    rank: 'Intermediate',
    aiPersonality: 'perfect',
    adaptiveDifficulty: true,
    matchHistory: [],
    winStreak: 0,
    lossStreak: 0,
    drawStreak: 0,

    // Online
    myMark: 'X',
};

/**
 * Calculate the named rank tier based on a numerical ELO rating.
 */
export function calculateRank(rating) {
    if (rating < 1000) return 'Beginner';
    if (rating < 1200) return 'Intermediate';
    if (rating < 1400) return 'Advanced';
    if (rating < 1600) return 'Master';
    return 'Grandmaster';
}

/* ─────────── Store ─────────── */

let state = structuredClone(initialState);
const subscribers = new Set();

/**
 * Get a read-only snapshot of the current state.
 * @returns {Readonly<typeof initialState>}
 */
export function getState() {
    return state;
}

/**
 * Get the initial/default state shape.
 */
export function getInitialState() {
    return structuredClone(initialState);
}

/**
 * Merge partial updates into the state and notify subscribers.
 * @param {Partial<typeof initialState>} partial
 */
export function setState(partial) {
    const prev = state;
    state = { ...state, ...partial };

    // Deep-merge nested stats object
    if (partial.stats) {
        state.stats = { ...prev.stats, ...partial.stats };
    }

    // Notify all subscribers
    for (const fn of subscribers) {
        try {
            fn(state, prev);
        } catch (e) {
            console.error('[state] subscriber error:', e);
        }
    }
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 * @param {(state: typeof initialState, prev: typeof initialState) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

/**
 * Reset state to initial values (preserves settings + stats).
 */
export function resetGameState() {
    setState({
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameStatus: 'idle',
        isAIThinking: false,
        moveHistory: [],
    });
}

/**
 * Full reset (scores, level, progress — but keep settings + lifetime stats).
 */
export function resetAllScores() {
    setState({
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameStatus: 'idle',
        isAIThinking: false,
        moveHistory: [],
        playerScore: 0,
        aiScore: 0,
        playerWins: 0,
        winStreak: 0,
        lossStreak: 0,
    });
}
