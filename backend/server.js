// ============================================
// OBSIDIAN — Express API Server
// Products (SQLite) + M-Pesa + Contacts
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb } = require('./db');
const { stkPush, queryStkStatus } = require('./mpesa');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// Rate limit all API routes
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));

// Stricter limit for payment routes
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Too many payment attempts. Please wait and try again.' }
});

// ============ AUTH MIDDLEWARE ============

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const db = getDb();
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (!stored || token !== stored.value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ PRODUCTS API ============

// GET all products (public)
app.get('/api/products', (req, res) => {
  const db = getDb();
  const { category } = req.query;
  let products;
  if (category && ['bags', 'shoes'].includes(category)) {
    products = db.prepare('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC').all(category);
  } else {
    products = db.prepare('SELECT * FROM products ORDER BY category, created_at DESC').all();
  }
  res.json({ products });
});

// GET single product (public)
app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
});

// POST create product (admin only)
app.post('/api/products', requireAdmin, (req, res) => {
  const { name, category, price, emoji, tag, description } = req.body;

  if (!name || !category || !price || !description) {
    return res.status(400).json({ error: 'name, category, price, and description are required' });
  }
  if (!['bags', 'shoes'].includes(category)) {
    return res.status(400).json({ error: 'category must be bags or shoes' });
  }
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO products (name, category, price, emoji, tag, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, Math.round(price), emoji || '📦', tag || '', description);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ product });
});

// PUT update product (admin only)
app.put('/api/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { name, category, price, emoji, tag, description } = req.body;

  db.prepare(`
    UPDATE products
    SET name=?, category=?, price=?, emoji=?, tag=?, description=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    name ?? existing.name,
    category ?? existing.category,
    price ? Math.round(price) : existing.price,
    emoji ?? existing.emoji,
    tag ?? existing.tag,
    description ?? existing.description,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ product: updated });
});

// DELETE product (admin only)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Product deleted' });
});

// ============ ADMIN AUTH API ============

// POST verify admin password
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const db = getDb();
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (stored && password === stored.value) {
    res.json({ success: true, token: password }); // Simple token = password itself
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// PUT change admin password
app.put('/api/admin/password', requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const db = getDb();
  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(newPassword);
  res.json({ success: true });
});

// ============ CONTACT API ============

app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO contacts (name, email, phone, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, phone || '', subject || 'enquiry', message);

  res.json({ success: true, message: 'Message received. We will respond within 24 hours.' });
});

// GET all contact messages (admin only)
app.get('/api/contacts', requireAdmin, (req, res) => {
  const db = getDb();
  const messages = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json({ messages });
});

// ============ ORDERS API ============

// POST create order + initiate M-Pesa STK push
app.post('/api/orders', paymentLimiter, async (req, res) => {
  const { customer_name, customer_phone, customer_email, items } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'customer_name, customer_phone, and items are required' });
  }

  // Phone validation (Kenya format)
  const phoneClean = customer_phone.replace(/\s/g, '').replace(/^\+/, '');
  if (!/^(254|0)[17]\d{8}$/.test(phoneClean)) {
    return res.status(400).json({ error: 'Invalid phone number. Use format 07XXXXXXXX or 254XXXXXXXXX' });
  }

  const db = getDb();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Create order record
  const orderResult = db.prepare(`
    INSERT INTO orders (customer_name, customer_phone, customer_email, total_amount, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(customer_name, customer_phone, customer_email || '', total);

  const orderId = orderResult.lastInsertRowid;

  // Insert order items
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, price, quantity, emoji)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertItems = db.transaction((orderItems) => {
    for (const item of orderItems) {
      insertItem.run(orderId, item.id || null, item.name, item.price, item.quantity, item.emoji || '');
    }
  });
  insertItems(items);

  // Initiate M-Pesa STK Push
  try {
    const mpesaResponse = await stkPush({
      phone: customer_phone,
      amount: total,
      orderId,
      description: `OBSIDIAN Order #${orderId}`,
    });

    if (mpesaResponse.ResponseCode === '0') {
      // STK Push sent successfully — save CheckoutRequestID to track callback
      db.prepare(`
        UPDATE orders SET checkout_request_id = ?, updated_at = datetime('now') WHERE id = ?
      `).run(mpesaResponse.CheckoutRequestID, orderId);

      res.json({
        success: true,
        orderId,
        checkoutRequestId: mpesaResponse.CheckoutRequestID,
        message: 'Payment prompt sent to your phone. Please enter your M-Pesa PIN.',
      });
    } else {
      db.prepare("UPDATE orders SET status='failed', updated_at=datetime('now') WHERE id=?").run(orderId);
      res.status(400).json({ error: 'Failed to initiate payment. Please try again.', details: mpesaResponse });
    }
  } catch (err) {
    console.error('M-Pesa error:', err.response?.data || err.message);
    db.prepare("UPDATE orders SET status='failed', updated_at=datetime('now') WHERE id=?").run(orderId);
    res.status(500).json({ error: 'Payment service unavailable. Please try again shortly.' });
  }
});

