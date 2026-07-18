import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function createDb() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
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
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_min INTEGER NOT NULL,
      end_min INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS shifts_unique_segment
      ON shifts (user_id, date, start_min, end_min);
    CREATE TABLE IF NOT EXISTS payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS payrolls_unique_month
      ON payrolls (user_id, year, month);
  `);

  // Migraciones idempotentes para BDs preexistentes
  const settingsCols = sqlite
    .prepare("PRAGMA table_info(settings)")
    .all() as { name: string }[];
  if (!settingsCols.some((c) => c.name === "payroll_pdf_password")) {
    sqlite.exec("ALTER TABLE settings ADD COLUMN payroll_pdf_password TEXT");
  }

  return drizzle(sqlite, { schema });
}

// Reutiliza la conexión entre recargas de dev (HMR) para no agotar handles
const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createDb> };
export const db = globalForDb.__db ?? (globalForDb.__db = createDb());
