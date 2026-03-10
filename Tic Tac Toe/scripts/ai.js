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
export function getAIMove(board, difficulty, aiMark = 'O', playerMark = 'X', personality = 'perfect') {
    // If difficulty is easy, we just do random regardless of personality
    if (difficulty === 'easy' || personality === 'random') {
        return getEasyMove(board);
    }

    // For medium/hard, we blend difficulty with personality
    if (personality === 'aggressive') {
        return getAggressiveMove(board, aiMark, playerMark, difficulty === 'hard');
    }
    if (personality === 'defensive') {
        return getDefensiveMove(board, aiMark, playerMark, difficulty === 'hard');
    }

    // Default 'perfect' (or unhandled)
    if (difficulty === 'medium') {
        return getMediumMove(board, aiMark, playerMark);
    }
    return getHardMove(board, aiMark, playerMark);
}

/* ────────────────────────── Personalities ────────────────────────── */

/**
 * Aggressive AI: Heavily prioritizes finding its own winning moves.
 * If hard is true, uses depth-limited search looking for forced wins.
 * If false, just looks 1 step ahead for wins, then random.
 */
function getAggressiveMove(board, aiMark, playerMark, isHard) {
    // 1. Can I win immediately?
    const winMove = findWinningMove(board, aiMark);
    if (winMove !== -1) return winMove;

    if (isHard) {
        // Evaluate all empty cells by how many winning lines they create
        const empty = getEmptyCells(board);
        let bestScore = -Infinity;
        let bestMoves = [];

        for (const idx of empty) {
            let score = 0;
            const b = cloneBoard(board);
            b[idx] = aiMark;

            // Does this create multiple win threats (fork)?
            let threats = 0;
            const remEmpty = getEmptyCells(b);
            for (const nxt of remEmpty) {
                const b2 = cloneBoard(b);
                b2[nxt] = aiMark;
                if (checkWinner(b2, aiMark)) threats++;
            }
            score += (threats * 10);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [idx];
            } else if (score === bestScore) {
                bestMoves.push(idx);
            }
        }

        if (bestMoves.length > 0 && bestScore > 0) {
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }
    }

    // Fallback: take center, then random empty
    if (board[4] === '') return 4;
    return getEasyMove(board);
}

/**
 * Defensive AI: Heavily prioritizes blocking the player over its own win.
 */
function getDefensiveMove(board, aiMark, playerMark, isHard) {
    // 1. Must block immediate player win
    const blockMove = findWinningMove(board, playerMark);
    if (blockMove !== -1) return blockMove;

    if (isHard) {
        // Prevent player forks
        const empty = getEmptyCells(board);
        let maxThreatRemoved = -1;
        let bestMoves = [];

        for (const idx of empty) {
            // Count player threats BEFORE we move here
            let initialThreats = 0;
            const emptyBefore = getEmptyCells(board);
            for (const nxt of emptyBefore) {
                if (nxt === idx) continue;
                const tb = cloneBoard(board);
                tb[nxt] = playerMark;
                if (checkWinner(tb, playerMark)) initialThreats++;
            }

            // Count player threats AFTER we move here
            let threatsAfter = 0;
            const b = cloneBoard(board);
            b[idx] = aiMark;
            const emptyAfter = getEmptyCells(b);
            for (const nxt of emptyAfter) {
                const tb = cloneBoard(b);
                tb[nxt] = playerMark;
                if (checkWinner(tb, playerMark)) threatsAfter++;
            }

            const threatReduction = initialThreats - threatsAfter;
            if (threatReduction > maxThreatRemoved) {
                maxThreatRemoved = threatReduction;
                bestMoves = [idx];
            } else if (threatReduction === maxThreatRemoved) {
                bestMoves.push(idx);
            }
        }

        if (bestMoves.length > 0 && maxThreatRemoved > 0) {
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }
    }

    // Fallback: Block corners if player has center, etc (just use medium fallback)
    return getMediumMove(board, aiMark, playerMark);
}
