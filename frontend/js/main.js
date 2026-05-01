// ============================================
// OBSIDIAN — Main JS
// Renders products with real images from API
// ============================================

const API_BASE = OBSIDIAN_CONFIG.API_BASE;

// ============ CUSTOM CURSOR ============
const cursor      = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursor-trail');
let mouseX = 0, mouseY = 0, trailX = 0, trailY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursor.style.left = mouseX + 'px'; cursor.style.top = mouseY + 'px';
});
(function animTrail() {
  trailX += (mouseX - trailX) * 0.15; trailY += (mouseY - trailY) * 0.15;
  cursorTrail.style.left = trailX + 'px'; cursorTrail.style.top = trailY + 'px';
  requestAnimationFrame(animTrail);
})();

document.addEventListener('mouseover', e => {
  if (e.target.closest('a, button, .product-card')) {
    cursor.style.width = '6px'; cursor.style.height = '6px';
    cursorTrail.style.width = '60px'; cursorTrail.style.height = '60px';
  } else {
    cursor.style.width = '12px'; cursor.style.height = '12px';
    cursorTrail.style.width = '36px'; cursorTrail.style.height = '36px';
  }
});

// ============ 3D CANVAS BACKGROUND ============
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
let pts = [];

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function initPts() {
  pts = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    ox: 0, oy: 0,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 1.5 + 0.5, life: Math.random() * Math.PI * 2,
  }));
  pts.forEach(p => { p.ox = p.x; p.oy = p.y; });
}
function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pts.forEach((p, i) => {
    p.life += 0.008;
    p.vx += (p.ox - p.x) * 0.0005; p.vy += (p.oy - p.y) * 0.0005;
    p.vx *= 0.99; p.vy *= 0.99; p.x += p.vx; p.y += p.vy;
    const pulse = 0.5 + 0.5 * Math.sin(p.life);
    for (let j = i + 1; j < pts.length; j++) {
      const q = pts[j], d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < 120) {
        ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 120) * 0.07 * pulse})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.size * 0.08 * pulse})`; ctx.fill();
  });
  requestAnimationFrame(drawCanvas);
}
window.addEventListener('resize', () => { resizeCanvas(); initPts(); });
resizeCanvas(); initPts(); drawCanvas();

// ============ NAVBAR SCROLL ============
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 80));

// ============ SCROLL REVEAL ============
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) setTimeout(() => entry.target.classList.add('visible'), i * 80);
  });
}, { threshold: 0.1 });

// ============ PRODUCTS ============
let allProducts = [];
let currentModalProduct = null;

async function loadProducts() {
  try {
    const data = await API.getProducts();
    allProducts = Array.isArray(data.products) ? data.products : [];
    renderGrid('bags-grid',  allProducts.filter(p => p.category === 'bags'));
    renderGrid('shoes-grid', allProducts.filter(p => p.category === 'shoes'));
  } catch {
    ['bags-grid','shoes-grid'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<p class="products-error">Could not load products. Please refresh.</p>`;
    });
  }
}

// Build the product image element (real image or placeholder)
function buildProductImageEl(product) {
  const wrap = document.createElement('div');
  wrap.className = 'product-image';
  wrap.setAttribute('aria-hidden', 'true');

  if (product.image_url) {
    const img = document.createElement('img');
    img.src   = `${API_BASE}${product.image_url}`;
    img.alt   = product.name;
    img.className = 'product-img';
    img.loading   = 'lazy';
    img.decoding  = 'async';
    // Graceful fallback if image fails to load
    img.onerror = () => {
      wrap.innerHTML = '';
      const ph = document.createElement('div');
      ph.className = 'product-placeholder';
      ph.setAttribute('aria-hidden', 'true');
      ph.textContent = product.category === 'bags' ? '👜' : '👠';
      wrap.appendChild(ph);
    };
    wrap.appendChild(img);
  } else {
    // No image uploaded yet — show a placeholder
    const ph = document.createElement('div');
    ph.className = 'product-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.textContent = product.category === 'bags' ? '👜' : '👠';
    wrap.appendChild(ph);
  }

  if (product.tag) {
    const tag = document.createElement('span');
    tag.className   = 'product-tag';
    tag.textContent = product.tag;
    wrap.appendChild(tag);
  }

  return wrap;
}

