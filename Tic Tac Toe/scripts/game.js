/**
 * game.js — Central game controller (entry point)
 *
 * Orchestrates state, AI, UI, storage, multiplayer, and analytics.
 * v4 — Reactive state manager, game statistics, analytics, error monitoring.
 */

import { checkWinner, isBoardFull, createTimer } from './utils.js';
import { getState, setState, subscribe, resetGameState, resetAllScores, calculateRank } from './state.js';
import { getRoomCode } from './multiplayer.js';
import { getAIMove } from './ai.js';
import { loadState, saveState, loadStats, saveStats } from './storage.js';
import {
    playMoveSound, playWinSound, playLoseSound, playDrawSound, playLevelUpSound,
    launchConfetti, initParticleBackground, applyTheme,
    renderMark, highlightWinningCells, setTurnIndicator,
    updateScoreDisplay, updateStatsDisplay,
    showPopup, hidePopup, hideAllPopups,
    setTimerDisplay, updateModeLabel, updateRoomInfoBar,
    toggleSound, setSoundEnabled,
    renderStatsPanel,
    shakeBoard,
} from './ui.js';
import {
    createRoom, joinRoom, sendMove, sendRestart, sendLeave,
    onRemoteMove, onStatus, onDisconnect,
    getIsHost, getRoomCode, disconnect, isConnected,
} from './multiplayer.js';
import { trackEvent } from './analytics.js';

/* ════════════════════════ Timer ════════════════════════ */

const timer = createTimer(sec => setTimerDisplay(sec));

/* ════════════════════════ Helpers ════════════════════════ */

const AI_TIERS = ['random', 'defensive', 'aggressive', 'perfect'];

function persistState() {
    const s = getState();
    saveState({
        playerScore: s.playerScore,
        aiScore: s.aiScore,
        level: s.level,
        playerWins: s.playerWins,
        hardWins: s.hardWins,
        drawStreak: s.drawStreak,
        difficulty: s.difficulty,
        manualDifficulty: s.manualDifficulty,
        theme: s.theme,
        gameMode: s.gameMode === 'online' ? 'pvai' : s.gameMode,
        soundEnabled: s.soundEnabled,
        playerRating: s.playerRating,
        rank: s.rank,
        aiPersonality: s.aiPersonality,
        adaptiveDifficulty: s.adaptiveDifficulty,
        matchHistory: s.matchHistory,
    });
    saveStats(s.stats);
}

/* ════════════════════════ Board / Cells ════════════════════════ */

function createBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    setState({
        board: Array(9).fill(''),
        moveHistory: [],
        currentPlayer: 'X',
    });

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `Cell ${i + 1}: empty`);
        cell.addEventListener('click', handleCellClick);
        cell.addEventListener('keydown', handleCellKeydown);
        boardEl.appendChild(cell);
    }

    updateTurnUI();
}

function handleCellKeydown(e) {
    if (replayMode) return;
    const idx = parseInt(e.target.dataset.index);
    if (isNaN(idx)) return;

    // Enter/Space = place mark
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCellClick(e);
        return;
    }

    // Arrow key grid navigation
    let next = -1;
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    if (e.key === 'ArrowRight' && col < 2) next = idx + 1;
    else if (e.key === 'ArrowLeft' && col > 0) next = idx - 1;
    else if (e.key === 'ArrowDown' && row < 2) next = idx + 3;
    else if (e.key === 'ArrowUp' && row > 0) next = idx - 3;

    if (next >= 0) {
        e.preventDefault();
        const nextCell = document.querySelector(`.cell[data-index="${next}"]`);
        if (nextCell) nextCell.focus();
    }
}

function updateTurnUI() {
    const s = getState();
    if (s.gameStatus !== 'playing') {
        setTurnIndicator('');
        return;
    }

    if (s.gameMode === 'online') {
        setTurnIndicator(s.currentPlayer === s.myMark ? '🎮 Your Turn' : '⏳ Opponent\'s Turn');
    } else if (s.gameMode === 'pvp') {
        setTurnIndicator(s.currentPlayer === 'X' ? '🎮 Player 1 (X)' : '🎮 Player 2 (O)');
    } else {
        setTurnIndicator(s.currentPlayer === 'X' ? '🎮 Your Turn' : '🤖 AI Thinking…');
    }
}

