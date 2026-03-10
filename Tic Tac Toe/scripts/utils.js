/**
 * utils.js — Utility helpers for Tic Tac Toe
 * Pure functions with no side effects.
 */

/**
 * Return indices of all empty cells on the board.
 * @param {string[]} board - Array of 9 cells ('X', 'O', or '').
 * @returns {number[]}
 */
export function getEmptyCells(board) {
  return board.reduce((acc, cell, i) => (cell === '' ? [...acc, i] : acc), []);
}

/**
 * Shallow-clone a board array.
 * @param {string[]} board
 * @returns {string[]}
 */
export function cloneBoard(board) {
  return [...board];
}

/** All possible three-in-a-row combinations. */
export const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diags
];

/**
 * Check if `mark` has won on `board`.
 * @returns {number[]|null} Winning combo indices, or null.
 */
export function checkWinner(board, mark) {
  for (const combo of WIN_COMBOS) {
    if (combo.every(i => board[i] === mark)) return combo;
  }
  return null;
}

/**
 * Check if the board is completely filled.
 */
export function isBoardFull(board) {
  return board.every(cell => cell !== '');
}

/**
 * Simple timer utility.
 */
export function createTimer(onTick) {
  let seconds = 0;
  let intervalId = null;

  return {
    start() {
      this.stop();
      seconds = 0;
      onTick(seconds);
      intervalId = setInterval(() => {
        seconds++;
        onTick(seconds);
      }, 1000);
    },
    stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    getSeconds() {
      return seconds;
    },
  };
}
