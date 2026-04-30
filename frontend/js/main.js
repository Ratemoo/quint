// ============================================
// QUINT ESSENTIALS— Main JavaScript
// 3D Canvas, Animations, Products, Modal
// ============================================

// -------- CUSTOM CURSOR --------
const cursor = document.getElementById('cursor');
const trail = document.getElementById('cursor-trail');
let mouseX = 0, mouseY = 0;
let trailX = 0, trailY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top = mouseY + 'px';
});

function animateTrail() {
  trailX += (mouseX - trailX) * 0.15;
  trailY += (mouseY - trailY) * 0.15;
  trail.style.left = trailX + 'px';
  trail.style.top = trailY + 'px';
  requestAnimationFrame(animateTrail);
}
animateTrail();

// Cursor effects
document.querySelectorAll('a, button, .product-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width = '6px';
    cursor.style.height = '6px';
    trail.style.width = '60px';
    trail.style.height = '60px';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width = '12px';
    cursor.style.height = '12px';
    trail.style.width = '36px';
    trail.style.height = '36px';
  });
});

// -------- 3D CANVAS BACKGROUND --------
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let gridPoints = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initGrid();
}

function initGrid() {
  gridPoints = [];
  const cols = Math.ceil(canvas.width / 80) + 1;
  const rows = Math.ceil(canvas.height / 80) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      gridPoints.push({
        x: c * 80,
        y: r * 80,
        ox: c * 80,
        oy: r * 80,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.05
      });
    }
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.05,
      life: Math.random() * Math.PI * 2
    });
  }
}

let frame = 0;
function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  frame++;

  // Subtle gradient base
  const grad = ctx.createRadialGradient(
    canvas.width * 0.5, canvas.height * 0.3, 0,
    canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
  );
  grad.addColorStop(0, 'rgba(25,25,25,0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid connections
  ctx.lineWidth = 0.3;
  for (let i = 0; i < gridPoints.length; i++) {
    const p = gridPoints[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life = (p.life || 0) + 0.008;

    // Drift back gently
    p.vx += (p.ox - p.x) * 0.0005;
    p.vy += (p.oy - p.y) * 0.0005;
    p.vx *= 0.99;
    p.vy *= 0.99;

    const pulse = 0.5 + 0.5 * Math.sin(p.life);

    for (let j = i + 1; j < gridPoints.length; j++) {
      const q = gridPoints[j];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        const alpha = (1 - dist / 120) * 0.08 * pulse;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    // Draw dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.opacity * pulse})`;
    ctx.fill();
  }

  // Draw floating particles
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life += 0.02;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    const pulse = 0.5 + 0.5 * Math.sin(p.life);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,168,76,${p.opacity * 0.3 * pulse})`;
    ctx.fill();
  });

  requestAnimationFrame(drawCanvas);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initParticles();
drawCanvas();

// -------- NAVBAR SCROLL --------
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// -------- SCROLL REVEAL --------
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 80);
    }
  });
}, { threshold: 0.1 });

// -------- RENDER PRODUCTS --------
function renderProducts() {
  const products = getProducts();
  const bags = products.filter(p => p.category === 'bags');
  const shoes = products.filter(p => p.category === 'shoes');

  renderGrid('bags-grid', bags);
  renderGrid('shoes-grid', shoes);
}

function renderGrid(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = products.length === 0
    ? '<p style="color:var(--mid-grey);letter-spacing:2px;font-size:12px;text-align:center;padding:60px;grid-column:1/-1;">No products yet. Check back soon.</p>'
    : products.map(p => `
      <div class="product-card fade-in-up" data-id="${p.id}">
        <div class="product-image">
          <div class="product-emoji">${p.emoji}</div>
        </div>
        <div class="product-info">
          <div class="product-category">${p.category} ${p.tag ? `· <span style="color:var(--white)">${p.tag}</span>` : ''}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-price">KES ${p.price.toLocaleString()}</div>
        </div>
        <div class="product-3d-border"></div>
        <div class="product-overlay">
          View Details
        </div>
      </div>
    `).join('');

  // Attach click events for modal
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // if (e.target.classList.contains('product-overlay')) return;
      const id = parseInt(card.dataset.id);
      openModal(id);
    });
  });

  // Observe for scroll reveal
  container.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
}

// -------- PRODUCT MODAL --------
let currentModalProduct = null;

function openModal(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  currentModalProduct = product;

  document.getElementById('modal-image').textContent = product.emoji;
  document.getElementById('modal-category').textContent = product.category.toUpperCase();
  document.getElementById('modal-name').textContent = product.name;
  document.getElementById('modal-desc').textContent = product.description;
  document.getElementById('modal-price').textContent = `KES ${product.price.toLocaleString()}`;

  const modal = document.getElementById('product-modal');
  modal.classList.add('open');
  document.getElementById('overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  currentModalProduct = null;
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();

  document.getElementById('modal-close').addEventListener('click', closeModal);

 // DISABLED: Cart functionality (Client request - April 2026)
document.getElementById('modal-add-cart').addEventListener('click', () => {
  alert("Ordering is currently unavailable. Please check back soon.");
});

  // Observe section headers
  document.querySelectorAll('.section-header, .about-text, .about-visual').forEach(el => {
    el.classList.add('fade-in-up');
    observer.observe(el);
  });
});

// -------- PARALLAX HERO --------
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const heroContent = document.querySelector('.hero-content');
  const hero3d = document.querySelector('.hero-3d');
  if (heroContent) heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
  if (hero3d) hero3d.style.transform = `translateY(calc(-50% + ${scrollY * 0.5}px))`;
});