/* ════════════════════════ Move Handling ════════════════════════ */

function handleCellClick(e) {
    if (replayMode) return;
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;
    const index = parseInt(cellEl.dataset.index);
    const s = getState();
    if (isNaN(index) || s.board[index] !== '' || s.gameStatus !== 'playing') return;
    if (s.isAIThinking) return;

    if (s.gameMode === 'online') {
        if (s.currentPlayer !== s.myMark) return;
        makeMove(index, s.myMark);
        sendMove(index);
        return;
    }

    makeMove(index, s.currentPlayer);
}

function makeMove(index, mark) {
    const s = getState();
    if (s.board[index] !== '') return;

    const newBoard = [...s.board];
    newBoard[index] = mark;
    const newHistory = [...s.moveHistory, { index, mark }];
    setState({ board: newBoard, moveHistory: newHistory });

    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    renderMark(cell, mark);
    playMoveSound();

    // Check outcome
    const winCombo = checkWinner(newBoard, mark);
    if (winCombo) {
        highlightWinningCells(winCombo);
        setTimeout(() => handleWin(mark), 400);
        return;
    }
    if (isBoardFull(newBoard)) {
        setTimeout(() => handleDraw(), 300);
        return;
    }

    // Switch turn
    const nextPlayer = mark === 'X' ? 'O' : 'X';
    setState({ currentPlayer: nextPlayer });
    updateTurnUI();

    // AI turn
    if (s.gameMode === 'pvai' && nextPlayer === 'O') {
        setState({ isAIThinking: true });
        setTimeout(() => {
            const cur = getState();
            if (cur.gameStatus !== 'playing') return;
            const aiPersonality = cur.aiPersonality;
            console.log("Resolved AI personality:", aiPersonality); // Temporary log for validation
            const aiIdx = getAIMove(cur.board, aiPersonality, 'O', 'X');
            setState({ isAIThinking: false });
            makeMove(aiIdx, 'O');
        }, 450);
    }
}

/* ════════════════════════ Outcomes ════════════════════════ */

function handleWin(mark) {
    const s = getState();
    const duration = timer.getSeconds();
    timer.stop();

    if (s.gameMode === 'pvai') {
        if (mark === 'X') {
            const newStats = { ...s.stats };
            newStats.gamesPlayed++;
            newStats.wins++;
            newStats.currentStreak++;
            if (newStats.currentStreak > newStats.bestStreak) newStats.bestStreak = newStats.currentStreak;
            if (newStats.fastestWin === null || duration < newStats.fastestWin) newStats.fastestWin = duration;

            setState({
                gameStatus: 'won',
                playerScore: s.playerScore + 1,
                playerWins: s.playerWins + 1,
                stats: newStats,
            });
            // Update ELO & Progression
            updateProgression('win');
            playWinSound();
            launchConfetti(3500);
            trackEvent('game_win', { aiPersonality: s.aiPersonality, duration });
            setTimeout(() => showPopup('winPopup'), 500);
        } else {
            const newStats = { ...s.stats };
            newStats.gamesPlayed++;
            newStats.losses++;
            newStats.currentStreak = 0;

            setState({
                gameStatus: 'lost',
                aiScore: s.aiScore + 1,
                drawStreak: 0, // AI win resets draw streak
                stats: newStats,
            });
            playLoseSound();
            shakeBoard(); // Visual feedback on loss
            updateProgression('loss');
            trackEvent('game_loss', { aiPersonality: s.aiPersonality, duration });
            setTimeout(() => showPopup('aiWinPopup'), 500);
        }
        saveMatchHistory(mark === 'X' ? 'win' : 'loss');
    } else if (s.gameMode === 'online') {
        const iWon = mark === s.myMark;
        setState({
            gameStatus: iWon ? 'won' : 'lost',
            playerScore: s.playerScore + (iWon ? 1 : 0),
            aiScore: s.aiScore + (iWon ? 0 : 1),
        });
        if (iWon) { playWinSound(); launchConfetti(3500); } else { playLoseSound(); }
        setTimeout(() => {
            const titleEl = document.getElementById('pvpWinTitle');
            if (titleEl) titleEl.textContent = iWon ? '🎉 You Win!' : '😔 Opponent Wins!';
            showPopup('pvpWinPopup');
        }, 500);
    } else {
        setState({
            gameStatus: 'won',
            playerScore: s.playerScore + (mark === 'X' ? 1 : 0),
            aiScore: s.aiScore + (mark === 'O' ? 1 : 0),
        });
        playWinSound();
        if (mark === 'X') launchConfetti(3500);
        setTimeout(() => {
            const titleEl = document.getElementById('pvpWinTitle');
            if (titleEl) titleEl.textContent = mark === 'X' ? '🎉 Player 1 Wins!' : '🎉 Player 2 Wins!';
            showPopup('pvpWinPopup');
        }, 500);
    }

    const cur = getState();
    updateScoreDisplay(cur.playerScore, cur.aiScore);
    updateStatsDisplay(cur.level, cur.drawStreak, cur.playerWins);
    renderStatsPanel(cur.stats);
    persistState();
}

