
const boardEl = document.getElementById("board");
const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const timerEl = document.getElementById("timer");
const restartBtn = document.getElementById("restart");
const quitBtn = document.getElementById("quit");
const difficultySelect = document.getElementById("difficulty");
const messageEl = document.getElementById("message");
const levelDisplay = document.getElementById("levelDisplay");
const totalDrawsEl = document.getElementById("totalDraws");
const consecutiveDrawsEl = document.getElementById("consecutiveDraws");

// Popups
const instructionsPopup = document.getElementById("instructionsPopup");
const startGameBtn = document.getElementById("startGameBtn");
const winPopup = document.getElementById("winPopup");
const aiWinPopup = document.getElementById("aiWinPopup");
const drawPopup = document.getElementById("drawPopup");
const championPopup = document.getElementById("championPopup");

const winPopupOk = document.getElementById("winPopupOk");
const aiWinPopupOk = document.getElementById("aiWinPopupOk");
const drawPopupOk = document.getElementById("drawPopupOk");
const championPopupOk = document.getElementById("championPopupOk");

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let isGameActive = false;
let playerScore = 0;
let aiScore = 0;
let timer = 0;
let timerInterval;

let level = 1;
let totalDraws = 0;
let consecutiveDraws = 0;
let levelProgress = 0;

const winCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], 
  [0, 3, 6], 
  [1, 4, 7], 
  [2, 5, 8], 
  [0, 4, 8], 
  [2, 4, 6]
];

function createBoard() {
  boardEl.innerHTML = "";
  board = ["", "", "", "", "", "", "", "", ""];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;
    cell.addEventListener("click", handleCellClick);
    boardEl.appendChild(cell);
  }
}

function handleCellClick(e) {
  const index = e.target.dataset.index;
  if (board[index] !== "" || !isGameActive) return;

  board[index] = "X";
  e.target.textContent = "X";
  if (checkWin("X")) {
    handleWin("player");
  } else if (board.every(cell => cell !== "")) {
    handleDraw();
  } else {
    setTimeout(aiMove, 500);
  }
}

function aiMove() {
  let index = bestMove();
  board[index] = "O";
  document.querySelector(`.cell[data-index='${index}']`).textContent = "O";

  if (checkWin("O")) {
    handleWin("ai");
  } else if (board.every(cell => cell !== "")) {
    handleDraw();
  }
}

function bestMove() {
  const available = board.map((val, i) => val === "" ? i : null).filter(i => i !== null);
  return available[Math.floor(Math.random() * available.length)];
}

function checkWin(player) {
  return winCombinations.some(comb => comb.every(index => board[index] === player));
}

function handleWin(winner) {
  isGameActive = false;
  clearInterval(timerInterval);

  if (winner === "player") {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    levelProgress++;
    consecutiveDraws = 0;
    updateDrawsUI();
    updateLevel("win");
    winPopup.classList.add("active");
  } else {
    aiScore++;
    aiScoreEl.textContent = aiScore;
    consecutiveDraws = 0;
    updateDrawsUI();
    levelProgress = 0;
    aiWinPopup.classList.add("active");
  }
}

function handleDraw() {
  isGameActive = false;
  clearInterval(timerInterval);
  totalDraws++;
  consecutiveDraws++;
  updateDrawsUI();
  updateLevel("draw");
  drawPopup.classList.add("active");
}

function updateDrawsUI() {
  totalDrawsEl.textContent = totalDraws;
  consecutiveDrawsEl.textContent = consecutiveDraws;
}

function updateLevel(outcome) {
  if (level === 1 && outcome === "win" && levelProgress >= 2) {
    level = 2;
    levelProgress = 0;
  } else if (level === 2 && outcome === "win" && levelProgress >= 3) {
    level = 3;
    levelProgress = 0;
  } else if (level === 3) {
    level = 4;
    levelProgress = 0;
  } else if (level === 4) {
    if (outcome === "draw" && consecutiveDraws >= 3) {
      level = 5;
      levelProgress = 0;
    } else if (outcome === "win") {
      level = 5;
      levelProgress = 0;
    }
  } else if (level === 5) {
    if ((outcome === "draw" && consecutiveDraws >= 5) || outcome === "win") {
      level = 6;
      levelProgress = 0;
    }
  } else if (level === 6 && (outcome === "win" || consecutiveDraws >= 5)) {
    isGameActive = false;
    championPopup.classList.add("active");
  }

  const levelNames = ["", "EASY", "MEDIUM", "HARD", "HARD", "HARD", "CHAMPION"];
  levelDisplay.textContent = `Level: ${levelNames[level]}`;
}

function startGame() {
  createBoard();
  isGameActive = true;
  levelProgress = 0;
  startTimer();
}

function startTimer() {
  timer = 0;
  timerEl.textContent = `Time: 0s`;
  timerInterval = setInterval(() => {
    timer++;
    timerEl.textContent = `Time: ${timer}s`;
  }, 1000);
}

restartBtn.addEventListener("click", () => {
  createBoard();
  isGameActive = true;
  clearInterval(timerInterval);
  startTimer();
});

quitBtn.addEventListener("click", () => {
  location.reload();
});

startGameBtn.addEventListener("click", () => {
  instructionsPopup.classList.remove("active");
  startGame();
});

[winPopupOk, aiWinPopupOk, drawPopupOk].forEach(btn => {
  btn.addEventListener("click", () => {
    winPopup.classList.remove("active");
    aiWinPopup.classList.remove("active");
    drawPopup.classList.remove("active");
    createBoard();
    isGameActive = true;
    startTimer();
  });
});

championPopupOk.addEventListener("click", () => {
  championPopup.classList.remove("active");
  location.reload();
});



// Level Up Popup
function showLevelUpPopup(level) {
    const popup = document.createElement('div');
    popup.classList.add('popup', 'active');
    popup.innerHTML = `
        <h2>🎯 Level Up!</h2>
        <p>Great job! You've advanced to <strong>Level ${level}</strong>!</p>
        <button id="levelUpOk">OK</button>
    `;
    document.body.appendChild(popup);

    document.getElementById("levelUpOk").addEventListener("click", () => {
        popup.remove();
        restartGame(); // Reset the game from beginning
    });
}
