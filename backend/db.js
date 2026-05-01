// ============================================
// OBSIDIAN — Database Layer (SQLite)
// All DB access goes through this module.
// ============================================

const Database = require('better-sqlite3');
const bcrypt   = require('bcrypt');
const path     = require('path');

const DB_PATH = path.join(__dirname, 'obsidian.db');
let db;

function getDb() {
  if (db) return db;

  db = new Database(DB_PATH);

  // Performance & safety pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');

  initSchema();
  return db;
}

function initSchema() {
  db.exec(`
    -- ---- Products ----
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL CHECK(length(name) BETWEEN 2 AND 120),
      category    TEXT    NOT NULL CHECK(category IN ('bags','shoes')),
      price       INTEGER NOT NULL CHECK(price BETWEEN 1 AND 10000000),
      image_url   TEXT    NOT NULL DEFAULT '',
      tag         TEXT    NOT NULL DEFAULT '' CHECK(tag IN ('','New','Bestseller','Limited')),
      description TEXT    NOT NULL CHECK(length(description) BETWEEN 10 AND 1000),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ---- Contact messages ----
    CREATE TABLE IF NOT EXISTS contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
      email      TEXT NOT NULL CHECK(length(email) BETWEEN 5 AND 150),
      phone      TEXT NOT NULL DEFAULT '' CHECK(length(phone) <= 20),
      subject    TEXT NOT NULL DEFAULT 'enquiry' CHECK(subject IN ('enquiry','order','bespoke','other')),
      message    TEXT NOT NULL CHECK(length(message) BETWEEN 10 AND 1000),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ---- Admin settings (hashed password stored here) ----
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrate: if old table has emoji column but not image_url, add image_url
  const cols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  if (!cols.includes('image_url')) {
    db.exec("ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
    console.log('✓ Migrated: added image_url column to products.');
  }

  // Hash and store initial password if not set
  const pw = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get();
  if (!pw) {
    const initial = process.env.ADMIN_INITIAL_PASSWORD || 'obsidian2025!';
    const hash    = bcrypt.hashSync(initial, 12);
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?)").run(hash);
    console.log('✓ Admin password initialised (hashed).');
  }
}

module.exports = { getDb };