function handleDraw() {
    const s = getState();
    const duration = timer.getSeconds();
    timer.stop();

    const newStats = { ...s.stats };
    newStats.gamesPlayed++;
    newStats.draws++;
    newStats.currentStreak = 0;

    setState({
        gameStatus: 'draw',
        drawStreak: s.drawStreak + 1,
        stats: newStats,
    });

    playDrawSound();
    trackEvent('game_draw', { aiPersonality: s.aiPersonality, duration });

    if (s.gameMode === 'pvai') {
        updateProgression('draw');
        saveMatchHistory('draw');
    }

    const cur = getState();
    updateStatsDisplay(cur.level, cur.drawStreak, cur.playerWins);
    renderStatsPanel(cur.stats);
    setTimeout(() => showPopup('drawPopup'), 300);
    persistState();
}

/* ════════════════════════ Levelling ════════════════════════ */

function updateProgression(outcome) {
    const s = getState();
    let ratingDelta = 0;

    // 1. Calculate ELO Changes
    if (outcome === 'win') {
        if (s.aiPersonality === 'perfect') ratingDelta = 25;
        else if (s.aiPersonality === 'aggressive' || s.aiPersonality === 'defensive') ratingDelta = 15;
        else ratingDelta = 5;
    } else if (outcome === 'loss') {
        if (s.aiPersonality === 'perfect') ratingDelta = -10;
        else if (s.aiPersonality === 'aggressive' || s.aiPersonality === 'defensive') ratingDelta = -15;
        else ratingDelta = -25;
    } else if (outcome === 'draw') {
        if (s.aiPersonality === 'perfect') ratingDelta = 10;
        else if (s.aiPersonality === 'aggressive' || s.aiPersonality === 'defensive') ratingDelta = 5;
        else ratingDelta = -5;
    }

    // 2. Determine New Rank
    const prevRating = s.playerRating;
    const newRating = Math.max(0, prevRating + ratingDelta);
    const prevRank = s.rank;
    const newRank = calculateRank(newRating);

    // 3. Dynamic Difficulty Adjustment (DDA)
    let newWinStreak = outcome === 'win' ? s.winStreak + 1 : 0;
    let newLossStreak = outcome === 'loss' ? s.lossStreak + 1 : 0;
    let newPersonality = s.aiPersonality;

    if (outcome === 'draw') {
        newWinStreak = 0;
        newLossStreak = 0;
    }

    if (s.adaptiveDifficulty) {
        const curTierIdx = AI_TIERS.indexOf(s.aiPersonality);
        if (newWinStreak >= 4 && curTierIdx < AI_TIERS.length - 1) {
            newPersonality = AI_TIERS[curTierIdx + 1];
            newWinStreak = 0; // Reset after promotion
            trackEvent('dda_increase', { to: newPersonality });
        } else if (newLossStreak >= 3 && curTierIdx > 0) {
            newPersonality = AI_TIERS[curTierIdx - 1];
            newLossStreak = 0; // Reset after demotion
            trackEvent('dda_decrease', { to: newPersonality });
        }
    }

    // Update State
    setState({
        playerRating: newRating,
        rank: newRank,
        winStreak: newWinStreak,
        lossStreak: newLossStreak,
        aiPersonality: newPersonality
    });

    // Handle Rank Up popups (prevent alert spam on deranks)
    const ranks = ['Beginner', 'Intermediate', 'Advanced', 'Master', 'Grandmaster'];
    if (ranks.indexOf(newRank) > ranks.indexOf(prevRank)) {
        playLevelUpSound();
        launchConfetti(4000);
        showRankUpPopup(newRank);
    } else if (newRank === 'Grandmaster' && prevRank !== 'Grandmaster') {
        playLevelUpSound();
        launchConfetti(5000);
        trackEvent('champion');
        setTimeout(() => showPopup('championPopup'), 600);
    }

    // Update UI Elements
    const sel = document.getElementById('aiPersonality');
    if (sel && s.adaptiveDifficulty) sel.value = newPersonality;

    updateStatsDisplay(newRank, newRating, s.playerWins);
    console.log(`[ELO] Rating: ${newRating} (${ratingDelta > 0 ? '+' + ratingDelta : ratingDelta}) | Rank: ${newRank} | DDA Streak [W:${newWinStreak} L:${newLossStreak}]`);
}

