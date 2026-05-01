// ============================================
// QUINT ESSENTIALS — Admin Dashboard JS v3
// Product CRUD with image upload support
// ============================================

// ---- Auth Guard ----
const adminToken = sessionStorage.getItem(QUINT_CONFIG.SESSION_KEY);
if (!adminToken) window.location.replace('login.html');

const API_BASE = QUINT_CONFIG.API_BASE;

// ---- Cursor ----
const cur = document.getElementById('cursor'), tr = document.getElementById('cursor-trail');
let mx=0,my=0,tx=0,ty=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px';});
(function at(){tx+=(mx-tx)*.15;ty+=(my-ty)*.15;tr.style.left=tx+'px';tr.style.top=ty+'px';requestAnimationFrame(at);})();

// ---- State ----
let allProducts     = [];
let currentFilter   = 'all';
let editingId       = null;
let pendingDeleteId = null;
let selectedImage   = null; // File object for upload

// ============ IMAGE UPLOAD UI ============
const fileInput       = document.getElementById('f-image');
const uploadArea      = document.getElementById('image-upload-area');
const previewImg      = document.getElementById('image-preview');
const placeholder     = document.getElementById('image-placeholder');
const chooseBtn       = document.getElementById('choose-image-btn');
const removeBtn       = document.getElementById('remove-image-btn');
const currentImgNote  = document.getElementById('current-image-note');

chooseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) applyImageFile(fileInput.files[0]);
});

removeBtn.addEventListener('click', () => {
  clearImageSelection();
});

// Drag-and-drop
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) applyImageFile(file);
});

function applyImageFile(file) {
  const ALLOWED = ['image/jpeg','image/jpg','image/png','image/webp'];
  if (!ALLOWED.includes(file.type)) {
    alert('Please select a JPEG, PNG, or WebP image.');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert('Image must be smaller than 8 MB.');
    return;
  }

  selectedImage = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.style.display = 'block';
  placeholder.style.display = 'none';
  removeBtn.style.display = 'inline-block';
}

function clearImageSelection() {
  selectedImage = null;
  fileInput.value = '';
  previewImg.src = '';
  previewImg.style.display = 'none';
  placeholder.style.display = 'flex';
  removeBtn.style.display = 'none';
}

function showExistingImagePreview(imageUrl) {
  if (!imageUrl) { clearImageSelection(); return; }
  previewImg.src = `${API_BASE}${imageUrl}`;
  previewImg.style.display = 'block';
  placeholder.style.display = 'none';
  removeBtn.style.display = 'inline-block';
  currentImgNote.style.display = 'block';
}

// ============ TABS ============
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    switchTab(tab);
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    if (tab === 'contacts') loadContacts();
  });
});

function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
}

// ============ FILTER ============
document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();
  });
});

// ============ STATS ============
function updateStats() {
  document.getElementById('stat-total').textContent = allProducts.length;
  document.getElementById('stat-bags').textContent  = allProducts.filter(p => p.category === 'bags').length;
  document.getElementById('stat-shoes').textContent = allProducts.filter(p => p.category === 'shoes').length;
}

// ============ LOAD PRODUCTS ============
async function loadProducts() {
  try {
    const data  = await API.adminGetProducts(adminToken);
    allProducts = Array.isArray(data.products) ? data.products : [];
    renderTable();
    updateStats();
    document.getElementById('products-load-error').style.display = 'none';
  } catch (err) {
    const el = document.getElementById('products-load-error');
    el.textContent = `Could not load products: ${err.message}`;
    el.style.display = 'block';
  }
}

