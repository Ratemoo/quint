// ============================================
// QUINT ESSENTIALS — Secure Express API Server v3
// Layers: Route → Validation → Business → DB
// Image uploads: multer + sharp (resize/compress)
// ============================================

require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt    = require('bcrypt');
const multer    = require('multer');
const sharp     = require('sharp');
const path      = require('path');
const fs        = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, param, query, validationResult } = require('express-validator');

const { getDb }                    = require('./db');
const { createToken, verifyToken } = require('./auth');

const app        = express();
const PORT       = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// 1. Helmet — security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
    },
  },
  crossOriginOpenerPolicy:    { policy: 'same-origin' },
  crossOriginResourcePolicy:  { policy: 'cross-origin' }, // allow images to be loaded cross-origin
}));

// 2. CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // ✅ Always allow requests with no origin (Postman, server-to-server, health checks)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }

    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Admin-Token'],
}));

// 3. JSON body limit (for non-file routes)
app.use(express.json({ limit: '32kb' }));

// 4. Serve uploaded images as static files
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  etag: true,
  // Never serve directory listings
  index: false,
}));

// 5. Global rate limiter
const globalLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimit);

// 6. Auth rate limiter (anti brute-force)
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// ============================================================
// IMAGE UPLOAD CONFIG (multer + sharp)
// ============================================================

// Store to memory first — we'll process with sharp before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,   // 8 MB max raw upload
    files: 1,                     // Only 1 file per request
  },
  fileFilter: (_req, file, cb) => {
    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

// Process and save image: resize to max 1200px wide, convert to WebP, compress
async function processAndSaveImage(buffer, mimetype) {
  const filename = `${uuidv4()}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await sharp(buffer)
    .rotate()                       // Auto-rotate from EXIF (fixes phone photos)
    .resize(1200, 1200, {
      fit: 'inside',                // Keep aspect ratio, max 1200×1200
      withoutEnlargement: true,     // Never upscale smaller images
    })
    .webp({ quality: 82 })          // Convert everything to WebP, quality 82
    .toFile(filepath);

  return `/uploads/${filename}`;    // Public URL path
}

// Delete old image file from disk (called when product image is replaced/deleted)
function deleteImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filename = path.basename(imageUrl);
  // Security: ensure filename is just a UUID + .webp — no path traversal
  if (!/^[0-9a-f-]{36}\.webp$/.test(filename)) return;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filepath, err => {
    if (err && err.code !== 'ENOENT') console.warn('Could not delete image:', err.message);
  });
}

// ============================================================
// HELPERS
// ============================================================

function clean(str, max = 255) {
  return String(str || '').trim().slice(0, max);
}

function validate(req, res) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errs.array().map(e => e.msg) });
    return false;
  }
  return true;
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function requireAdmin(req, res, next) {
  const raw = req.headers['x-admin-token'];
  if (!raw || typeof raw !== 'string') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.adminPayload = verifyToken(raw);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// ============================================================
// BUSINESS LOGIC
// ============================================================

const ProductService = {
  getAll(category) {
    const db = getDb();
    if (category) {
      return db.prepare('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC').all(category);
    }
    return db.prepare('SELECT * FROM products ORDER BY category, created_at DESC').all();
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id);
  },

  create({ name, category, price, image_url, tag, description }) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO products (name, category, price, image_url, tag, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      clean(name, 120),
      category,
      Math.round(price),
      image_url || '',
      tag || '',
      clean(description, 1000)
    );
    return db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  },

  update(id, { name, category, price, image_url, tag, description }) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) throw new Error('Product not found');

    db.prepare(`
      UPDATE products
      SET name=?, category=?, price=?, image_url=?, tag=?, description=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      name        !== undefined ? clean(name, 120)        : existing.name,
      category    !== undefined ? category                 : existing.category,
      price       !== undefined ? Math.round(price)        : existing.price,
      image_url   !== undefined ? image_url                : existing.image_url,
      tag         !== undefined ? tag                      : existing.tag,
      description !== undefined ? clean(description, 1000) : existing.description,
      id
    );
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },

  delete(id) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) throw new Error('Product not found');
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return existing; // Return it so caller can delete the image file
  },
};

