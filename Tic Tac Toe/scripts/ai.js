/**
 * ai.js — AI strategies for Tic Tac Toe
 *
 * Three difficulty levels, each exported as a pure function:
 *   getEasyMove   — random valid cell
 *   getMediumMove — block / win / center / random
 *   getHardMove   — minimax with alpha-beta pruning
 */

import { getEmptyCells, cloneBoard, checkWinner, isBoardFull } from './utils.js';

/* ─── Memoization cache for minimax ─── */
const memo = new Map();

/** Hash a board state for memoization key. */
function boardKey(board, isMax) {
    return board.join('') + (isMax ? '1' : '0');
}

/** Clear the memoization cache (call between games). */
export function clearMemoCache() {
    memo.clear();
}

/* ────────────────────────── Easy ────────────────────────── */

/**
 * Pick a random empty cell.
 * @param {string[]} board
 * @returns {number} Cell index
 */
export function getEasyMove(board) {
    const empty = getEmptyCells(board);
    return empty[Math.floor(Math.random() * empty.length)];
}

/* ────────────────────────── Medium ────────────────────────── */

/**
 * Try to win → block player → take center → random.
 * @param {string[]} board
 * @param {string} aiMark   - 'O'
 * @param {string} playerMark - 'X'
 * @returns {number}
 */
export function getMediumMove(board, aiMark = 'O', playerMark = 'X') {
    const empty = getEmptyCells(board);

    // 1. Can AI win in one move?
    for (const idx of empty) {
        const b = cloneBoard(board);
        b[idx] = aiMark;
        if (checkWinner(b, aiMark)) return idx;
    }

    // 2. Must block player from winning?
    for (const idx of empty) {
        const b = cloneBoard(board);
        b[idx] = playerMark;
        if (checkWinner(b, playerMark)) return idx;
    }

    // 3. Take center if available
    if (board[4] === '') return 4;

    // 4. Take a corner
    const corners = [0, 2, 6, 8].filter(i => board[i] === '');
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

    // 5. Random remaining
    return empty[Math.floor(Math.random() * empty.length)];
}

/* ────────────────────────── Hard (Minimax) ────────────────────────── */

/**
 * Minimax with alpha-beta pruning.
 * Returns the optimal cell index for the AI.
 *
 * @param {string[]} board
 * @param {string} aiMark
 * @param {string} playerMark
 * @returns {number}
 */
export function getHardMove(board, aiMark = 'O', playerMark = 'X') {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (const idx of getEmptyCells(board)) {
        const b = cloneBoard(board);
        b[idx] = aiMark;
        const score = minimax(b, 0, false, -Infinity, Infinity, aiMark, playerMark);
        if (score > bestScore) {
            bestScore = score;
            bestMove = idx;
        }
    }
    return bestMove;
}

/**
 * Minimax recursive evaluation.
 * @param {string[]} board
 * @param {number} depth
 * @param {boolean} isMaximizing — true when it's AI's turn
 * @param {number} alpha
 * @param {number} beta
 * @param {string} aiMark
 * @param {string} playerMark
 * @returns {number}
 */
function minimax(board, depth, isMaximizing, alpha, beta, aiMark, playerMark) {
    // Terminal checks
    if (checkWinner(board, aiMark)) return 10 - depth;
    if (checkWinner(board, playerMark)) return depth - 10;
    if (isBoardFull(board)) return 0;

    // Memoization lookup
    const key = boardKey(board, isMaximizing);
    if (memo.has(key)) return memo.get(key);

    const empty = getEmptyCells(board);
    let result;

    if (isMaximizing) {
        let best = -Infinity;
        for (const idx of empty) {
            const b = cloneBoard(board);
            b[idx] = aiMark;
            const score = minimax(b, depth + 1, false, alpha, beta, aiMark, playerMark);
            best = Math.max(best, score);
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        result = best;
    } else {
        let best = Infinity;
        for (const idx of empty) {
            const b = cloneBoard(board);
            b[idx] = playerMark;
            const score = minimax(b, depth + 1, true, alpha, beta, aiMark, playerMark);
            best = Math.min(best, score);
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        result = best;
    }

    memo.set(key, result);
    return result;
}

/* ────────────────────────── Dispatcher ────────────────────────── */

/**
 * Get the AI's move based on the current difficulty setting.
 * @param {string[]} board
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {string} aiMark
 * @param {string} playerMark
 * @returns {number}
 */
export function getAIMove(board, difficulty, aiMark = 'O', playerMark = 'X') {
    switch (difficulty) {
        case 'medium': return getMediumMove(board, aiMark, playerMark);
        case 'hard': return getHardMove(board, aiMark, playerMark);
        default: return getEasyMove(board);
    }
}
