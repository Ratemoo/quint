// ============================================
// QUINT ESSENTIALS — Cart + WhatsApp Order Flow
// ============================================

// ---- Cart State ----
let cart = [];

function loadCart() {
  try {
    cart = JSON.parse(sessionStorage.getItem('quint_cart') || '[]');
  } catch {
    cart = [];
  }
}

function saveCart() {
  sessionStorage.setItem('quint_cart', JSON.stringify(cart));
}

// ---- Cart Operations ----
function addToCart(product) {
  // Sanitise what we store — only the fields we need
  const safe = {
    id:       Number(product.id),
    name:     String(product.name).slice(0, 120),
    price:    Number(product.price),
    emoji:    String(product.emoji || '📦').slice(0, 8),
    category: String(product.category),
    qty:      1,
  };

  const existing = cart.find(i => i.id === safe.id);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, 10); // cap at 10
  } else {
    cart.push(safe);
  }

  saveCart();
  renderCart();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== Number(productId));
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

// ---- Render Cart ----
function renderCart() {
  const container = document.getElementById('cart-items');
  const countEl   = document.getElementById('cart-count');
  const totalEl   = document.getElementById('cart-total-price');
  const checkoutBtn = document.getElementById('whatsapp-checkout');

  if (!container) return;

  const totalQty   = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  countEl.textContent = totalQty;
  totalEl.textContent = `KES ${totalPrice.toLocaleString()}`;

  // Enable/disable checkout button
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }

  // Build cart HTML — no raw product data injected into innerHTML
  const fragment = document.createDocumentFragment();
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-icon" aria-hidden="true">${item.emoji}</div>
      <div class="cart-item-details">
        <div class="cart-item-name"></div>
        <div class="cart-item-price">KES ${Number(item.price).toLocaleString()} × ${item.qty}</div>
      </div>
      <button class="cart-item-remove" aria-label="Remove item">✕</button>`;
    // Set text safely (no XSS)
    div.querySelector('.cart-item-name').textContent = item.name;
    div.querySelector('.cart-item-remove').addEventListener('click', () => removeFromCart(item.id));
    fragment.appendChild(div);
  });

  container.innerHTML = '';
  container.appendChild(fragment);
}

// ---- Cart Panel ----
function openCart()  {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}

// ============================================
// WHATSAPP ORDER FLOW
// ============================================

let _waTarget = null; // 'cart' | product object

// Build the WhatsApp message from cart
function buildCartWaMessage(customerName) {
  const name  = customerName.trim();
  const lines = cart.map(i => `  • ${i.name} (${i.category}) — KES ${i.price.toLocaleString()} × ${i.qty}`);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return [
    `Hello QUINT ESSENTIALS! 👋`,
    ``,
    `My name is *${name}* and I'd like to place an order:`,
    ``,
    ...lines,
    ``,
    `*Total: KES ${total.toLocaleString()}*`,
    ``,
    `Please let me know availability and delivery details. Thank you!`,
  ].join('\n');
}

// Build the WhatsApp message for a single product enquiry
function buildProductWaMessage(customerName, product) {
  return [
    `Hello QUINT ESSENTIALS! 👋`,
    ``,
    `My name is *${customerName.trim()}* and I'm interested in:`,
    ``,
    `  ${product.emoji} *${product.name}*`,
    `  Category: ${product.category}`,
    `  Price: KES ${Number(product.price).toLocaleString()}`,
    ``,
    `Could you please provide more details and confirm availability? Thank you!`,
  ].join('\n');
}

function openWaModal(target) {
  _waTarget = target;
  document.getElementById('wa-name').value = '';
  document.getElementById('wa-error').style.display = 'none';
  document.getElementById('wa-modal').classList.add('open');
  document.getElementById('overlay').classList.add('active');
  setTimeout(() => document.getElementById('wa-name').focus(), 100);
}

function closeWaModal() {
  document.getElementById('wa-modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  _waTarget = null;
}

function confirmWaOrder() {
  const nameInput = document.getElementById('wa-name');
  const errorEl   = document.getElementById('wa-error');
  const name      = nameInput.value.trim();

  // Validate
  if (!name || name.length < 2) {
    errorEl.textContent = 'Please enter your name (at least 2 characters).';
    errorEl.style.display = 'block';
    nameInput.focus();
    return;
  }
  if (!/^[a-zA-Z\s'\-\.]+$/.test(name)) {
    errorEl.textContent = 'Name may only contain letters, spaces, hyphens, and apostrophes.';
    errorEl.style.display = 'block';
    nameInput.focus();
    return;
  }

  errorEl.style.display = 'none';

  let message;
  if (_waTarget === 'cart') {
    message = buildCartWaMessage(name);
  } else if (_waTarget && typeof _waTarget === 'object') {
    message = buildProductWaMessage(name, _waTarget);
  } else {
    return;
  }

  const phone = QUINT_CONFIG.WHATSAPP_NUMBER;
  const url   = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  closeWaModal();
  closeCart();
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  renderCart();

  document.getElementById('cart-toggle').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);

  // WhatsApp checkout from cart
  document.getElementById('whatsapp-checkout').addEventListener('click', () => {
    if (cart.length === 0) return;
    openWaModal('cart');
  });

  // WhatsApp modal controls
  document.getElementById('wa-modal-close').addEventListener('click', closeWaModal);
  document.getElementById('wa-confirm-btn').addEventListener('click', confirmWaOrder);
  document.getElementById('wa-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmWaOrder();
  });

  // General WhatsApp links
  const waGeneral = document.getElementById('whatsapp-general');
  const waFooter  = document.getElementById('footer-whatsapp');
  const waUrl     = `https://wa.me/${QUINT_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello QUINT ESSENTIALS! I have an enquiry.')}`;
  if (waGeneral) waGeneral.href = waUrl;
  if (waFooter)  waFooter.href  = waUrl;

  // Overlay click
  document.getElementById('overlay').addEventListener('click', () => {
    closeCart();
    if (typeof closeModal === 'function') closeModal();
    closeWaModal();
  });
});