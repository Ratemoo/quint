// ============================================
// OBSIDIAN — API Layer (Application ↔ Backend)
// All HTTP calls go through here.
// ============================================

const API = (() => {
  const BASE = OBSIDIAN_CONFIG.API_BASE;

  // JSON fetch wrapper (for non-file routes)
  async function request(method, path, body = null, authToken = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['X-Admin-Token'] = authToken;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${BASE}${path}`, options);
    } catch {
      throw new Error('Cannot reach server. Please check your connection.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    return data;
  }

  // Multipart fetch wrapper (for file uploads)
  async function requestForm(method, path, formData, authToken) {
    const headers = {};
    if (authToken) headers['X-Admin-Token'] = authToken;
    // Do NOT set Content-Type — browser sets it with boundary automatically

    let res;
    try {
      res = await fetch(`${BASE}${path}`, { method, headers, body: formData });
    } catch {
      throw new Error('Cannot reach server. Please check your connection.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.details ? data.details.join(', ') : (data.error || `Server error (${res.status})`);
      throw new Error(msg);
    }
    return data;
  }

  return {
    // ---- PUBLIC ----
    getProducts: (category = null) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      return request('GET', `/api/products${qs}`);
    },

    submitContact: (payload) => request('POST', '/api/contact', payload),

    // ---- ADMIN ----
    adminLogin: (password) =>
      request('POST', '/api/admin/login', { password }),

    adminChangePassword: (token, newPassword) =>
      request('PUT', '/api/admin/password', { newPassword }, token),

    adminGetProducts: (token) =>
      request('GET', '/api/products', null, token),

    // Create product — sends multipart form (supports image file)
    adminCreateProduct: (token, data, imageFile) => {
      const form = new FormData();
      form.append('name',        data.name);
      form.append('category',    data.category);
      form.append('price',       String(data.price));
      form.append('tag',         data.tag || '');
      form.append('description', data.description);
      if (imageFile) form.append('image', imageFile);
      return requestForm('POST', '/api/products', form, token);
    },

    // Update product — sends multipart form (image optional)
    adminUpdateProduct: (token, id, data, imageFile) => {
      const form = new FormData();
      if (data.name        !== undefined) form.append('name',        data.name);
      if (data.category    !== undefined) form.append('category',    data.category);
      if (data.price       !== undefined) form.append('price',       String(data.price));
      if (data.tag         !== undefined) form.append('tag',         data.tag);
      if (data.description !== undefined) form.append('description', data.description);
      if (imageFile) form.append('image', imageFile);
      return requestForm('PUT', `/api/products/${encodeURIComponent(id)}`, form, token);
    },

    adminDeleteProduct: (token, id) =>
      request('DELETE', `/api/products/${encodeURIComponent(id)}`, null, token),

    adminGetContacts: (token) =>
      request('GET', '/api/contacts', null, token),
  };
})();