// ---- M-Pesa Callback (called by Safaricom after payment) ----
// This MUST be a publicly accessible HTTPS URL
app.post('/api/mpesa/callback', (req, res) => {
  const { Body } = req.body;

  // Always respond with 200 immediately — Safaricom expects this
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  if (!Body?.stkCallback) return;

  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
  const db = getDb();

  if (ResultCode === 0) {
    // Payment SUCCESSFUL
    const meta = {};
    if (CallbackMetadata?.Item) {
      CallbackMetadata.Item.forEach(item => {
        meta[item.Name] = item.Value;
      });
    }
    // meta.Amount, meta.MpesaReceiptNumber, meta.PhoneNumber, meta.TransactionDate

    db.prepare(`
      UPDATE orders
      SET status = 'paid',
          mpesa_ref = ?,
          updated_at = datetime('now')
      WHERE checkout_request_id = ?
    `).run(meta.MpesaReceiptNumber || 'UNKNOWN', CheckoutRequestID);

    console.log(`✓ Payment confirmed: Order ref ${meta.MpesaReceiptNumber}`);
  } else {
    // Payment FAILED or CANCELLED by user
    db.prepare(`
      UPDATE orders
      SET status = 'failed',
          updated_at = datetime('now')
      WHERE checkout_request_id = ?
    `).run(CheckoutRequestID);

    console.log(`✗ Payment failed (${ResultCode}): ${ResultDesc}`);
  }
});

// POST check payment status (frontend can poll this)
app.post('/api/orders/status', async (req, res) => {
  const { checkoutRequestId } = req.body;
  if (!checkoutRequestId) {
    return res.status(400).json({ error: 'checkoutRequestId is required' });
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE checkout_request_id = ?').get(checkoutRequestId);

  if (order) {
    // Return status from our DB (updated by callback)
    return res.json({
      status: order.status,
      orderId: order.id,
      mpesaRef: order.mpesa_ref,
    });
  }

  // If not in DB yet, query M-Pesa directly
  try {
    const result = await queryStkStatus(checkoutRequestId);
    res.json({ status: result.ResultCode === '0' ? 'paid' : 'pending', raw: result });
  } catch (err) {
    res.status(500).json({ error: 'Could not check payment status' });
  }
});

// GET all orders (admin only)
app.get('/api/orders', requireAdmin, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const withItems = orders.map(order => ({
    ...order,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id),
  }));
  res.json({ orders: withItems });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log('');
  console.log('  ██████  ██████  ███████ ██ ██████  ██  █████  ███    ██ ');
  console.log(' ██    ██ ██   ██ ██      ██ ██   ██ ██ ██   ██ ████   ██ ');
  console.log(' ██    ██ ██████  ███████ ██ ██   ██ ██ ███████ ██ ██  ██ ');
  console.log(' ██    ██ ██   ██      ██ ██ ██   ██ ██ ██   ██ ██  ██ ██ ');
  console.log('  ██████  ██████  ███████ ██ ██████  ██ ██   ██ ██   ████ ');
  console.log('');
  console.log(`  🖤 Server running at http://localhost:${PORT}`);
  console.log(`  📦 Database: obsidian.db`);
  console.log(`  🌍 Environment: ${process.env.MPESA_ENV || 'sandbox'}`);
  console.log('');
});