function showRankUpPopup(newRank) {
    const titleEl = document.getElementById('levelUpTitle');
    if (titleEl) titleEl.textContent = '⬆️ Rank Up!';
    const el = document.getElementById('levelUpText');
    if (el) el.textContent = `Awesome! You've advanced to ${newRank}!`;
    showPopup('levelUpPopup');
}

/* ════════════════════════ Match History & Replay ════════════════════════ */

function saveMatchHistory(outcome) {
    const s = getState();
    const match = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        outcome: outcome,
        aiPersonality: s.aiPersonality,
        moves: [...s.moveHistory]
    };

    const newHistory = [match, ...s.matchHistory].slice(0, 50);
    setState({ matchHistory: newHistory });
    renderMatchHistory(newHistory);
}

let replayMode = false;
let currentReplayMatch = null;
let currentReplayStep = 0;

window.startReplay = function (matchId) {
    const s = getState();
    const match = s.matchHistory.find(m => m.id === matchId);
    if (!match) return;

    replayMode = true;
    currentReplayMatch = match;
    currentReplayStep = 0;

    let bar = document.getElementById('replayControls');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'replayControls';
        bar.className = 'replay-bar';
        bar.innerHTML = `
            <button id="replayPrev" class="btn btn-sm">⏮ Back</button>
            <button id="replayNext" class="btn btn-sm">⏭ Next</button>
            <button id="replayExit" class="btn btn-sm">❌ Exit</button>
        `;
        document.querySelector('.game-area').appendChild(bar);

        document.getElementById('replayPrev').addEventListener('click', () => stepReplay(-1));
        document.getElementById('replayNext').addEventListener('click', () => stepReplay(1));
        document.getElementById('replayExit').addEventListener('click', exitReplay);
    }
    bar.classList.add('active');

    hideAllPopups();
    document.getElementById('historySidebar')?.classList.remove('open');

    renderReplayStep();
};

function stepReplay(dir) {
    if (!currentReplayMatch) return;
    currentReplayStep += dir;
    if (currentReplayStep < 0) currentReplayStep = 0;
    if (currentReplayStep > currentReplayMatch.moves.length) currentReplayStep = currentReplayMatch.moves.length;
    renderReplayStep();
}

function renderReplayStep() {
    const moves = currentReplayMatch.moves.slice(0, currentReplayStep);
    const board = Array(9).fill('');
    moves.forEach(m => board[m.index] = m.mark);

    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, idx) => {
        cell.className = 'cell';
        cell.innerHTML = '';
        const mark = board[idx];
        if (mark) {
            const span = document.createElement('span');
            span.className = `mark mark-${mark.toLowerCase()} appear`;
            span.textContent = mark;
            cell.appendChild(span);
        }
    });
}