// ============ RENDER TABLE ============
function renderTable() {
  const filtered = currentFilter === 'all' ? allProducts : allProducts.filter(p => p.category === currentFilter);
  const tbody    = document.getElementById('products-tbody');
  tbody.innerHTML = '';

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--mid-grey);letter-spacing:2px;font-size:11px;">No products found.</td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach(p => {
    const row = document.createElement('tr');
    row.dataset.id = p.id;

    // Thumbnail cell
    const thumbTd = document.createElement('td');
    if (p.image_url) {
      const img = document.createElement('img');
      img.src       = `${API_BASE}${p.image_url}`;
      img.alt       = p.name;
      img.className = 'table-thumb';
      img.onerror   = () => { thumbTd.innerHTML = `<div class="table-thumb-placeholder">${p.category === 'bags' ? '👜' : '👠'}</div>`; };
      thumbTd.appendChild(img);
    } else {
      thumbTd.innerHTML = `<div class="table-thumb-placeholder">${p.category === 'bags' ? '👜' : '👠'}</div>`;
    }
    row.appendChild(thumbTd);

    // Text cells
    [
      { text: p.name,     cls: 'table-name' },
      { text: p.category, style: 'font-size:10px;letter-spacing:2px;color:var(--accent);text-transform:uppercase' },
      { text: `KES ${Number(p.price).toLocaleString()}` },
    ].forEach(c => {
      const td = document.createElement('td');
      if (c.cls)   td.className = c.cls;
      if (c.style) td.setAttribute('style', c.style);
      td.textContent = c.text;
      row.appendChild(td);
    });

    // Tag cell
    const tagTd = document.createElement('td');
    if (p.tag) {
      const span = document.createElement('span');
      span.className = 'table-tag'; span.textContent = p.tag;
      tagTd.appendChild(span);
    } else {
      tagTd.innerHTML = '<span style="color:var(--mid-grey);font-size:10px">—</span>';
    }
    row.appendChild(tagTd);

    // Actions cell
    const actTd = document.createElement('td');
    const wrap   = document.createElement('div'); wrap.className = 'table-actions';
    const editBtn = document.createElement('button'); editBtn.className = 'btn-edit'; editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(p.id));
    const delBtn  = document.createElement('button'); delBtn.className  = 'btn-delete'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => startDelete(p.id));
    wrap.appendChild(editBtn); wrap.appendChild(delBtn);
    actTd.appendChild(wrap); row.appendChild(actTd);

    frag.appendChild(row);
  });
  tbody.appendChild(frag);
}

// ============ SAVE PRODUCT ============
document.getElementById('save-product-btn').addEventListener('click', saveProduct);