const ContactService = {
  save({ name, email, phone, subject, message }) {
    getDb().prepare(`
      INSERT INTO contacts (name, email, phone, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      clean(name, 100),
      clean(email, 150),
      clean(phone, 20),
      ['enquiry','order','bespoke','other'].includes(subject) ? subject : 'enquiry',
      clean(message, 1000)
    );
  },

  getAll() {
    return getDb().prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  },
};

const AdminService = {
  verifyPassword(password) {
    const db  = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get();
    if (!row) throw new Error('Admin not configured');
    return bcrypt.compareSync(password, row.value);
  },

  changePassword(newPassword) {
    const hash = bcrypt.hashSync(newPassword, 12);
    getDb().prepare("UPDATE settings SET value = ? WHERE key = 'admin_password_hash'").run(hash);
  },
};

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- PRODUCTS (public) ----

app.get('/api/products',
  [query('category').optional().isIn(['bags','shoes']).withMessage('Category must be bags or shoes')],
  (req, res) => {
    if (!validate(req, res)) return;
    try {
      const products = ProductService.getAll(req.query.category || null);
      res.json({ products });
    } catch {
      res.status(500).json({ error: 'Could not load products' });
    }
  }
);

app.get('/api/products/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid product ID')],
  (req, res) => {
    if (!validate(req, res)) return;
    const product = ProductService.getById(Number(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  }
);

// ---- PRODUCTS (admin) — multipart form for image ----

// POST /api/products — create with image upload
app.post('/api/products',
  requireAdmin,
  upload.single('image'),           // 'image' = form field name
  async (req, res) => {
    try {
      const { name, category, price, tag, description } = req.body;

      // Validate text fields manually (express-validator doesn't work cleanly with multipart)
      const errors = [];
      if (!name || name.trim().length < 2 || name.trim().length > 120)
        errors.push('Name must be 2–120 characters');
      if (!['bags','shoes'].includes(category))
        errors.push('Category must be bags or shoes');
      const priceNum = parseInt(price, 10);
      if (!price || isNaN(priceNum) || priceNum < 1 || priceNum > 10_000_000)
        errors.push('Price must be between 1 and 10,000,000');
      if (!description || description.trim().length < 10 || description.trim().length > 1000)
        errors.push('Description must be 10–1000 characters');
      if (tag && !['','New','Bestseller','Limited'].includes(tag))
        errors.push('Invalid tag value');

      if (errors.length) return res.status(422).json({ error: 'Validation failed', details: errors });

      // Process uploaded image
      let image_url = '';
      if (req.file) {
        image_url = await processAndSaveImage(req.file.buffer, req.file.mimetype);
      }

      const product = ProductService.create({ name: name.trim(), category, price: priceNum, image_url, tag: tag || '', description: description.trim() });
      res.status(201).json({ product });
    } catch (err) {
      console.error('Create product error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
);

// PUT /api/products/:id — update; image is optional
app.put('/api/products/:id',
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid product ID' });

    try {
      const existing = ProductService.getById(id);
      if (!existing) return res.status(404).json({ error: 'Product not found' });

      const { name, category, price, tag, description } = req.body;

      // Validate only the fields provided
      const errors = [];
      if (name !== undefined && (name.trim().length < 2 || name.trim().length > 120))
        errors.push('Name must be 2–120 characters');
      if (category !== undefined && !['bags','shoes'].includes(category))
        errors.push('Category must be bags or shoes');
      if (price !== undefined) {
        const p = parseInt(price, 10);
        if (isNaN(p) || p < 1 || p > 10_000_000) errors.push('Price must be 1–10,000,000');
      }
      if (description !== undefined && (description.trim().length < 10 || description.trim().length > 1000))
        errors.push('Description must be 10–1000 characters');
      if (tag !== undefined && !['','New','Bestseller','Limited'].includes(tag))
        errors.push('Invalid tag value');

      if (errors.length) return res.status(422).json({ error: 'Validation failed', details: errors });

      // Handle image replacement
      let image_url = undefined; // undefined = keep existing
      if (req.file) {
        image_url = await processAndSaveImage(req.file.buffer, req.file.mimetype);
        // Delete old image from disk
        deleteImageFile(existing.image_url);
      }

      const updates = {};
      if (name        !== undefined) updates.name        = name.trim();
      if (category    !== undefined) updates.category    = category;
      if (price       !== undefined) updates.price       = parseInt(price, 10);
      if (tag         !== undefined) updates.tag         = tag;
      if (description !== undefined) updates.description = description.trim();
      if (image_url   !== undefined) updates.image_url   = image_url;

      const product = ProductService.update(id, updates);
      res.json({ product });
    } catch (err) {
      console.error('Update product error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/products/:id
app.delete('/api/products/:id',
  requireAdmin,
  [param('id').isInt({ min: 1 }).withMessage('Invalid product ID')],
  (req, res) => {
    if (!validate(req, res)) return;
    try {
      const deleted = ProductService.delete(Number(req.params.id));
      deleteImageFile(deleted.image_url); // Remove image from disk
      res.json({ success: true });
    } catch (err) {
      res.status(err.message === 'Product not found' ? 404 : 500).json({ error: err.message });
    }
  }
);

// ---- ADMIN AUTH ----

app.post('/api/admin/login',
  authLimit,
  [body('password').isString().isLength({ min: 1, max: 128 }).withMessage('Password is required')],
  (req, res) => {
    if (!validate(req, res)) return;
    const isValid = AdminService.verifyPassword(req.body.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const token = createToken({
      role: 'admin',
      exp:  Date.now() + 8 * 60 * 60 * 1000,
    });
    res.json({ success: true, token });
  }
);

app.put('/api/admin/password',
  requireAdmin,
  [
    body('newPassword')
      .isString().isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ],
  (req, res) => {
    if (!validate(req, res)) return;
    AdminService.changePassword(req.body.newPassword);
    res.json({ success: true });
  }
);

// ---- CONTACT ----

app.post('/api/contact',
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').optional().isString().isLength({ max: 20 }),
    body('subject').optional().isIn(['enquiry','order','bespoke','other']),
    body('message').isString().trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be 10–1000 chars'),
  ],
  (req, res) => {
    if (!validate(req, res)) return;
    try {
      ContactService.save(req.body);
      res.json({ success: true, message: 'Message received. We will respond within 24 hours.' });
    } catch {
      res.status(500).json({ error: 'Could not save message. Please try again.' });
    }
  }
);

app.get('/api/contacts', requireAdmin, (_req, res) => {
  try {
    res.json({ messages: ContactService.getAll() });
  } catch {
    res.status(500).json({ error: 'Could not load messages' });
  }
});

// ============================================================
// ERROR HANDLING
// ============================================================

// Multer errors (file too large, wrong type)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image too large. Maximum size is 8 MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(415).json({ error: err.message });
  }
  next(err);
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler — never leak stack traces
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// START
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🖤  QUINT ESSENTIALS Backend v3');
  console.log(`  ✓   http://0.0.0.0:${PORT}`);
  console.log(`  ✓   CORS: ${allowedOrigins.join(', ')}`);
  console.log(`  ✓   Uploads: ${UPLOAD_DIR}`);
  console.log('');
});