function exitReplay() {
    replayMode = false;
    currentReplayMatch = null;
    const bar = document.getElementById('replayControls');
    if (bar) bar.classList.remove('active');

    const s = getState();
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, idx) => {
        cell.className = 'cell';
        cell.innerHTML = '';
        const mark = s.board[idx];
        if (mark) {
            const span = document.createElement('span');
            span.className = `mark mark-${mark.toLowerCase()} appear`;
            span.textContent = mark;
            cell.appendChild(span);
        }
    });
}

/* ════════════════════════ Undo ════════════════════════ */

function undoLastMove() {
    if (replayMode) return;
    const s = getState();
    if (s.gameStatus !== 'playing' || s.moveHistory.length === 0) return;
    if (s.isAIThinking) return;
    if (s.gameMode === 'online') return;

    const movesToUndo = s.gameMode === 'pvai' && s.moveHistory.length >= 2 ? 2 : 1;
    const newBoard = [...s.board];
    const newHistory = [...s.moveHistory];

    for (let i = 0; i < movesToUndo && newHistory.length > 0; i++) {
        const last = newHistory.pop();
        newBoard[last.index] = '';
        const cell = document.querySelector(`.cell[data-index="${last.index}"]`);
        if (cell) {
            cell.innerHTML = '';
            cell.classList.remove('win-cell');
            cell.setAttribute('aria-label', `Cell ${last.index + 1}: empty`);
        }
    }

    setState({ board: newBoard, moveHistory: newHistory, currentPlayer: 'X' });
    updateTurnUI();
}

/* ════════════════════════ Game Flow ════════════════════════ */

function startNewRound() {
    hideAllPopups();
    createBoard();
    setState({ gameStatus: 'playing', isAIThinking: false });
    timer.start();
    trackEvent('game_start', { mode: getState().gameMode, difficulty: getDifficultyForLevel() });
    updateTurnUI();
}

function restartGame() {
    resetAllScores();
    updateScoreDisplay(0, 0);
    updateStatsDisplay(1, 0, 0);
    const sel = document.getElementById('difficulty');
    if (sel) sel.value = 'easy';
    persistState();
    startNewRound();
}

/* ════════════════════════ Mode Switching ════════════════════════ */

function setGameMode(mode) {
    if (getState().gameMode === 'online' && mode !== 'online') disconnect();

    setState({ gameMode: mode, myMark: 'X' });

    const diffSel = document.getElementById('difficulty');
    const undoBtn = document.getElementById('undoBtn');
    const statsBar = document.querySelector('.stats-bar');
    const roomInfoBar = document.getElementById('roomInfoBar');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const restartBtn = document.getElementById('restart');
    const quitBtn = document.getElementById('quit');

    if (mode === 'pvai') {
        if (diffSel) diffSel.style.display = '';
        if (undoBtn) undoBtn.style.display = '';
        if (statsBar) statsBar.style.display = '';
        if (roomInfoBar) roomInfoBar.style.display = 'none';
        if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
        if (restartBtn) restartBtn.style.display = '';
        if (quitBtn) quitBtn.style.display = '';
        updateModeLabel('pvai');
    } else if (mode === 'pvp') {
        if (diffSel) diffSel.style.display = 'none';
        if (undoBtn) undoBtn.style.display = '';
        if (statsBar) statsBar.style.display = 'none';
        if (roomInfoBar) roomInfoBar.style.display = 'none';
        if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
        if (restartBtn) restartBtn.style.display = '';
        if (quitBtn) quitBtn.style.display = '';
        updateModeLabel('pvp');
    } else if (mode === 'online') {
        if (diffSel) diffSel.style.display = 'none';
        if (undoBtn) undoBtn.style.display = 'none';
        if (statsBar) statsBar.style.display = 'none';
        if (roomInfoBar) roomInfoBar.style.display = 'flex';
        if (leaveRoomBtn) leaveRoomBtn.style.display = '';
        if (restartBtn) restartBtn.style.display = 'none';
        if (quitBtn) quitBtn.style.display = 'none';
        updateModeLabel('online');
        updateRoomInfoBar('—', 1, 'Lobby');

        // Reset lobby visual state
        const createBtn = document.getElementById('lobbyCreateBtn');
        const joinBtn = document.getElementById('lobbyJoinBtn');
        if (createBtn) createBtn.disabled = false;
        if (joinBtn) joinBtn.disabled = false;

        hideAllPopups();
        showPopup('lobbyPopup');
        return;
    }

    trackEvent('difficulty_change', { mode });
    persistState();
    startNewRound();
}

