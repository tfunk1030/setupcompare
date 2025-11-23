import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/setupcomparer.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparisons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  baseline_name TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  share_id TEXT,
  car_model TEXT,
  track_name TEXT,
  track_category TEXT,
  status TEXT DEFAULT 'active',
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  delta TEXT,
  significance TEXT,
  insight TEXT,
  unit TEXT,
  interpretation_short TEXT,
  interpretation_full TEXT,
  FOREIGN KEY(comparison_id) REFERENCES comparisons(id)
);

CREATE TABLE IF NOT EXISTS telemetry (
  id TEXT PRIMARY KEY,
  comparison_id TEXT NOT NULL,
  source_name TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(comparison_id) REFERENCES comparisons(id)
);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  const hasColumn = info.some((c) => c.name === column);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('comparisons', 'car_model', 'TEXT');
ensureColumn('comparisons', 'track_name', 'TEXT');
ensureColumn('comparisons', 'track_category', 'TEXT');
ensureColumn('comparisons', 'status', "TEXT DEFAULT 'active'");
ensureColumn('parameters', 'interpretation_short', 'TEXT');
ensureColumn('parameters', 'interpretation_full', 'TEXT');
