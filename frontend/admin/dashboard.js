// ============================================
// OBSIDIAN — Admin Dashboard JS
// Products CRUD + Password Management
// ============================================

// ---- Auth Guard ----
if (!sessionStorage.getItem('obsidian_auth')) {
  window.location.href = 'login.html';
}

// ---- Cursor ----
const cursor = document.getElementById('cursor');
const trail = document.getElementById('cursor-trail');
let mx = 0, my = 0, tx = 0, ty = 0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
});
(function animT() {
  tx += (mx - tx) * 0.15; ty += (my - ty) * 0.15;
  trail.style.left = tx + 'px'; trail.style.top = ty + 'px';
  requestAnimationFrame(animT);
})();
document.querySelectorAll('a, button, input, select, textarea').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width = '6px'; cursor.style.height = '6px';
    trail.style.width = '50px'; trail.style.height = '50px';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width = '12px'; cursor.style.height = '12px';
    trail.style.width = '36px'; trail.style.height = '36px';
  });
});

// ---- State ----
let products = getProducts();
let currentFilter = 'all';
let editingId = null;
let pendingDeleteId = null;

// ---- Tab System ----
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    switchTab(tab);
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
}

// ---- Filter Buttons ----
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
  });
});

// ---- Stats ----
function updateStats() {
  products = getProducts();
  const bags = products.filter(p => p.category === 'bags').length;
  const shoes = products.filter(p => p.category === 'shoes').length;
  document.getElementById('stat-total').textContent = products.length;
  document.getElementById('stat-bags').textContent = bags;
  document.getElementById('stat-shoes').textContent = shoes;
}

// ---- Render Table ----
function renderTable() {
  products = getProducts();
  const filtered = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
  const tbody = document.getElementById('products-tbody');

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--mid-grey);letter-spacing:2px;font-size:11px;">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr data-id="${p.id}">
      <td class="table-emoji">${p.emoji}</td>
      <td class="table-name">${p.name}</td>
      <td style="font-size:10px;letter-spacing:2px;color:var(--accent);text-transform:uppercase">${p.category}</td>
      <td>KES ${p.price.toLocaleString()}</td>
      <td>${p.tag ? `<span class="table-tag">${p.tag}</span>` : '<span style="color:var(--mid-grey);font-size:10px">—</span>'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="startEdit(${p.id})">Edit</button>
          <button class="btn-delete" onclick="startDelete(${p.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  updateStats();
}

// ---- Add / Edit Product ----
document.getElementById('save-product-btn').addEventListener('click', saveProduct);

function saveProduct() {
  const name = document.getElementById('f-name').value.trim();
  const category = document.getElementById('f-category').value;
  const price = parseInt(document.getElementById('f-price').value);
  const emoji = document.getElementById('f-emoji').value.trim() || '📦';
  const tag = document.getElementById('f-tag').value;
  const description = document.getElementById('f-description').value.trim();
  const msgEl = document.getElementById('form-message');

  if (!name || !price || !description) {
    showMessage(msgEl, 'Please fill in all required fields.', 'error');
    return;
  }

  if (isNaN(price) || price < 0) {
    showMessage(msgEl, 'Please enter a valid price.', 'error');
    return;
  }

  products = getProducts();

  if (editingId) {
    // Update existing
    const idx = products.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, category, price, emoji, tag, description };
    }
    showMessage(msgEl, '✓ Product updated successfully.', 'success');
    editingId = null;
    document.getElementById('form-title').textContent = 'Add New Product';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('save-product-btn').textContent = 'Save Product';
  } else {
    // New product
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, category, price, emoji, tag, description });
    showMessage(msgEl, '✓ Product added successfully.', 'success');
  }

  saveProducts(products);
  clearForm();
  renderTable();
}

function startEdit(id) {
  products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;

  editingId = id;

  document.getElementById('f-name').value = product.name;
  document.getElementById('f-category').value = product.category;
  document.getElementById('f-price').value = product.price;
  document.getElementById('f-emoji').value = product.emoji;
  document.getElementById('f-tag').value = product.tag || '';
  document.getElementById('f-description').value = product.description;

  document.getElementById('form-title').textContent = `Edit: ${product.name}`;
  document.getElementById('save-product-btn').textContent = 'Update Product';
  document.getElementById('cancel-edit-btn').style.display = 'inline-block';
  document.getElementById('form-message').style.display = 'none';

  switchTab('add');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-tab="add"]').classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  editingId = null;
  clearForm();
  document.getElementById('form-title').textContent = 'Add New Product';
  document.getElementById('save-product-btn').textContent = 'Save Product';
  document.getElementById('cancel-edit-btn').style.display = 'none';
});

function clearForm() {
  ['f-name', 'f-price', 'f-emoji', 'f-description'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-category').value = 'bags';
  document.getElementById('f-tag').value = '';
}

// ---- Delete ----
function startDelete(id) {
  pendingDeleteId = id;
  const product = getProducts().find(p => p.id === id);
  document.getElementById('delete-modal-name').textContent = product ? product.name : '';
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}

document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('overlay').addEventListener('click', closeDeleteModal);

document.getElementById('delete-confirm').addEventListener('click', () => {
  if (pendingDeleteId !== null) {
    products = getProducts().filter(p => p.id !== pendingDeleteId);
    saveProducts(products);
    renderTable();
    closeDeleteModal();
  }
});

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  pendingDeleteId = null;
}

// ---- Password Change ----
document.getElementById('change-pass-btn').addEventListener('click', () => {
  const current = document.getElementById('s-current').value;
  const newPass = document.getElementById('s-new').value;
  const confirm = document.getElementById('s-confirm').value;
  const msgEl = document.getElementById('security-message');

  const storedPass = localStorage.getItem('obsidian_admin_pass') || 'obsidian2025';

  if (current !== storedPass) {
    showMessage(msgEl, '✕ Current password is incorrect.', 'error');
    return;
  }

  if (newPass.length < 8) {
    showMessage(msgEl, '✕ New password must be at least 8 characters.', 'error');
    return;
  }

  if (newPass !== confirm) {
    showMessage(msgEl, '✕ Passwords do not match.', 'error');
    return;
  }

  localStorage.setItem('obsidian_admin_pass', newPass);
  showMessage(msgEl, '✓ Password updated successfully.', 'success');

  document.getElementById('s-current').value = '';
  document.getElementById('s-new').value = '';
  document.getElementById('s-confirm').value = '';
});

// ---- Logout ----
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('obsidian_auth');
  window.location.href = 'login.html';
});

// ---- Helpers ----
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `form-message ${type}`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 4000);
}

// ---- Init ----
renderTable();