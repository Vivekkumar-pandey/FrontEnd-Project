/**
 * game.js — Central game controller (entry point)
 *
 * Orchestrates state, AI, UI, storage, multiplayer, and analytics.
 * v4 — Reactive state manager, game statistics, analytics, error monitoring.
 */

import { checkWinner, isBoardFull, createTimer } from './utils.js';
import { getState, setState, subscribe, resetGameState, resetAllScores } from './state.js';
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

const difficultyToLevel = {
    easy: 1,
    medium: 2,
    hard: 3
};

function getDifficultyForLevel() {
    const s = getState();
    if (s.level <= 1) return 'easy';
    if (s.level <= 2) return 'medium';
    return 'hard';
}

function resolveDifficulty() {
    const s = getState();
    if (s.manualDifficulty) {
        return s.difficulty;
    }
    return getDifficultyForLevel();
}

function persistState() {
    const s = getState();
    saveState({
        playerScore: s.playerScore,
        aiScore: s.aiScore,
        level: s.level,
        totalDraws: s.totalDraws,
        consecutiveDraws: s.consecutiveDraws,
        difficulty: s.difficulty,
        manualDifficulty: s.manualDifficulty,
        theme: s.theme,
        gameMode: s.gameMode === 'online' ? 'pvai' : s.gameMode,
        soundEnabled: s.soundEnabled,
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
            const difficulty = resolveDifficulty();
            console.log("Resolved AI difficulty:", difficulty); // Temporary log for validation
            const aiIdx = getAIMove(cur.board, difficulty, 'O', 'X');
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
                levelProgress: s.levelProgress + 1,
                consecutiveDraws: 0,
                stats: newStats,
            });
            updateLevel('win');
            playWinSound();
            launchConfetti(3500);
            trackEvent('game_win', { difficulty: getDifficultyForLevel(), duration });
            setTimeout(() => showPopup('winPopup'), 500);
        } else {
            const newStats = { ...s.stats };
            newStats.gamesPlayed++;
            newStats.losses++;
            newStats.currentStreak = 0;

            setState({
                gameStatus: 'lost',
                aiScore: s.aiScore + 1,
                consecutiveDraws: 0,
                levelProgress: 0,
                stats: newStats,
            });
            playLoseSound();
            trackEvent('game_loss', { difficulty: getDifficultyForLevel(), duration });
            setTimeout(() => showPopup('aiWinPopup'), 500);
        }
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
    updateStatsDisplay(cur.level, cur.totalDraws, cur.consecutiveDraws);
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
        totalDraws: s.totalDraws + 1,
        consecutiveDraws: s.consecutiveDraws + 1,
        stats: newStats,
    });

    playDrawSound();
    trackEvent('game_draw', { difficulty: getDifficultyForLevel(), duration });

    if (s.gameMode === 'pvai') {
        updateLevel('draw');
    }

    const cur = getState();
    updateStatsDisplay(cur.level, cur.totalDraws, cur.consecutiveDraws);
    renderStatsPanel(cur.stats);
    setTimeout(() => showPopup('drawPopup'), 300);
    persistState();
}

/* ════════════════════════ Levelling ════════════════════════ */

function updateLevel(outcome) {
    const s = getState();
    const prevLevel = s.level;
    let newLevel = s.level;
    let newProgress = s.levelProgress;
    let newConsecDraws = s.consecutiveDraws;

    if (newLevel === 1 && outcome === 'win' && newProgress >= 5) {
        newLevel = 2; newProgress = 0; newConsecDraws = 0;
    } else if (newLevel === 2 && outcome === 'win' && newProgress >= 10) {
        newLevel = 3; newProgress = 0; newConsecDraws = 0;
    }

    if (outcome === 'draw' && newLevel < 3 && newConsecDraws >= 5) {
        newLevel++; newProgress = 0; newConsecDraws = 0;
    }

    if (newLevel === 3 && outcome === 'draw' && newConsecDraws >= 7) {
        newLevel = 6; newProgress = 0; newConsecDraws = 0;
    }

    setState({
        level: newLevel,
        levelProgress: newProgress,
        consecutiveDraws: newConsecDraws,
        manualDifficulty: false // Revert control back to level progression on advancing
    });

    if (newLevel !== prevLevel && newLevel < 6) {
        playLevelUpSound();
        trackEvent('level_up', { level: newLevel });
        showLevelUpPopup(newLevel);
    } else if (newLevel === 6) {
        playLevelUpSound();
        launchConfetti(5000);
        trackEvent('champion');
        setTimeout(() => showPopup('championPopup'), 600);
    }

    const sel = document.getElementById('difficulty');
    if (sel && !getState().manualDifficulty) {
        sel.value = getDifficultyForLevel();
    }

    const cur = getState();
    updateStatsDisplay(cur.level, cur.totalDraws, cur.consecutiveDraws);
}

