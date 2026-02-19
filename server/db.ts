import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function getDataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), "data");
}

function getMigrationsDir(): string {
  return path.resolve(process.cwd(), "server", "migrations");
}

function listMigrations(): Array<{ version: number; file: string }> {
  const dir = getMigrationsDir();
  const files = fs.readdirSync(dir).filter((name) => /^\d+_.*\.sql$/.test(name));

  return files
    .map((file) => {
      const [prefix] = file.split("_");
      return { version: Number(prefix), file };
    })
    .filter((entry) => Number.isFinite(entry.version))
    .sort((a, b) => a.version - b.version);
}

function runMigrations(db: Database.Database): void {
  const currentVersion = Number(db.pragma("user_version", { simple: true }) ?? 0);
  const migrations = listMigrations().filter((item) => item.version > currentVersion);

  if (migrations.length === 0) {
    return;
  }

  const migrationsDir = getMigrationsDir();

  const applyMigrations = db.transaction(() => {
    for (const migration of migrations) {
      const sql = fs.readFileSync(path.join(migrationsDir, migration.file), "utf8");
      db.exec(sql);
      db.pragma(`user_version = ${migration.version}`);
    }
  });

  applyMigrations();
}

export function initDb(): Database.Database {
  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "data.db");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  return db;
}
