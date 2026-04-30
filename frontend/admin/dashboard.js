// ============================================
// QUINT — Admin Dashboard JS
// Products CRUD + Password Management
// ============================================

// ---- Auth Guard ----
const API = "http://localhost:3000/api";
const TOKEN = localStorage.getItem('admin_token');

async function fetchProducts() {
  const res = await fetch(`${API}/products`);
  const data = await res.json();
  return data.products;
}

async function renderTable() {
  const products = await fetchProducts();

  document.getElementById('products-tbody').innerHTML =
    products.map(p => `
      <tr>
        <td><img src="${p.image_url}" width="60"/></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.price}</td>
        <td>
          <button onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
}

// CREATE PRODUCT
document.getElementById('save-product-btn').addEventListener('click', async () => {
  const formData = new FormData();

  formData.append('name', document.getElementById('f-name').value);
  formData.append('category', document.getElementById('f-category').value);
  formData.append('price', document.getElementById('f-price').value);
  formData.append('tag', document.getElementById('f-tag').value);
  formData.append('description', document.getElementById('f-description').value);

  const file = document.getElementById('f-image').files[0];
  if (file) formData.append('image', file);

  await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'x-admin-token': TOKEN },
    body: formData
  });

  renderTable();
});

// DELETE
async function deleteProduct(id) {
  await fetch(`${API}/products/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': TOKEN }
  });

  renderTable();
}

renderTable();