/* ════════════════════════ Online Multiplayer ════════════════════════ */

function setupMultiplayer() {
    onStatus((status, message) => {
        // Find which popup status elements to update
        const isLobbyVisible = document.getElementById('lobbyPopup')?.classList.contains('active');

        const statusEl = isLobbyVisible ? document.getElementById('lobbyStatus') : document.getElementById('roomStatusText');
        const dotEl = isLobbyVisible ? document.getElementById('lobbyDot') : document.getElementById('roomDot');

        if (statusEl) statusEl.textContent = message;
        if (dotEl) {
            dotEl.className = 'status-dot';
            if (status === 'connected') dotEl.classList.add('green');
            else if (status === 'waiting' || status === 'connecting') dotEl.classList.add('yellow');
            else dotEl.classList.add('red');
        }

        // Update Room Popup specific details
        if (!isLobbyVisible) {
            const pCount = status === 'connected' ? 2 : 1;
            const rCodeEl = document.getElementById('roomPopupCode');
            const rPlayersEl = document.getElementById('roomPopupPlayers');
            if (rCodeEl) rCodeEl.textContent = getRoomCode() || '—';
            if (rPlayersEl) rPlayersEl.textContent = `${pCount} / 2`;
        }

        // Update persistent game header bar
        const pCount = status === 'connected' ? 2 : 1;
        updateRoomInfoBar(getRoomCode(), pCount, message);

        if (status === 'connected') {
            setTimeout(() => {
                hideAllPopups();
                setState({ myMark: getIsHost() ? 'X' : 'O' });
                updateModeLabel('online');
                startNewRound();
            }, 1000); // Give users a second to see "2/2 connected" before jumping to game
        }
    });

    onRemoteMove((index) => {
        if (index === -1) { startNewRound(); return; }
        const s = getState();
        if (s.gameStatus !== 'playing') return;
        const remoteMark = s.myMark === 'X' ? 'O' : 'X';
        if (s.currentPlayer !== remoteMark) return;
        makeMove(index, remoteMark);
    });

    onDisconnect((intentionalLeave) => {
        if (getState().gameMode === 'online') {
            setState({ gameStatus: 'idle' });
            timer.stop();

            updateRoomInfoBar(getRoomCode(), 1, intentionalLeave ? 'Opponent left' : 'Disconnected');

            const isRoomPopupActive = document.getElementById('roomPopup')?.classList.contains('active');

            if (isRoomPopupActive) {
                // Return them to lobby cleanly from waiting room
                hideAllPopups();
                alert(intentionalLeave ? 'Opponent left the room.' : 'Opponent disconnected.');
                showPopup('lobbyPopup');
                disconnect(false); // clean up local peer state
            } else {
                // Show win/loss popup in game
                const titleEl = document.getElementById('pvpWinTitle');
                if (titleEl) titleEl.textContent = intentionalLeave ? '🚪 Opponent Left The Room' : '🔌 Opponent Disconnected';
                hideAllPopups();
                showPopup('pvpWinPopup');
            }
        }
    });

    // Create room
    document.getElementById('lobbyCreateBtn')?.addEventListener('click', async () => {
        const createBtn = document.getElementById('lobbyCreateBtn');
        if (createBtn) createBtn.disabled = true;
        try {
            await createRoom();
            hidePopup('lobbyPopup');
            showPopup('roomPopup');
        } catch {
            if (createBtn) createBtn.disabled = false;
        }
    });

    // Join room
    document.getElementById('lobbyJoinBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('lobbyCodeInput');
        const code = input?.value?.trim();
        if (!code || code.length < 4) {
            const statusEl = document.getElementById('lobbyStatus');
            if (statusEl) statusEl.textContent = 'Please enter a valid room code.';
            return;
        }
        const joinBtn = document.getElementById('lobbyJoinBtn');
        if (joinBtn) joinBtn.disabled = true;
        try {
            await joinRoom(code);
            hidePopup('lobbyPopup');
            showPopup('roomPopup');
        } catch {
            if (joinBtn) joinBtn.disabled = false;
        }
    });

    // Enter key on code input
    document.getElementById('lobbyCodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('lobbyJoinBtn')?.click(); }
    });

    // Copy code from room popup
    document.getElementById('roomCopyBtn')?.addEventListener('click', () => {
        const code = getRoomCode();
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('roomCopyBtn');
            if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Code'; }, 1500); }
        });
    });

    // Share link from room popup
    document.getElementById('roomShareBtn')?.addEventListener('click', () => {
        const code = getRoomCode();
        if (!code) return;
        const url = new URL(window.location.href);
        url.searchParams.set('room', code);
        url.hash = '';
        navigator.clipboard.writeText(url.toString()).then(() => {
            const btn = document.getElementById('roomShareBtn');
            if (btn) { btn.textContent = '✅ Link Copied!'; setTimeout(() => { btn.textContent = '🔗 Share Link'; }, 1500); }
        });
    });

    // Leave Room (Pre-game lobby or active game)
    const handleLeave = () => {
        disconnect(true);
        hideAllPopups();
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
        setGameMode('pvai');
    };

    document.getElementById('roomLeaveBtn')?.addEventListener('click', handleLeave);
    document.getElementById('leaveRoomBtn')?.addEventListener('click', handleLeave);

    // Leave cleanly from Lobby main screen
    document.getElementById('lobbyLeaveBtn')?.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
        setGameMode('pvai');
    });
}

