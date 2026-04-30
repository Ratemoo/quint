// ============================================
// OBSIDIAN — Database Setup (SQLite)
// Uses better-sqlite3 (synchronous, fast, no config)
// ============================================

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'obsidian.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better performance
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL CHECK(category IN ('bags','shoes')),
      price       INTEGER NOT NULL CHECK(price > 0),
      emoji       TEXT    NOT NULL DEFAULT '📦',
      tag         TEXT    DEFAULT '',
      description TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name   TEXT    NOT NULL,
      customer_phone  TEXT    NOT NULL,
      customer_email  TEXT,
      total_amount    INTEGER NOT NULL,
      status          TEXT    DEFAULT 'pending'
                              CHECK(status IN ('pending','paid','failed','cancelled')),
      mpesa_ref       TEXT,
      checkout_request_id TEXT,
      created_at      TEXT    DEFAULT (datetime('now')),
      updated_at      TEXT    DEFAULT (datetime('now'))
    );

    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      name       TEXT    NOT NULL,
      price      INTEGER NOT NULL,
      quantity   INTEGER NOT NULL DEFAULT 1,
      emoji      TEXT
    );

    -- Contact messages table
    CREATE TABLE IF NOT EXISTS contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT,
      subject    TEXT,
      message    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Admin settings table
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insert default admin password if not set
  const pw = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (!pw) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").run('obsidian2025');
  }
}

module.exports = { getDb };