async function saveProduct() {
  const name        = document.getElementById('f-name').value.trim();
  const category    = document.getElementById('f-category').value;
  const price       = parseInt(document.getElementById('f-price').value, 10);
  const tag         = document.getElementById('f-tag').value;
  const description = document.getElementById('f-description').value.trim();
  const msgEl       = document.getElementById('form-message');

  // Validate
  if (!name || name.length < 2)         return showMsg(msgEl, 'Product name is required (min 2 chars).', 'error');
  if (!['bags','shoes'].includes(category)) return showMsg(msgEl, 'Invalid category.', 'error');
  if (!price || isNaN(price) || price < 1) return showMsg(msgEl, 'Please enter a valid price.', 'error');
  if (!description || description.length < 10) return showMsg(msgEl, 'Description is required (min 10 chars).', 'error');

  const btn = document.getElementById('save-product-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const data = { name, category, price, tag, description };

    if (editingId) {
      await API.adminUpdateProduct(adminToken, editingId, data, selectedImage || undefined);
      showMsg(msgEl, '✓ Product updated.', 'success');
      cancelEdit();
    } else {
      await API.adminCreateProduct(adminToken, data, selectedImage || undefined);
      showMsg(msgEl, '✓ Product added.', 'success');
      clearForm();
    }

    await loadProducts();
  } catch (err) {
    showMsg(msgEl, err.message || 'Save failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Update Product' : 'Save Product';
  }
}

function startEdit(id) {
  const p = allProducts.find(p => p.id === id);
  if (!p) return;
  editingId = id;

  document.getElementById('f-name').value        = p.name;
  document.getElementById('f-category').value    = p.category;
  document.getElementById('f-price').value       = p.price;
  document.getElementById('f-tag').value         = p.tag || '';
  document.getElementById('f-description').value = p.description;

  // Show existing image
  clearImageSelection();
  if (p.image_url) showExistingImagePreview(p.image_url);
  currentImgNote.style.display = p.image_url ? 'block' : 'none';

  document.getElementById('form-title').textContent       = `Edit: ${p.name}`;
  document.getElementById('save-product-btn').textContent = 'Update Product';
  document.getElementById('cancel-edit-btn').style.display = 'inline-block';
  document.getElementById('form-message').style.display   = 'none';

  switchTab('add');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-tab="add"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);

function cancelEdit() {
  editingId = null;
  clearForm();
  document.getElementById('form-title').textContent       = 'Add New Product';
  document.getElementById('save-product-btn').textContent = 'Save Product';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

function clearForm() {
  ['f-name','f-price','f-description'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-category').value = 'bags';
  document.getElementById('f-tag').value       = '';
  clearImageSelection();
  currentImgNote.style.display = 'none';
}

// ============ DELETE ============
function startDelete(id) {
  pendingDeleteId = id;
  const p = allProducts.find(p => p.id === id);
  document.getElementById('delete-modal-name').textContent = p ? p.name : '';
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}

document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('overlay').addEventListener('click', closeDeleteModal);

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (pendingDeleteId === null) return;
  const btn = document.getElementById('delete-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await API.adminDeleteProduct(adminToken, pendingDeleteId);
    closeDeleteModal();
    await loadProducts();
  } catch (err) {
    closeDeleteModal();
    alert(`Delete failed: ${err.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Delete';
  }
});

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  pendingDeleteId = null;
}

// ============ CONTACT MESSAGES ============
async function loadContacts() {
  const tbody = document.getElementById('contacts-tbody');
  const errEl = document.getElementById('contacts-load-error');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--mid-grey);font-size:11px;letter-spacing:2px;">Loading...</td></tr>`;
  errEl.style.display = 'none';

  try {
    const data = await API.adminGetContacts(adminToken);
    const msgs = Array.isArray(data.messages) ? data.messages : [];
    tbody.innerHTML = '';

    if (!msgs.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--mid-grey);font-size:11px;letter-spacing:2px;">No messages yet.</td></tr>`;
      return;
    }

    const frag = document.createDocumentFragment();
    msgs.forEach(m => {
      const row = document.createElement('tr');
      [m.name, m.email, m.subject || '—', m.message, m.created_at ? m.created_at.slice(0, 16) : '—'].forEach((val, idx) => {
        const td = document.createElement('td');
        td.textContent = val;
        if (idx === 3) td.className = 'contact-row-msg';
        row.appendChild(td);
      });
      frag.appendChild(row);
    });
    tbody.appendChild(frag);
  } catch (err) {
    errEl.textContent = `Could not load messages: ${err.message}`;
    errEl.style.display = 'block';
    tbody.innerHTML = '';
  }
}

document.getElementById('refresh-contacts-btn').addEventListener('click', loadContacts);

// ============ CHANGE PASSWORD ============
document.getElementById('change-pass-btn').addEventListener('click', async () => {
  const current = document.getElementById('s-current').value;
  const newPass  = document.getElementById('s-new').value;
  const confirm  = document.getElementById('s-confirm').value;
  const msgEl    = document.getElementById('security-message');

  if (!current)            return showMsg(msgEl, '✕ Enter your current password.', 'error');
  if (newPass.length < 8)  return showMsg(msgEl, '✕ New password must be at least 8 characters.', 'error');
  if (!/[A-Z]/.test(newPass)) return showMsg(msgEl, '✕ Password must contain an uppercase letter.', 'error');
  if (!/[0-9]/.test(newPass)) return showMsg(msgEl, '✕ Password must contain a number.', 'error');
  if (newPass !== confirm)  return showMsg(msgEl, '✕ Passwords do not match.', 'error');

  const btn = document.getElementById('change-pass-btn');
  btn.disabled = true; btn.textContent = 'Updating...';
  try {
    await API.adminLogin(current); // Verify current password
    await API.adminChangePassword(adminToken, newPass);
    sessionStorage.setItem(QUINT_CONFIG.SESSION_KEY, newPass);
    showMsg(msgEl, '✓ Password updated successfully.', 'success');
    ['s-current','s-new','s-confirm'].forEach(id => document.getElementById(id).value = '');
  } catch (err) {
    showMsg(msgEl, err.message.includes('Invalid') ? '✕ Current password is incorrect.' : err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Update Password';
  }
});

// ============ LOGOUT ============
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem(QUINT_CONFIG.SESSION_KEY);
  window.location.replace('login.html');
});

// ============ HELPERS ============
function showMsg(el, text, type) {
  el.textContent = text; el.className = `form-message ${type}`; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ============ INIT ============
loadProducts();