function renderGrid(gridId, products) {
  const container = document.getElementById(gridId);
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `<p class="products-empty">No products in this collection yet.</p>`;
    return;
  }

  container.innerHTML = '';
  const frag = document.createDocumentFragment();

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card fade-in-up';
    card.dataset.id = p.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    // Image area
    card.appendChild(buildProductImageEl(p));

    // Info area
    const info = document.createElement('div');
    info.className = 'product-info';

    const cat   = document.createElement('div'); cat.className = 'product-category'; cat.textContent = p.category;
    const name  = document.createElement('div'); name.className = 'product-name';    name.textContent = p.name;
    const price = document.createElement('div'); price.className = 'product-price';  price.textContent = `KES ${Number(p.price).toLocaleString()}`;

    info.appendChild(cat); info.appendChild(name); info.appendChild(price);
    card.appendChild(info);

    // Border decoration
    const border = document.createElement('div');
    border.className = 'product-3d-border';
    border.setAttribute('aria-hidden', 'true');
    card.appendChild(border);

    // Hover overlay
    const overlay = document.createElement('div');
    overlay.className = 'product-overlay';
    overlay.textContent = 'Add to Selection';
    overlay.setAttribute('role', 'button');
    overlay.addEventListener('click', e => { e.stopPropagation(); addToCart(p); });
    card.appendChild(overlay);

    card.addEventListener('click', () => openModal(p));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); }
    });

    frag.appendChild(card);
    revealObserver.observe(card);
  });

  container.appendChild(frag);
}

// ============ PRODUCT MODAL ============
function openModal(product) {
  currentModalProduct = product;

  // Modal image
  const modalImg = document.getElementById('modal-image');
  modalImg.innerHTML = '';
  if (product.image_url) {
    const img = document.createElement('img');
    img.src       = `${API_BASE}${product.image_url}`;
    img.alt       = product.name;
    img.className = 'modal-product-img';
    img.onerror   = () => { modalImg.textContent = product.category === 'bags' ? '👜' : '👠'; };
    modalImg.appendChild(img);
  } else {
    modalImg.textContent = product.category === 'bags' ? '👜' : '👠';
    modalImg.style.fontSize = '100px';
  }

  document.getElementById('modal-category').textContent = product.category.toUpperCase();
  document.getElementById('modal-name').textContent     = product.name;
  document.getElementById('modal-desc').textContent     = product.description || '';
  document.getElementById('modal-price').textContent    = `KES ${Number(product.price).toLocaleString()}`;

  document.getElementById('product-modal').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  currentModalProduct = null;
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-add-cart').addEventListener('click', () => {
    if (currentModalProduct) { addToCart(currentModalProduct); closeModal(); }
  });
  document.getElementById('modal-whatsapp').addEventListener('click', () => {
    if (currentModalProduct) { const p = currentModalProduct; closeModal(); openWaModal(p); }
  });

  // Contact form
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = form.querySelector('.contact-submit');
    const msgEl = document.getElementById('contact-msg');
    const name    = document.getElementById('c-name').value.trim();
    const email   = document.getElementById('c-email').value.trim();
    const phone   = document.getElementById('c-phone').value.trim();
    const subject = document.getElementById('c-subject').value;
    const message = document.getElementById('c-message').value.trim();

    if (!name || name.length < 2)   return showContactMsg('Please enter your full name.', 'error');
    if (!isValidEmail(email))        return showContactMsg('Please enter a valid email address.', 'error');
    if (!message || message.length < 10) return showContactMsg('Please enter a message (at least 10 characters).', 'error');

    btn.textContent = 'Sending...'; btn.disabled = true;
    try {
      await API.submitContact({ name, email, phone, subject, message });
      showContactMsg('✓ Message received. We will respond within 24 hours.', 'success');
      form.reset();
    } catch (err) {
      showContactMsg(err.message || 'Could not send message. Please try again.', 'error');
    } finally {
      btn.textContent = 'Send Message'; btn.disabled = false;
    }
  });

  document.querySelectorAll('.section-header, .about-text, .about-visual, .contact-left, .contact-right').forEach(el => {
    el.classList.add('fade-in-up'); revealObserver.observe(el);
  });
});

// ============ HELPERS ============
function isValidEmail(e) { return /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/.test(e); }

function showContactMsg(text, type) {
  const el = document.getElementById('contact-msg');
  el.textContent = text; el.className = `contact-response ${type}`; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

// Parallax
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const hc = document.querySelector('.hero-content'), h3 = document.querySelector('.hero-3d');
  if (hc) hc.style.transform = `translateY(${y * 0.3}px)`;
  if (h3) h3.style.transform = `translateY(calc(-50% + ${y * 0.5}px))`;
});