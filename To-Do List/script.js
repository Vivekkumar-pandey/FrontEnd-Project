const taskList = document.getElementById("taskList");
const taskInput = document.getElementById("taskInput");

 // Set current date
document.getElementById("currentDate").textContent =
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

// Add task on button click
document.getElementById("addBtn").addEventListener("click", addTask);

// Add task on pressing Enter
taskInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

function addTask() {
  const task = taskInput.value.trim();
  if (task === "") return;

  const li = document.createElement("li");

  // Animation class
  li.classList.add("fade-in"); 
  li.innerHTML = `
    <span class="task-text">${task}</span>
    <div>
      <button class="completeBtn">✅</button>
      <button class="deleteBtn">❌</button>
    </div>
  `;

  // Add events
  li.querySelector(".completeBtn").addEventListener("click", function () {
    li.querySelector(".task-text").classList.toggle("completed");
    saveTasks();
  });

  li.querySelector(".deleteBtn").addEventListener("click", function () {
    if (confirm("Are you sure you want to delete this task?")) {
      li.remove();
      saveTasks();
    }
  });

  taskList.appendChild(li);
  taskInput.value = "";
  saveTasks();
}

function saveTasks() {
  localStorage.setItem("tasks", taskList.innerHTML);
}

function loadTasks() {
  taskList.innerHTML = localStorage.getItem("tasks") || "";

  // Reattach event listeners after loading
  document.querySelectorAll("li").forEach(li => {
    li.querySelector(".completeBtn")?.addEventListener("click", function () {
      li.querySelector(".task-text").classList.toggle("completed");
      saveTasks();
    });

    li.querySelector(".deleteBtn")?.addEventListener("click", function () {
      if (confirm("Are you sure you want to delete this task?")) {
        li.remove();
        saveTasks();
      }
    });
  });
}

window.onload = loadTasks;
