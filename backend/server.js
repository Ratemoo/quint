require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');
const { getDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ===== AUTH =====
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const db = getDb();
  const stored = db.prepare("SELECT value FROM settings WHERE key='admin_password'").get();

  if (!stored || token !== stored.value) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ===== CLOUDINARY STORAGE =====
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'quint-products',
    allowed_formats: ['jpg','png','jpeg'],
  },
});

const upload = multer({ storage });

// ===== LOGIN =====
app.post('/api/admin/login', (req,res)=>{
  const { password } = req.body;
  const db = getDb();
  const stored = db.prepare("SELECT value FROM settings WHERE key='admin_password'").get();

  if (stored && password === stored.value) {
    return res.json({ token: password });
  }
  res.status(401).json({ error: 'Invalid password' });
});

// ===== PRODUCTS =====
app.get('/api/products', (req,res)=>{
  const db = getDb();
  const products = db.prepare('SELECT * FROM products').all();
  res.json({products});
});

// CREATE WITH IMAGE
app.post('/api/products', requireAdmin, upload.single('image'), (req,res)=>{
  const { name, category, price, tag, description } = req.body;
  const image_url = req.file?.path;

  const db = getDb();

  db.prepare(`
    INSERT INTO products (name, category, price, image_url, tag, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, price, image_url, tag, description);

  res.json({success:true});
});

// DELETE
app.delete('/api/products/:id', requireAdmin, (req,res)=>{
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({success:true});
});

app.listen(process.env.PORT || 3000, ()=>{
  console.log("Server running...");
});