/* ════════════════════════ Error Monitoring ════════════════════════ */

function setupErrorMonitoring() {
    window.onerror = (msg, src, line, col, err) => {
        console.error('[TTT Error]', { msg, src, line, col, stack: err?.stack });
        trackEvent('error', { msg: String(msg), src, line });
        return false;
    };
    window.addEventListener('unhandledrejection', (e) => {
        console.error('[TTT Unhandled Promise]', e.reason);
        trackEvent('error', { msg: String(e.reason) });
    });
}

/* ════════════════════════ Init ════════════════════════ */

function init() {
    setupErrorMonitoring();

    // Restore persisted state
    const saved = loadState();
    const savedStats = loadStats();
    setState({ ...saved, stats: { ...getState().stats, ...savedStats } });

    const s = getState();
    applyTheme(s.theme);
    initParticleBackground();
    if (s.soundEnabled !== undefined) setSoundEnabled(s.soundEnabled);

    updateScoreDisplay(s.playerScore, s.aiScore);
    updateStatsDisplay(s.rank, s.playerRating, s.playerWins);
    updateModeLabel(s.gameMode);
    renderStatsPanel(s.stats);
    renderMatchHistory(s.matchHistory);

    const sel = document.getElementById('aiPersonality');
    if (sel) sel.value = s.aiPersonality;

    const ddaToggle = document.getElementById('ddaToggle');
    if (ddaToggle) ddaToggle.checked = s.adaptiveDifficulty;

    const modeSel = document.getElementById('modeSelect');
    if (modeSel) modeSel.value = s.gameMode === 'online' ? 'pvai' : s.gameMode;

    showPopup('instructionsPopup');
    setupMultiplayer();

    // Auto-join from URL ?room=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.trim().length >= 4) {
        hideAllPopups();
        setState({ gameMode: 'online' });
        if (modeSel) modeSel.value = 'online';
        showPopup('lobbyPopup');
        const input = document.getElementById('lobbyCodeInput');
        if (input) input.value = roomParam.trim().toUpperCase();
        setTimeout(() => document.getElementById('lobbyJoinBtn')?.click(), 500);
    }

    // Register PWA service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(() => { });
    }

    /* ──── Button wiring ──── */

    document.getElementById('startGameBtn')?.addEventListener('click', () => { hidePopup('instructionsPopup'); startNewRound(); });
    ['winPopupOk', 'aiWinPopupOk', 'drawPopupOk', 'levelUpOk'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', startNewRound);
    });
    document.getElementById('pvpWinPopupOk')?.addEventListener('click', () => {
        if (getState().gameMode === 'online' && isConnected()) sendRestart();
        startNewRound();
    });
    document.getElementById('championPopupOk')?.addEventListener('click', restartGame);
    document.getElementById('restart')?.addEventListener('click', () => {
        if (getState().gameMode === 'online' && isConnected()) sendRestart();
        startNewRound();
    });
    document.getElementById('quit')?.addEventListener('click', () => {
        if (getState().gameMode === 'online') disconnect(true); // notifyRemote
        setGameMode('pvai');
        restartGame();
    });

    // Custom Leave Room Behavior
    document.getElementById('leaveRoomBtn')?.addEventListener('click', () => {
        if (getState().gameMode === 'online') {
            disconnect(true); // send leave signal
            setGameMode('pvai'); // reset to menu state essentially
            showPopup('lobbyPopup'); // Immediately pop the lobby back open
            setGameMode('online'); // Trigger the UI cleanups for online mode
        }
    });

    document.getElementById('undoBtn')?.addEventListener('click', undoLastMove);

    // Hint system — show the best move
    let hintsUsed = 0;
    document.getElementById('hintBtn')?.addEventListener('click', () => {
        const s = getState();
        if (s.gameStatus !== 'playing' || s.isAIThinking || s.gameMode !== 'pvai') return;
        if (hintsUsed >= 3) {
            document.getElementById('hintBtn').textContent = '💡 No hints left';
            return;
        }
        const bestIdx = getAIMove(s.board, 'hard', 'X', 'O');
        if (bestIdx < 0) return;
        const cell = document.querySelector(`.cell[data-index="${bestIdx}"]`);
        if (cell) {
            cell.classList.add('hint-glow');
            setTimeout(() => cell.classList.remove('hint-glow'), 2000);
        }
        hintsUsed++;
        document.getElementById('hintBtn').textContent = `💡 Hint (${3 - hintsUsed})`;
    });

    // Reset hints on new round
    subscribe((state, prev) => {
        if (state.gameStatus === 'playing' && prev.gameStatus !== 'playing') {
            hintsUsed = 0;
            const hintBtn = document.getElementById('hintBtn');
            if (hintBtn) hintBtn.textContent = '💡 Hint';
        }
    });

    // Keyboard controls — numpad 1-9 maps to cells
    document.addEventListener('keydown', (e) => {
        const s = getState();
        if (s.gameStatus !== 'playing' || s.isAIThinking) return;
        if (s.gameMode !== 'pvai' && s.gameMode !== 'pvp') return;
        // Numpad layout: 7=top-left, 8=top-mid ... 1=bottom-left
        const keyMap = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };
        const idx = keyMap[e.key];
        if (idx !== undefined && s.board[idx] === '') {
            if (s.gameMode === 'pvai') makeMove(idx, 'X');
            else makeMove(idx, s.currentPlayer);
        }
    });

    document.getElementById('soundToggle')?.addEventListener('click', () => {
        const enabled = toggleSound();
        setState({ soundEnabled: enabled });
        persistState();
    });
    sel?.addEventListener('change', (e) => {
        const personality = e.target.value;
        setState({
            aiPersonality: personality,
            adaptiveDifficulty: false // Manual override
        });
        const ddaToggle = document.getElementById('ddaToggle');
        if (ddaToggle) ddaToggle.checked = false;
        persistState();
        restartGame();
    });

    document.getElementById('ddaToggle')?.addEventListener('change', (e) => {
        setState({ adaptiveDifficulty: e.target.checked });
        persistState();
    });
    modeSel?.addEventListener('change', (e) => setGameMode(e.target.value));
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => { setState({ theme: btn.dataset.theme }); applyTheme(btn.dataset.theme); persistState(); });
    });

    // Stats sidebar toggle
    document.getElementById('statsToggle')?.addEventListener('click', () => {
        document.getElementById('statsSidebar')?.classList.toggle('open');
    });
    document.getElementById('statsClose')?.addEventListener('click', () => {
        document.getElementById('statsSidebar')?.classList.remove('open');
    });
}

document.addEventListener('DOMContentLoaded', init);
