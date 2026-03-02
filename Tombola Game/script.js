const grid = document.getElementById("number-grid");
const currentNumber = document.getElementById("current-number");
const previousNumbersDiv = document.getElementById("previous-numbers"); 

let numbers = Array.from({ length: 90 }, (_, i) => i + 1);
let calledNumbers = new Set();
let history = []; 


numbers.forEach(num => {
  const cell = document.createElement("div");
  cell.innerText = num;
  cell.id = `num-${num}`;
  grid.appendChild(cell);
});

function callNextNumber() {
  if (calledNumbers.size >= 90) {
    alert("All numbers called!");
    return;
  }

  let next;
  do {
    next = Math.floor(Math.random() * 90) + 1;
  } while (calledNumbers.has(next));

  calledNumbers.add(next);
  currentNumber.innerText = next;

  
  history.unshift(next);
  if (history.length > 4) history.pop(); 

  
  previousNumbersDiv.innerText = history.slice(1, 4).join(" , ") || "--";

  const calledCell = document.getElementById(`num-${next}`);
  if (calledCell) {
    calledCell.classList.add("called");
  }

 
  speakNumber(next);
}

function speakNumber(num) {
  const msg = new SpeechSynthesisUtterance();
  msg.text = num.toString(); 
  msg.lang = "en-US";           // change to "hi-IN" for Hindi For English en-US
  msg.rate = 0.9; 
  msg.pitch = 1;
  window.speechSynthesis.speak(msg);
}


function resetGame() {
  const confirmReset = confirm("Are you sure you want to reset the game?");
  if (!confirmReset) return; 

  calledNumbers.clear();
  history = [];
  currentNumber.innerText = "..";
  previousNumbersDiv.innerText = "--";

  
  numbers.forEach(num => {
    const cell = document.getElementById(`num-${num}`);
    if (cell) {
      cell.classList.remove("called");
    }
  });

  window.speechSynthesis.cancel();
}

