const products = [
  { id: 1, name: "T-shirt", price: 499, image: "./tshirt.png" },
  { id: 2, name: "Shoes", price: 1499, image: "./shoes.jpg" },
  { id: 3, name: "Cap", price: 199, image: "./cap.jpg" },
  { id: 4, name: "Phone", price: 74999, image: "./phone.jpg" },
  { id: 5, name: "Watch", price: 1999, image: "./watch.jpg" },
  { id: 6, name: "Makeup-Kit", price: 2999, image: "./makup-kit.jpg" },
  { id: 7, name: "Rice", price: 90, image: "./rice.jpg" },
  { id: 8, name: "Sugar", price: 45, image: "./sugar.jpg" },
  { id: 9, name: "Vegetables", price: 70, image: "./vegitables.jpg" },
  { id: 10, name: "Bhujia", price: 49, image: "./bhujia.jpg" },
];

const cart = [];

function renderProducts() {
  const productDiv = document.getElementById("products");
  if (!productDiv) return; 

  productDiv.innerHTML = "";
  products.forEach(product => {
    productDiv.innerHTML += `
      <div class="product">
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>₹${product.price}</p>
        <button onclick="addToCart(${product.id})">Add to Cart</button>
      </div>
    `;
  });
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
}

function removeFromCart(productId) {
  const index = cart.findIndex(item => item.id === productId);
  if (index !== -1) {
    cart.splice(index, 1);
    renderCart();
  }
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
  } else {
    renderCart();
  }
}

function renderCart() {
  const cartList = document.getElementById("cart");
  const totalElement = document.getElementById("total");
  if (!cartList || !totalElement) return;

  cartList.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;

    cartList.innerHTML += `
      <li class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-thumb">
        <div class="cart-details">
          <strong>${item.name}</strong><br>
          <button onclick="changeQty(${item.id}, -1)">−</button>
          ${item.qty}
          <button onclick="changeQty(${item.id}, 1)">+</button>
          = ₹${subtotal}
          <button onclick="removeFromCart(${item.id})" class="remove-btn">Remove</button>
        </div>
      </li>
    `;
  });

  totalElement.textContent = `Total: ₹${total}`;
}

function validateForm(e) {
  const name = document.querySelector('input[name="name"]')?.value.trim() || "";
  const email = document.querySelector('input[name="email"]')?.value.trim() || "";
  const phone = document.querySelector('input[name="phno"]')?.value.trim() || "";
  const password = document.querySelector('input[name="password"]')?.value || "";
  const agree = document.querySelector('input[name="check"]')?.checked || false;

  let errors = [];

  if (name === "") errors.push("Full name is required.");
  if (email === "") errors.push("Email is required.");
  else if (!/\S+@\S+\.\S+/.test(email)) errors.push("Enter a valid email address.");

  if (phone === "") errors.push("Phone number is required.");
  else if (!/^[6-9]\d{9}$/.test(phone)) errors.push("Enter a valid 10-digit phone number.");

  if (password.length < 6) errors.push("Password must be at least 6 characters.");
  if (!agree) errors.push("You must agree to the Terms & Conditions.");

  if (errors.length > 0) {
    e.preventDefault();
    alert(errors.join("\n"));
  }
}

function showAddressForm() {
    document.getElementById('addressForm').style.display = 'block';
  }

  function submitOrder() {
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;

    if (!name || !phone || !address) {
      alert("Please fill out all delivery details.");
      return;
    }

    // Save to localStorage
    localStorage.setItem('deliveryName', name);
    localStorage.setItem('deliveryPhone', phone);
    localStorage.setItem('deliveryAddress', address);

    // Redirect to tracking page
    window.location.href = 'delivery.html';
  }

// Initialize after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  const form = document.querySelector("form");
  if (form) form.addEventListener("submit", validateForm);
});


  


