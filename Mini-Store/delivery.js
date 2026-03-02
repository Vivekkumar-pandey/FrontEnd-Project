// Load delivery info from localStorage
document.getElementById("userName").textContent = localStorage.getItem("deliveryName");
document.getElementById("userPhone").textContent = localStorage.getItem("deliveryPhone");
document.getElementById("userAddress").textContent = localStorage.getItem("deliveryAddress");

function startTracking() {
  const steps = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3")
  ];

  let current = 0;

  const interval = setInterval(() => {
    if (current > 0) {
      steps[current - 1].classList.remove("active");
    }
    if (current < steps.length) {
      steps[current].classList.add("active");
      current++;
    } else {
      clearInterval(interval);
    }
  }, 2000);
}



