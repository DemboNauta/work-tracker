/**
 * Crea usuarios iniciales. Idempotente: si el usuario ya existe, no lo toca
 * (nunca sobreescribe contraseñas ni datos existentes).
 *
 * Uso (en el servidor, desde la raíz del proyecto):
 *   node scripts/seed-users.cjs <usuario> <contraseña> [<usuario> <contraseña> ...]
 */
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
  console.error("Uso: node scripts/seed-users.cjs <usuario> <contraseña> [...]");
  process.exit(1);
}

const dataDir = path.join(process.cwd(), "data");
require("fs").mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Mismo esquema que src/lib/db/index.ts (CREATE IF NOT EXISTS — aditivo)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weekly_limit_min INTEGER NOT NULL DEFAULT 960,
    annual_limit_min INTEGER NOT NULL DEFAULT 43200,
    night_start_min INTEGER NOT NULL DEFAULT 1320,
    night_end_min INTEGER NOT NULL DEFAULT 360
  );
`);

const insertUser = db.prepare(
  "INSERT INTO users (name, password_hash, created_at) VALUES (?, ?, ?)"
);
const insertSettings = db.prepare(
  "INSERT OR IGNORE INTO settings (user_id) VALUES (?)"
);
const findUser = db.prepare("SELECT id FROM users WHERE name = ?");

for (let i = 0; i < args.length; i += 2) {
  const name = args[i].trim();
  const password = args[i + 1];
  const existing = findUser.get(name);
  if (existing) {
    insertSettings.run(existing.id);
    console.log(`= ${name}: ya existe, sin cambios`);
    continue;
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = insertUser.run(name, hash, new Date().toISOString());
  insertSettings.run(info.lastInsertRowid);
  console.log(`+ ${name}: creado (id ${info.lastInsertRowid})`);
}

db.close();