function showLevelUpPopup(level) {
    const names = ['', 'EASY', 'MEDIUM', 'HARD', 'HARD+', 'EXPERT', 'CHAMPION'];
    const el = document.getElementById('levelUpText');
    if (el) el.textContent = `You've advanced to ${names[level]}!`;
    showPopup('levelUpPopup');
}

/* ════════════════════════ Undo ════════════════════════ */

function undoLastMove() {
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
        const statusEl = document.getElementById('lobbyStatus');
        const dotEl = document.getElementById('lobbyDot');
        if (statusEl) statusEl.textContent = message;
        if (dotEl) {
            dotEl.className = 'status-dot';
            if (status === 'connected') dotEl.classList.add('green');
            else if (status === 'waiting' || status === 'connecting') dotEl.classList.add('yellow');
            else dotEl.classList.add('red');
        }

        // Update Room Info Bar
        const pCount = status === 'connected' ? 2 : 1;
        updateRoomInfoBar(getRoomCode(), pCount, message);

        if (status === 'connected') {
            setTimeout(() => {
                hidePopup('lobbyPopup');
                setState({ myMark: getIsHost() ? 'X' : 'O' });
                updateModeLabel('online');
                startNewRound();
            }, 800);
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

            const titleEl = document.getElementById('pvpWinTitle');
            if (titleEl) titleEl.textContent = intentionalLeave ? '🚪 Opponent Left The Room' : '🔌 Opponent Disconnected';
            showPopup('pvpWinPopup');
        }
    });

    // Create room
    document.getElementById('lobbyCreateBtn')?.addEventListener('click', async () => {
        const codeEl = document.getElementById('lobbyRoomCode');
        const createBtn = document.getElementById('lobbyCreateBtn');
        const joinSection = document.getElementById('lobbyJoinSection');
        if (createBtn) createBtn.disabled = true;
        if (joinSection) joinSection.style.display = 'none';
        try {
            const code = await createRoom();
            if (codeEl) { codeEl.textContent = code; codeEl.style.display = 'block'; }
            const actionsEl = document.getElementById('roomActions');
            if (actionsEl) actionsEl.style.display = '';
        } catch {
            if (createBtn) createBtn.disabled = false;
            if (joinSection) joinSection.style.display = '';
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
        const createSection = document.getElementById('lobbyCreateSection');
        if (joinBtn) joinBtn.disabled = true;
        if (createSection) createSection.style.display = 'none';
        try { await joinRoom(code); } catch {
            if (joinBtn) joinBtn.disabled = false;
            if (createSection) createSection.style.display = '';
        }
    });

    // Enter key on code input
    document.getElementById('lobbyCodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('lobbyJoinBtn')?.click(); }
    });

    // Copy code
    document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
        const code = getRoomCode();
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copyCodeBtn');
            if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Code'; }, 1500); }
        });
    });

    // Share link
    document.getElementById('shareLinkBtn')?.addEventListener('click', () => {
        const code = getRoomCode();
        if (!code) return;
        const url = new URL(window.location.href);
        url.searchParams.set('room', code);
        url.hash = '';
        navigator.clipboard.writeText(url.toString()).then(() => {
            const btn = document.getElementById('shareLinkBtn');
            if (btn) { btn.textContent = '✅ Link Copied!'; setTimeout(() => { btn.textContent = '🔗 Share Link'; }, 1500); }
        });
    });

    // Leave lobby
    document.getElementById('lobbyLeaveBtn')?.addEventListener('click', () => {
        disconnect();
        hidePopup('lobbyPopup');
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
    updateStatsDisplay(s.level, s.totalDraws, s.consecutiveDraws);
    updateModeLabel(s.gameMode);
    renderStatsPanel(s.stats);

    const sel = document.getElementById('difficulty');
    if (sel) sel.value = getDifficultyForLevel();

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
    document.getElementById('soundToggle')?.addEventListener('click', () => {
        const enabled = toggleSound();
        setState({ soundEnabled: enabled });
        persistState();
    });
    sel?.addEventListener('change', (e) => {
        const diff = e.target.value;
        setState({
            difficulty: diff,
            level: difficultyToLevel[diff] || 1, // Instantly set the correct level text
            manualDifficulty: true
        });
        persistState();
        restartGame(); // Restart game smoothly with new difficulty overriding the AI logic
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
