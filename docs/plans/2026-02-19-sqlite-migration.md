# SQLite Local Storage Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Notion API backend with a local SQLite database embedded via Tauri's Rust layer, eliminating all network dependencies.

**Architecture:** Rust backend (`rusqlite`) manages a single `data.db` file in the app data directory. The frontend communicates via Tauri `invoke()` calls to typed Rust commands. All existing services are rewritten from Notion property parsing to direct typed queries.

**Tech Stack:** Tauri 2, rusqlite 0.31 (bundled), uuid 1, React 18, TypeScript 5.6, Zustand 4

**Design Doc:** `../../开发文档/MixarLabOS_v3_SQLite_Migration_Design.md`

---

## Phase 1: Rust Backend

### Task 1: Git Init + Branch

**Files:**
- Create: `.gitignore`

**Step 1: Initialize git repository**

Run from `mixarlab-os/`:
```bash
git init
```

**Step 2: Create .gitignore**

Create `mixarlab-os/.gitignore`:
```gitignore
node_modules/
dist/
src-tauri/target/
*.db
.DS_Store
```

**Step 3: Initial commit**

```bash
git add -A
git commit -m "chore: initial commit — Notion-based v2 codebase"
```

**Step 4: Create feature branch**

```bash
git checkout -b feat/sqlite-migration
```

---

### Task 2: Cargo Dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml` (lines 9-13)

**Step 1: Update dependencies**

Replace the `[dependencies]` section (lines 9-13) in `src-tauri/Cargo.toml` with:

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1", features = ["v4"] }
```

This removes `reqwest` and adds `rusqlite` + `uuid`.

**Step 2: Verify compilation**

Run from `src-tauri/`:
```bash
cargo check
```
Expected: Compilation errors in `main.rs` because `reqwest` is gone and `http_proxy` references it. That's expected — we fix it in Task 4.

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: swap reqwest for rusqlite + uuid in Cargo deps"
```

---

### Task 3: SQL Migration File

**Files:**
- Create: `src-tauri/migrations/001_initial.sql`

**Step 1: Create migrations directory and SQL file**

Create `src-tauri/migrations/001_initial.sql`:

```sql
-- MixarLabOS v3 — Initial schema
-- 9 main tables + 2 auxiliary + 6 junction tables

-- === Main Tables ===

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT '',
  period_start  TEXT,
  period_end    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT '',
  start_date    TEXT,
  end_date      TEXT,
  progress      REAL DEFAULT 0,
  milestone     TEXT,
  owner         TEXT,
  project_id    TEXT REFERENCES projects(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meetings (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  meeting_date  TEXT,
  project_id    TEXT REFERENCES projects(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  contact       TEXT,
  phone         TEXT,
  email         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  contact       TEXT,
  phone         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  amount        REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT '',
  sign_date     TEXT,
  due_date      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_expenses (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  expense_date      TEXT,
  period_start      TEXT,
  period_end        TEXT,
  amount_original   REAL NOT NULL DEFAULT 0,
  amount_local      REAL NOT NULL DEFAULT 0,
  cost_category     TEXT,
  cost_detail       TEXT,
  cost_nature       TEXT,
  cost_ownership    TEXT,
  cost_bearer       TEXT,
  approval_status   TEXT,
  input_mode        TEXT,
  payment_method    TEXT,
  invoice_type      TEXT,
  note              TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  service_version     TEXT NOT NULL DEFAULT '',
  service_area        TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT '服役中',
  start_date          TEXT,
  description         TEXT,
  software_version    TEXT,
  download_url        TEXT,
  note                TEXT,
  price               REAL NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'CNY',
  billing_cycle       TEXT NOT NULL DEFAULT '月度付费',
  cost_sub_category   TEXT,
  last_payment_date   TEXT,
  next_billing_date   TEXT,
  monthly_equivalent  REAL NOT NULL DEFAULT 0,
  yearly_equivalent   REAL NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS digital_assets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT '',
  service_version   TEXT,
  service_area      TEXT,
  software_version  TEXT,
  start_date        TEXT,
  download_url      TEXT,
  description       TEXT,
  note              TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- === Auxiliary Tables ===

CREATE TABLE IF NOT EXISTS quote_line_items (
  id          TEXT PRIMARY KEY,
  quote_id    TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  description TEXT,
  quantity    REAL NOT NULL DEFAULT 1,
  rate        REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_targets (
  id          TEXT PRIMARY KEY,
  year        INTEGER NOT NULL,
  target      REAL NOT NULL DEFAULT 0,
  actual      REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- === Junction Tables (many-to-many) ===

CREATE TABLE IF NOT EXISTS client_projects (
  client_id   TEXT NOT NULL REFERENCES clients(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (client_id, project_id)
);

CREATE TABLE IF NOT EXISTS client_contracts (
  client_id   TEXT NOT NULL REFERENCES clients(id),
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  PRIMARY KEY (client_id, contract_id)
);

CREATE TABLE IF NOT EXISTS project_contracts (
  project_id  TEXT NOT NULL REFERENCES projects(id),
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  PRIMARY KEY (project_id, contract_id)
);

CREATE TABLE IF NOT EXISTS ledger_projects (
  ledger_id   TEXT NOT NULL REFERENCES ledger_expenses(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (ledger_id, project_id)
);

CREATE TABLE IF NOT EXISTS ledger_suppliers (
  ledger_id   TEXT NOT NULL REFERENCES ledger_expenses(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  PRIMARY KEY (ledger_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS supplier_projects (
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (supplier_id, project_id)
);

-- === Indexes ===

CREATE INDEX IF NOT EXISTS idx_tasks_project       ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project    ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date         ON ledger_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_ledger_category     ON ledger_expenses(cost_category);
CREATE INDEX IF NOT EXISTS idx_contracts_sign_date ON contracts(sign_date);
CREATE INDEX IF NOT EXISTS idx_subs_next_billing   ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subs_status         ON subscriptions(status);
```

**Step 2: Commit**

```bash
git add src-tauri/migrations/
git commit -m "feat: add SQLite initial migration (001_initial.sql)"
```

---

### Task 4: Rust db.rs Module

**Files:**
- Create: `src-tauri/src/db.rs`

**Step 1: Create db.rs**

Create `src-tauri/src/db.rs`:

```rust
use rusqlite::Connection;
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(app: &AppHandle) -> Result<DbState, String> {
    let db_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {e}"))?;
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("创建数据目录失败: {e}"))?;

    let db_path = db_dir.join("data.db");
    let conn =
        Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {e}"))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("设置 PRAGMA 失败: {e}"))?;

    run_migrations(&conn)?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

fn run_migrations(conn: &Connection) -> Result<(), String> {
    let version: i32 = conn
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .unwrap_or(0);

    if version < 1 {
        conn.execute_batch(include_str!("../migrations/001_initial.sql"))
            .map_err(|e| format!("迁移 001 失败: {e}"))?;
        conn.pragma_update(None, "user_version", 1)
            .map_err(|e| format!("更新版本号失败: {e}"))?;
    }

    Ok(())
}

/// Bridge serde_json::Value → rusqlite::types::Value.
/// rusqlite does not natively accept serde_json::Value as a parameter.
pub fn json_to_sql(v: &Value) -> rusqlite::types::Value {
    match v {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        other => rusqlite::types::Value::Text(other.to_string()),
    }
}
```

**Step 2: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat: add db.rs — SQLite init, migrations, json bridge"
```

---

### Task 5: Rust commands.rs Module

**Files:**
- Create: `src-tauri/src/commands.rs`

**Step 1: Create commands.rs**

Create `src-tauri/src/commands.rs`:

```rust
use crate::db::{json_to_sql, DbState};
use rusqlite::params_from_iter;
use serde_json::{Map, Value};
use tauri::State;

const ALLOWED_TABLES: &[&str] = &[
    "projects",
    "tasks",
    "meetings",
    "clients",
    "suppliers",
    "contracts",
    "ledger_expenses",
    "subscriptions",
    "digital_assets",
    "quote_line_items",
    "business_targets",
    "client_projects",
    "client_contracts",
    "project_contracts",
    "ledger_projects",
    "ledger_suppliers",
    "supplier_projects",
];

const ALLOWED_OPS: &[&str] = &["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"];

fn validate_table(table: &str) -> Result<(), String> {
    if ALLOWED_TABLES.contains(&table) {
        Ok(())
    } else {
        Err(format!("不允许操作的表: {table}"))
    }
}

/// Validate that a column name is a simple identifier (no SQL injection).
fn validate_column(col: &str) -> Result<(), String> {
    if col.chars().all(|c| c.is_alphanumeric() || c == '_') && !col.is_empty() {
        Ok(())
    } else {
        Err(format!("非法列名: {col}"))
    }
}

fn rows_to_json(
    conn: &rusqlite::Connection,
    sql: &str,
    params: &[rusqlite::types::Value],
) -> Result<Vec<Value>, String> {
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let column_names: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let rows = stmt
        .query_map(params_from_iter(params.iter()), |row| {
            let mut map = Map::new();
            for (i, name) in column_names.iter().enumerate() {
                let val: Value = match row.get_ref(i)? {
                    rusqlite::types::ValueRef::Null => Value::Null,
                    rusqlite::types::ValueRef::Integer(n) => Value::Number(n.into()),
                    rusqlite::types::ValueRef::Real(f) => serde_json::Number::from_f64(f)
                        .map(Value::Number)
                        .unwrap_or(Value::Null),
                    rusqlite::types::ValueRef::Text(s) => {
                        Value::String(String::from_utf8_lossy(s).into_owned())
                    }
                    rusqlite::types::ValueRef::Blob(b) => {
                        Value::String(format!("[blob {} bytes]", b.len()))
                    }
                };
                map.insert(name.clone(), val);
            }
            Ok(Value::Object(map))
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_query(
    state: State<'_, DbState>,
    table: String,
    filter: Option<Value>,
    sort: Option<Value>,
) -> Result<Vec<Value>, String> {
    validate_table(&table)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut sql = format!("SELECT * FROM {table}");
    let mut params: Vec<rusqlite::types::Value> = vec![];

    if let Some(f) = &filter {
        if let Some(clauses) = f.get("where").and_then(|w| w.as_array()) {
            let mut conditions = vec![];
            for clause in clauses {
                let col = clause
                    .get("column")
                    .and_then(|c| c.as_str())
                    .ok_or("filter.where[].column 必填")?;
                validate_column(col)?;
                let op = clause
                    .get("op")
                    .and_then(|o| o.as_str())
                    .ok_or("filter.where[].op 必填")?;
                if !ALLOWED_OPS.contains(&op) {
                    return Err(format!("不支持的操作符: {op}"));
                }
                conditions.push(format!("{col} {op} ?"));
                let val = clause.get("value").unwrap_or(&Value::Null);
                params.push(json_to_sql(val));
            }
            if !conditions.is_empty() {
                sql.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
            }
        }
    }

    if let Some(s) = &sort {
        let col = s
            .get("column")
            .and_then(|c| c.as_str())
            .unwrap_or("updated_at");
        validate_column(col)?;
        let dir = match s.get("direction").and_then(|d| d.as_str()) {
            Some("ASC") => "ASC",
            _ => "DESC",
        };
        sql.push_str(&format!(" ORDER BY {col} {dir}"));
    }

    if let Some(f) = &filter {
        if let Some(limit) = f.get("limit").and_then(|l| l.as_i64()) {
            sql.push_str(&format!(" LIMIT {limit}"));
        }
        if let Some(offset) = f.get("offset").and_then(|o| o.as_i64()) {
            sql.push_str(&format!(" OFFSET {offset}"));
        }
    }

    rows_to_json(&conn, &sql, &params)
}

#[tauri::command]
pub fn db_get_by_id(
    state: State<'_, DbState>,
    table: String,
    id: String,
) -> Result<Option<Value>, String> {
    validate_table(&table)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let sql = format!("SELECT * FROM {table} WHERE id = ?");
    let mut results = rows_to_json(&conn, &sql, &[rusqlite::types::Value::Text(id)])?;
    Ok(results.pop())
}

#[tauri::command]
pub fn db_insert(
    state: State<'_, DbState>,
    table: String,
    data: Value,
) -> Result<String, String> {
    validate_table(&table)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let obj = data.as_object().ok_or("data 必须是 JSON 对象")?;

    let id = uuid::Uuid::new_v4().to_string();

    let mut columns = vec!["id".to_string()];
    let mut placeholders = vec!["?".to_string()];
    let mut values: Vec<rusqlite::types::Value> = vec![rusqlite::types::Value::Text(id.clone())];

    for (key, val) in obj {
        validate_column(key)?;
        columns.push(key.clone());
        placeholders.push("?".to_string());
        values.push(json_to_sql(val));
    }

    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        table,
        columns.join(", "),
        placeholders.join(", ")
    );

    conn.execute(&sql, params_from_iter(values.iter()))
        .map_err(|e| format!("插入失败: {e}"))?;

    Ok(id)
}

#[tauri::command]
pub fn db_update(
    state: State<'_, DbState>,
    table: String,
    id: String,
    data: Value,
) -> Result<(), String> {
    validate_table(&table)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let obj = data.as_object().ok_or("data 必须是 JSON 对象")?;

    let mut sets = vec![];
    let mut values: Vec<rusqlite::types::Value> = vec![];

    for (key, val) in obj {
        validate_column(key)?;
        sets.push(format!("{key} = ?"));
        values.push(json_to_sql(val));
    }

    sets.push("updated_at = datetime('now')".to_string());
    values.push(rusqlite::types::Value::Text(id));

    let sql = format!("UPDATE {} SET {} WHERE id = ?", table, sets.join(", "));

    conn.execute(&sql, params_from_iter(values.iter()))
        .map_err(|e| format!("更新失败: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn db_delete(
    state: State<'_, DbState>,
    table: String,
    id: String,
) -> Result<(), String> {
    validate_table(&table)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        &format!("DELETE FROM {table} WHERE id = ?"),
        [&id],
    )
    .map_err(|e| format!("删除失败: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn db_link(
    state: State<'_, DbState>,
    junction: String,
    left_id: String,
    right_id: String,
) -> Result<(), String> {
    validate_table(&junction)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Junction tables have exactly 2 columns (the composite PK).
    // Discover them dynamically.
    let info_sql = format!("PRAGMA table_info({junction})");
    let mut stmt = conn.prepare(&info_sql).map_err(|e| e.to_string())?;
    let col_names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if col_names.len() != 2 {
        return Err(format!("{junction} 不是有效的关联表"));
    }

    let sql = format!(
        "INSERT OR IGNORE INTO {} ({}, {}) VALUES (?, ?)",
        junction, col_names[0], col_names[1]
    );
    conn.execute(
        &sql,
        [&left_id, &right_id],
    )
    .map_err(|e| format!("关联失败: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn db_unlink(
    state: State<'_, DbState>,
    junction: String,
    left_id: String,
    right_id: String,
) -> Result<(), String> {
    validate_table(&junction)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let info_sql = format!("PRAGMA table_info({junction})");
    let mut stmt = conn.prepare(&info_sql).map_err(|e| e.to_string())?;
    let col_names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if col_names.len() != 2 {
        return Err(format!("{junction} 不是有效的关联表"));
    }

    let sql = format!(
        "DELETE FROM {} WHERE {} = ? AND {} = ?",
        junction, col_names[0], col_names[1]
    );
    conn.execute(&sql, [&left_id, &right_id])
        .map_err(|e| format!("解除关联失败: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn db_get_linked(
    state: State<'_, DbState>,
    junction: String,
    column: String,
    id: String,
) -> Result<Vec<String>, String> {
    validate_table(&junction)?;
    validate_column(&column)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let info_sql = format!("PRAGMA table_info({junction})");
    let mut stmt = conn.prepare(&info_sql).map_err(|e| e.to_string())?;
    let col_names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let other_col = col_names
        .iter()
        .find(|c| c.as_str() != column)
        .ok_or(format!("关联表 {junction} 中未找到非 {column} 列"))?;

    let sql = format!("SELECT {other_col} FROM {junction} WHERE {column} = ?");
    let mut query_stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let ids: Vec<String> = query_stmt
        .query_map([&id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

#[tauri::command]
pub fn db_aggregate(
    state: State<'_, DbState>,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<Vec<Value>, String> {
    let trimmed = sql.trim_start().to_uppercase();
    if !trimmed.starts_with("SELECT") {
        return Err("aggregate 只允许 SELECT 查询".to_string());
    }

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let sql_params: Vec<rusqlite::types::Value> = params
        .unwrap_or_default()
        .iter()
        .map(json_to_sql)
        .collect();

    rows_to_json(&conn, &sql, &sql_params)
}

#[tauri::command]
pub fn db_export_json(
    state: State<'_, DbState>,
    path: String,
) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut export = Map::new();

    for &table in ALLOWED_TABLES {
        let sql = format!("SELECT * FROM {table}");
        let rows = rows_to_json(&conn, &sql, &[])?;
        export.insert(table.to_string(), Value::Array(rows));
    }

    let json = serde_json::to_string_pretty(&Value::Object(export))
        .map_err(|e| e.to_string())?;

    std::fs::write(&path, &json).map_err(|e| format!("写入文件失败: {e}"))?;

    Ok(path)
}

#[tauri::command]
pub fn db_import_json(
    state: State<'_, DbState>,
    path: String,
) -> Result<(), String> {
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {e}"))?;
    let data: Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let obj = data.as_object().ok_or("JSON 根必须是对象")?;

    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    for (table, rows) in obj {
        if !ALLOWED_TABLES.contains(&table.as_str()) {
            continue;
        }
        let arr = rows.as_array().ok_or(format!("{table} 必须是数组"))?;

        for row in arr {
            let row_obj = row.as_object().ok_or("每行必须是对象")?;
            let mut columns = vec![];
            let mut placeholders = vec![];
            let mut values: Vec<rusqlite::types::Value> = vec![];

            for (key, val) in row_obj {
                columns.push(key.clone());
                placeholders.push("?".to_string());
                values.push(json_to_sql(val));
            }

            if columns.is_empty() {
                continue;
            }

            let sql = format!(
                "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                table,
                columns.join(", "),
                placeholders.join(", ")
            );
            conn.execute(&sql, params_from_iter(values.iter()))
                .map_err(|e| format!("导入 {table} 失败: {e}"))?;
        }
    }

    Ok(())
}
```

**Step 2: Commit**

```bash
git add src-tauri/src/commands.rs
git commit -m "feat: add commands.rs — all db_* Tauri commands"
```

---

### Task 6: Rewrite main.rs

**Files:**
- Modify: `src-tauri/src/main.rs` (replace entire file, lines 1-57)

**Step 1: Replace main.rs**

Replace the entire content of `src-tauri/src/main.rs` with:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let state =
                db::init_db(&app.handle()).expect("数据库初始化失败");
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_query,
            commands::db_get_by_id,
            commands::db_insert,
            commands::db_update,
            commands::db_delete,
            commands::db_link,
            commands::db_unlink,
            commands::db_get_linked,
            commands::db_aggregate,
            commands::db_export_json,
            commands::db_import_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 2: Build the entire Rust backend**

Run from `src-tauri/`:
```bash
cargo build
```
Expected: Successful compilation with zero errors.

**Step 3: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: rewrite main.rs — SQLite init + db_* commands"
```

---

### Task 7: Verify Phase 1

**Step 1: Run cargo check from project root**

```bash
cd src-tauri && cargo check && cd ..
```
Expected: No errors, no warnings.

**Step 2: Commit checkpoint**

```bash
git add -A
git commit -m "checkpoint: Phase 1 complete — Rust SQLite backend compiles"
```

---

## Phase 2: Frontend Data Layer

### Task 8: SQLite Provider (TypeScript)

**Files:**
- Create: `src/lib/sqlite/dataProvider.ts`
- Create: `src/lib/sqlite/provider.ts`

**Step 1: Create dataProvider.ts**

Create `src/lib/sqlite/dataProvider.ts`:

```typescript
export interface SqliteDataProvider {
  query<T>(table: string, filter?: QueryFilter, sort?: SortOption): Promise<T[]>;
  getById<T>(table: string, id: string): Promise<T | null>;
  insert<T>(table: string, data: Omit<T, "id">): Promise<string>;
  update(table: string, id: string, data: Partial<Record<string, unknown>>): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  link(junction: string, leftId: string, rightId: string): Promise<void>;
  unlink(junction: string, leftId: string, rightId: string): Promise<void>;
  getLinked(junction: string, column: string, id: string): Promise<string[]>;
  aggregate(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}

export interface QueryFilter {
  where?: WhereClause[];
  limit?: number;
  offset?: number;
}

export interface WhereClause {
  column: string;
  op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
  value: unknown;
}

export interface SortOption {
  column: string;
  direction: "ASC" | "DESC";
}
```

**Step 2: Create provider.ts**

Create `src/lib/sqlite/provider.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { QueryFilter, SortOption, SqliteDataProvider } from "./dataProvider";

export const db: SqliteDataProvider = {
  query: <T>(table: string, filter?: QueryFilter, sort?: SortOption) =>
    invoke<T[]>("db_query", { table, filter, sort }),

  getById: <T>(table: string, id: string) =>
    invoke<T | null>("db_get_by_id", { table, id }),

  insert: <T>(table: string, data: Omit<T, "id">) =>
    invoke<string>("db_insert", { table, data }),

  update: (table: string, id: string, data: Partial<Record<string, unknown>>) =>
    invoke<void>("db_update", { table, id, data }),

  remove: (table: string, id: string) =>
    invoke<void>("db_delete", { table, id }),

  link: (junction: string, leftId: string, rightId: string) =>
    invoke<void>("db_link", { junction, leftId, rightId }),

  unlink: (junction: string, leftId: string, rightId: string) =>
    invoke<void>("db_unlink", { junction, leftId, rightId }),

  getLinked: (junction: string, column: string, id: string) =>
    invoke<string[]>("db_get_linked", { junction, column, id }),

  aggregate: (sql: string, params?: unknown[]) =>
    invoke<Record<string, unknown>[]>("db_aggregate", { sql, params }),
};
```

**Step 3: Commit**

```bash
git add src/lib/sqlite/
git commit -m "feat: add SQLite data provider interface + invoke bridge"
```

---

### Task 9: Rewrite timelineService.ts

**Files:**
- Modify: `src/services/timelineService.ts` (replace entire file, 101 lines)

**Step 1: Rewrite timelineService.ts**

Replace the entire content of `src/services/timelineService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type { TimelineDocument, TimelineRow } from "../lib/types/timeline";

export async function fetchTimelineByProject(projectId: string): Promise<TimelineDocument> {
  const [project] = await db.query<{ id: string; name: string }>("projects", {
    where: [{ column: "id", op: "=", value: projectId }],
  });
  if (!project) throw new Error("未找到项目");

  const rows = await db.query<TimelineRow>("tasks", {
    where: [{ column: "project_id", op: "=", value: projectId }],
  }, { column: "start_date", direction: "ASC" });

  return {
    projectId,
    projectName: project.name,
    rows,
    warnings: [],
  };
}

export function timelineToCsv(doc: TimelineDocument): string {
  const header = ["任务", "状态", "负责人", "开始", "结束", "里程碑"];
  const body = doc.rows.map((row) => [
    row.taskName,
    row.status,
    row.owner ?? "",
    row.startDate ?? "",
    row.endDate ?? "",
    row.milestone ?? "",
  ]);

  return [header, ...body]
    .map((line) =>
      line.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")
    )
    .join("\n");
}
```

**Step 2: Update timeline types**

Check `src/lib/types/timeline.ts` — the `TimelineRow` fields must match SQLite column names. The SQLite `tasks` table uses `name` not `taskName`, `start_date` not `startDate`, `end_date` not `endDate`. The TypeScript types need their fields to match the snake_case SQL columns, OR the service must map them. Since we want to keep camelCase in TS, we need a lightweight mapper.

Update the query to use a SQL alias approach instead. Replace the `fetchTimelineByProject` function's rows query with:

```typescript
  const rows = await db.aggregate(`
    SELECT id, name as "taskName", status, owner,
           start_date as "startDate", end_date as "endDate", milestone
    FROM tasks WHERE project_id = ?
    ORDER BY start_date ASC
  `, [projectId]) as unknown as TimelineRow[];
```

**Step 3: Commit**

```bash
git add src/services/timelineService.ts
git commit -m "feat: rewrite timelineService to use SQLite"
```

---

### Task 10: Rewrite assetService.ts

**Files:**
- Modify: `src/services/assetService.ts` (replace entire file, 63 lines)

**Step 1: Rewrite assetService.ts**

Replace the entire content of `src/services/assetService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type { DigitalAssetDetail, DigitalAssetRow } from "../lib/types/asset";

export async function fetchAssets(): Promise<DigitalAssetRow[]> {
  const rows = await db.aggregate(`
    SELECT id, name, status,
           service_version as "serviceVersion",
           service_area as "serviceArea",
           software_version as "softwareVersion",
           start_date as "startDate",
           download_url as "downloadUrl",
           description, note
    FROM digital_assets ORDER BY name ASC
  `) as unknown as (DigitalAssetRow & { ledgerRelationIds?: string[] })[];

  // Load ledger relation IDs for each asset
  for (const row of rows) {
    row.ledgerRelationIds = await db.getLinked("asset_ledger_links", "asset_id", row.id);
  }

  return rows as DigitalAssetRow[];
}

export async function fetchAssetDetail(assetId: string): Promise<DigitalAssetDetail> {
  const assets = await fetchAssets();
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) throw new Error("未找到数字资产");

  const ledgerIds = asset.ledgerRelationIds;
  let relatedLedger: DigitalAssetDetail["relatedLedger"] = [];

  if (ledgerIds.length > 0) {
    const placeholders = ledgerIds.map(() => "?").join(", ");
    relatedLedger = await db.aggregate(
      `SELECT id, title, amount_local as "amount",
              expense_date as "expenseDate",
              cost_category as "costCategory"
       FROM ledger_expenses
       WHERE id IN (${placeholders})
       ORDER BY expense_date DESC`,
      ledgerIds
    ) as unknown as DigitalAssetDetail["relatedLedger"];
  }

  return { asset, relatedLedger };
}

export function filterAssets(
  items: DigitalAssetRow[],
  keyword: string,
  status: string,
  area: string,
): DigitalAssetRow[] {
  const key = keyword.trim().toLowerCase();
  return items
    .filter((item) => (status === "全部" ? true : item.status === status))
    .filter((item) => (area === "全部" ? true : item.serviceArea === area))
    .filter((item) => {
      if (!key) return true;
      return (
        item.name.toLowerCase().includes(key) ||
        (item.description ?? "").toLowerCase().includes(key)
      );
    });
}
```

**Note:** This requires adding a new junction table `asset_ledger_links` to the migration. It was identified in the design self-check. Add to `001_initial.sql`:

```sql
CREATE TABLE IF NOT EXISTS asset_ledger_links (
  asset_id    TEXT NOT NULL REFERENCES digital_assets(id),
  ledger_id   TEXT NOT NULL REFERENCES ledger_expenses(id),
  PRIMARY KEY (asset_id, ledger_id)
);
```

Also add `"asset_ledger_links"` to `ALLOWED_TABLES` in `commands.rs`.

**Step 2: Commit**

```bash
git add src/services/assetService.ts src-tauri/migrations/001_initial.sql src-tauri/src/commands.rs
git commit -m "feat: rewrite assetService to use SQLite + add asset_ledger_links"
```

---

### Task 11: Rewrite businessService.ts

**Files:**
- Modify: `src/services/businessService.ts` (replace entire file, 178 lines)

**Step 1: Rewrite businessService.ts**

Replace the entire content of `src/services/businessService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type { ClientDetail, ClientRow, ContractRow, SupplierDetail, SupplierRow } from "../lib/types/business";

export async function fetchClients(): Promise<ClientRow[]> {
  const rows = await db.aggregate(`
    SELECT id, name, contact, phone, email FROM clients ORDER BY name ASC
  `) as unknown as Omit<ClientRow, "projectIds" | "contractIds">[];

  const result: ClientRow[] = [];
  for (const row of rows) {
    const projectIds = await db.getLinked("client_projects", "client_id", row.id);
    const contractIds = await db.getLinked("client_contracts", "client_id", row.id);
    result.push({ ...row, projectIds, contractIds });
  }
  return result;
}

export async function fetchSuppliers(): Promise<SupplierRow[]> {
  const rows = await db.aggregate(`
    SELECT id, name, category, contact, phone FROM suppliers ORDER BY name ASC
  `) as unknown as Omit<SupplierRow, "projectIds">[];

  const result: SupplierRow[] = [];
  for (const row of rows) {
    const projectIds = await db.getLinked("supplier_projects", "supplier_id", row.id);
    result.push({ ...row, projectIds });
  }
  return result;
}

export async function fetchContracts(): Promise<ContractRow[]> {
  const rows = await db.aggregate(`
    SELECT id, name, amount, status,
           sign_date as "signDate",
           due_date as "dueDate"
    FROM contracts ORDER BY sign_date DESC
  `) as unknown as Omit<ContractRow, "projectIds" | "clientIds">[];

  const result: ContractRow[] = [];
  for (const row of rows) {
    const projectIds = await db.getLinked("project_contracts", "contract_id", row.id);
    const clientIds = await db.getLinked("client_contracts", "contract_id", row.id);
    result.push({ ...row, projectIds, clientIds });
  }
  return result;
}

export async function fetchClientDetail(clientId: string): Promise<ClientDetail> {
  const clients = await fetchClients();
  const client = clients.find((row) => row.id === clientId);
  if (!client) throw new Error("未找到客户");

  const contractIds = await db.getLinked("client_contracts", "client_id", clientId);
  let relatedContracts: ClientDetail["relatedContracts"] = [];
  if (contractIds.length > 0) {
    const ph = contractIds.map(() => "?").join(", ");
    relatedContracts = await db.aggregate(
      `SELECT id, name, amount FROM contracts WHERE id IN (${ph})`,
      contractIds,
    ) as unknown as ClientDetail["relatedContracts"];
  }

  const projectIds = await db.getLinked("client_projects", "client_id", clientId);
  let relatedProjects: ClientDetail["relatedProjects"] = [];
  if (projectIds.length > 0) {
    const ph = projectIds.map(() => "?").join(", ");
    relatedProjects = await db.aggregate(
      `SELECT id, name, status FROM projects WHERE id IN (${ph})`,
      projectIds,
    ) as unknown as ClientDetail["relatedProjects"];
  }

  return { client, relatedContracts, relatedProjects };
}

export async function fetchSupplierDetail(supplierId: string): Promise<SupplierDetail> {
  const suppliers = await fetchSuppliers();
  const supplier = suppliers.find((row) => row.id === supplierId);
  if (!supplier) throw new Error("未找到供应商");

  const projectIds = await db.getLinked("supplier_projects", "supplier_id", supplierId);
  let relatedProjects: SupplierDetail["relatedProjects"] = [];
  if (projectIds.length > 0) {
    const ph = projectIds.map(() => "?").join(", ");
    relatedProjects = await db.aggregate(
      `SELECT id, name, status FROM projects WHERE id IN (${ph})`,
      projectIds,
    ) as unknown as SupplierDetail["relatedProjects"];
  }

  const ledgerIds = await db.getLinked("ledger_suppliers", "supplier_id", supplierId);
  let relatedExpenses: SupplierDetail["relatedExpenses"] = [];
  if (ledgerIds.length > 0) {
    const ph = ledgerIds.map(() => "?").join(", ");
    relatedExpenses = await db.aggregate(
      `SELECT id, title, amount_local as "amount",
              expense_date as "date"
       FROM ledger_expenses WHERE id IN (${ph}) ORDER BY expense_date DESC`,
      ledgerIds,
    ) as unknown as SupplierDetail["relatedExpenses"];
  }

  return { supplier, relatedProjects, relatedExpenses };
}
```

**Step 2: Commit**

```bash
git add src/services/businessService.ts
git commit -m "feat: rewrite businessService to use SQLite"
```

---

### Task 12: Rewrite projectService.ts

**Files:**
- Modify: `src/services/projectService.ts` (replace entire file, 195 lines)
- Modify: `src/lib/types/project.ts` (rename `totalAmount` to `amount` in `ContractRow`)

**Step 1: Fix ContractRow type**

In `src/lib/types/project.ts`, rename `totalAmount` to `amount` in the `ContractRow` interface to match the SQLite `contracts.amount` column.

**Step 2: Rewrite projectService.ts**

Replace the entire content of `src/services/projectService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type {
  ContractRow,
  ProjectExpenseRow,
  ProjectFullView,
  ProjectMeetingRow,
  ProjectRow,
  ProjectSupplierRow,
  ProjectTaskRow,
} from "../lib/types/project";

export async function fetchProjects(): Promise<ProjectRow[]> {
  const rows = await db.aggregate(`
    SELECT id, name, status,
           period_start as "periodStart",
           period_end as "periodEnd"
    FROM projects ORDER BY period_start DESC
  `) as unknown as Omit<ProjectRow, "clientIds" | "contractIds">[];

  const result: ProjectRow[] = [];
  for (const row of rows) {
    const clientIds = await db.getLinked("client_projects", "project_id", row.id);
    const contractIds = await db.getLinked("project_contracts", "project_id", row.id);
    result.push({ ...row, clientIds, contractIds });
  }
  return result;
}

export async function fetchProjectFullView(
  projectId: string,
  knownProject?: ProjectRow,
): Promise<ProjectFullView> {
  const warnings: string[] = [];
  const project = knownProject ?? (await fetchProjects()).find((item) => item.id === projectId);
  if (!project) throw new Error("未找到项目");

  const contractIds = await db.getLinked("project_contracts", "project_id", projectId);
  let contracts: ContractRow[] = [];
  if (contractIds.length > 0) {
    const ph = contractIds.map(() => "?").join(", ");
    const raw = await db.aggregate(
      `SELECT c.id, c.name, c.amount FROM contracts c WHERE c.id IN (${ph})`,
      contractIds,
    ) as unknown as Omit<ContractRow, "projectIds" | "clientIds">[];
    contracts = raw.map((r) => ({ ...r, projectIds: [projectId], clientIds: [] }));
  }

  const expenses = await db.aggregate(`
    SELECT le.id, le.title, le.amount_local as "amount",
           le.expense_date as "expenseDate",
           le.cost_category as "category"
    FROM ledger_expenses le
    JOIN ledger_projects lp ON lp.ledger_id = le.id
    WHERE lp.project_id = ?
    ORDER BY le.expense_date DESC
  `, [projectId]) as unknown as ProjectExpenseRow[];

  const tasks = await db.aggregate(`
    SELECT id, name, status as "progress",
           start_date as "startDate", end_date as "endDate"
    FROM tasks WHERE project_id = ?
    ORDER BY start_date ASC
  `, [projectId]) as unknown as ProjectTaskRow[];

  const meetings = await db.aggregate(`
    SELECT id, title, meeting_date as "meetingDate"
    FROM meetings WHERE project_id = ?
    ORDER BY meeting_date DESC
  `, [projectId]) as unknown as ProjectMeetingRow[];

  const supplierIds = await db.getLinked("supplier_projects", "project_id", projectId);
  let suppliers: ProjectSupplierRow[] = [];
  if (supplierIds.length > 0) {
    const ph = supplierIds.map(() => "?").join(", ");
    suppliers = await db.aggregate(
      `SELECT id, name, category FROM suppliers WHERE id IN (${ph})`,
      supplierIds,
    ) as unknown as ProjectSupplierRow[];
  }

  return { project, contracts, expenses, tasks, meetings, suppliers, warnings };
}
```

**Step 3: Commit**

```bash
git add src/services/projectService.ts src/lib/types/project.ts
git commit -m "feat: rewrite projectService to use SQLite, unify ContractRow.amount"
```

---

### Task 13: Rewrite ledgerService.ts

**Files:**
- Modify: `src/services/ledgerService.ts` (replace entire file, 174 lines)

**Step 1: Rewrite ledgerService.ts**

Replace the entire content of `src/services/ledgerService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type { LedgerExpense, NewLedgerExpenseInput } from "../lib/types/ledger";

export async function fetchLedgerExpenses(): Promise<LedgerExpense[]> {
  const rows = await db.aggregate(`
    SELECT id, title,
           expense_date as "expenseDate",
           period_start as "periodStart",
           period_end as "periodEnd",
           amount_original as "amountOriginal",
           amount_local as "amountLocal",
           cost_category as "costCategory",
           cost_detail as "costDetail",
           cost_nature as "costNature",
           cost_ownership as "costOwnership",
           cost_bearer as "costBearer",
           approval_status as "approvalStatus",
           input_mode as "inputMode",
           payment_method as "paymentMethod",
           invoice_type as "invoiceType",
           note
    FROM ledger_expenses ORDER BY expense_date DESC
  `) as unknown as Omit<LedgerExpense, "projectIds" | "supplierIds">[];

  const result: LedgerExpense[] = [];
  for (const row of rows) {
    const projectIds = await db.getLinked("ledger_projects", "ledger_id", row.id);
    const supplierIds = await db.getLinked("ledger_suppliers", "ledger_id", row.id);
    result.push({ ...row, projectIds, supplierIds });
  }
  return result;
}

export async function createLedgerExpense(input: NewLedgerExpenseInput): Promise<void> {
  const ledgerId = await db.insert("ledger_expenses", {
    title: input.title,
    expense_date: input.expenseDate,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    amount_original: input.amount,
    amount_local: input.amount,
    cost_category: input.costCategory,
    cost_detail: input.costDetail,
    cost_nature: input.costNature,
    cost_ownership: input.costOwnership,
    cost_bearer: input.costBearer,
    approval_status: input.approvalStatus,
    input_mode: input.inputMode,
    payment_method: input.paymentMethod,
    invoice_type: input.invoiceType,
    note: input.note,
  });

  if (input.selectedProjectId) {
    await db.link("ledger_projects", ledgerId, input.selectedProjectId);
  }
  if (input.selectedSupplierId) {
    await db.link("ledger_suppliers", ledgerId, input.selectedSupplierId);
  }
}
```

**Step 2: Commit**

```bash
git add src/services/ledgerService.ts
git commit -m "feat: rewrite ledgerService to use SQLite"
```

---

### Task 14: Rewrite quoteService.ts

**Files:**
- Modify: `src/services/quoteService.ts` (replace entire file, 162 lines)

**Step 1: Rewrite quoteService.ts**

Replace the entire content of `src/services/quoteService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type { QuoteDraft, QuoteOption } from "../lib/types/quote";
import { quoteSubtotal, quoteTax, quoteTotal } from "../lib/types/quote";

export async function loadQuoteOptions(): Promise<{ clients: QuoteOption[]; projects: QuoteOption[] }> {
  const [clients, projects] = await Promise.all([
    db.aggregate(`SELECT id, name FROM clients ORDER BY name ASC`),
    db.aggregate(`SELECT id, name FROM projects ORDER BY name ASC`),
  ]);

  return {
    clients: clients as unknown as QuoteOption[],
    projects: projects as unknown as QuoteOption[],
  };
}

export async function suggestQuoteNumber(prefix = "MX"): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.aggregate(
    `SELECT name FROM contracts WHERE name LIKE ?`,
    [`%${prefix}-${year}-%`],
  );

  const pattern = new RegExp(`${prefix}-${year}-(\\d{4,})$`);
  let max = 0;
  for (const row of rows) {
    const match = String(row.name ?? "").match(pattern);
    if (match?.[1]) {
      const n = Number(match[1]);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }

  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

export async function suggestQuoteVersion(projectId?: string): Promise<string> {
  if (!projectId) return "V1";

  const rows = await db.aggregate(
    `SELECT c.id FROM contracts c
     JOIN project_contracts pc ON pc.contract_id = c.id
     WHERE pc.project_id = ?`,
    [projectId],
  );

  return `V${rows.length + 1}`;
}

export async function createQuoteRecord(draft: QuoteDraft): Promise<void> {
  const subtotal = quoteSubtotal(draft);
  const tax = quoteTax(draft);
  const total = quoteTotal(draft);

  const contractId = await db.insert("contracts", {
    name: draft.title || `报价 ${draft.quoteNumber}`,
    amount: total,
    status: "报价中",
    sign_date: draft.issueDate,
    due_date: draft.dueDate,
  });

  // Save line items
  for (const item of draft.lineItems) {
    await db.insert("quote_line_items", {
      quote_id: contractId,
      item_name: item.itemName,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
    });
  }

  // Link to client and project
  if (draft.selectedClientId) {
    await db.link("client_contracts", draft.selectedClientId, contractId);
  }
  if (draft.selectedProjectId) {
    await db.link("project_contracts", draft.selectedProjectId, contractId);
  }
}
```

**Step 2: Commit**

```bash
git add src/services/quoteService.ts
git commit -m "feat: rewrite quoteService to use SQLite"
```

---

### Task 15: Rewrite dashboardService.ts

**Files:**
- Modify: `src/services/dashboardService.ts` (replace entire file, 237 lines)

**Step 1: Rewrite dashboardService.ts**

Replace the entire content of `src/services/dashboardService.ts` with:

```typescript
import { db } from "../lib/sqlite/provider";
import type {
  DashboardCategoryPoint,
  DashboardMilestone,
  DashboardProjectBrief,
  DashboardSnapshot,
  DashboardTrendPoint,
} from "../lib/types/dashboard";

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [kpi, trend, categories, milestones, projects] = await Promise.all([
    fetchKpi(),
    fetchMonthlyTrend(),
    fetchCategoryDistribution(),
    fetchMilestones(),
    fetchProjectBriefs(),
  ]);

  const dueIn7Days = milestones.filter((item) => {
    if (!item.date) return false;
    const diff = dayDiff(new Date(), new Date(item.date));
    return diff >= 0 && diff <= 7;
  }).length;

  return {
    kpi: { ...kpi, dueIn7Days },
    trend,
    categories,
    milestones: milestones.slice(0, 6),
    projects: projects.slice(0, 6),
    warnings: [],
  };
}

async function fetchKpi() {
  const rows = await db.aggregate(`
    SELECT
      COALESCE((SELECT SUM(amount) FROM contracts
        WHERE strftime('%Y-%m', sign_date) = strftime('%Y-%m', 'now')), 0) as "incomeMonth",
      COALESCE((SELECT SUM(amount_local) FROM ledger_expenses
        WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')), 0) as "expenseMonth",
      (SELECT COUNT(*) FROM projects
        WHERE LOWER(status) NOT LIKE '%完成%'
          AND LOWER(status) NOT LIKE '%取消%'
          AND LOWER(status) NOT LIKE '%done%'
          AND LOWER(status) NOT LIKE '%closed%') as "activeProjects",
      (SELECT COUNT(*) FROM subscriptions WHERE status = '服役中') as "activeSubscriptions"
  `);

  const row = rows[0] ?? {};
  const incomeMonth = Number(row.incomeMonth ?? 0);
  const expenseMonth = Number(row.expenseMonth ?? 0);

  return {
    incomeMonth,
    expenseMonth,
    profitMonth: incomeMonth - expenseMonth,
    activeProjects: Number(row.activeProjects ?? 0),
    activeSubscriptions: Number(row.activeSubscriptions ?? 0),
    dueIn7Days: 0,
  };
}

async function fetchMonthlyTrend(): Promise<DashboardTrendPoint[]> {
  const income = await db.aggregate(`
    SELECT strftime('%Y-%m', sign_date) as month, SUM(amount) as total
    FROM contracts
    WHERE sign_date >= date('now', '-5 months', 'start of month')
    GROUP BY month ORDER BY month
  `);

  const expense = await db.aggregate(`
    SELECT strftime('%Y-%m', expense_date) as month, SUM(amount_local) as total
    FROM ledger_expenses
    WHERE expense_date >= date('now', '-5 months', 'start of month')
    GROUP BY month ORDER BY month
  `);

  const incomeMap = new Map(income.map((r) => [String(r.month), Number(r.total ?? 0)]));
  const expenseMap = new Map(expense.map((r) => [String(r.month), Number(r.total ?? 0)]));

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return months.map((key) => {
    const inc = incomeMap.get(key) ?? 0;
    const exp = expenseMap.get(key) ?? 0;
    return { key, label: key.slice(5), income: inc, expense: exp, profit: inc - exp };
  });
}

async function fetchCategoryDistribution(): Promise<DashboardCategoryPoint[]> {
  const rows = await db.aggregate(`
    SELECT COALESCE(cost_category, '未分类') as category, SUM(amount_local) as amount
    FROM ledger_expenses
    WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')
    GROUP BY category ORDER BY amount DESC LIMIT 6
  `);

  return rows.map((r) => ({
    category: String(r.category),
    amount: Number(r.amount ?? 0),
  }));
}

async function fetchMilestones(): Promise<DashboardMilestone[]> {
  const tasks = await db.aggregate(`
    SELECT t.id, t.name as title, COALESCE(t.end_date, t.start_date) as date,
           p.name as "projectName"
    FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.end_date IS NOT NULL OR t.start_date IS NOT NULL
    ORDER BY date ASC
  `);

  const meetings = await db.aggregate(`
    SELECT m.id, m.title, m.meeting_date as date,
           p.name as "projectName"
    FROM meetings m LEFT JOIN projects p ON m.project_id = p.id
    WHERE m.meeting_date IS NOT NULL
    ORDER BY date ASC
  `);

  const items: DashboardMilestone[] = [
    ...tasks.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      date: r.date as string | undefined,
      type: "任务" as const,
      projectName: r.projectName as string | undefined,
    })),
    ...meetings.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      date: r.date as string | undefined,
      type: "会议" as const,
      projectName: r.projectName as string | undefined,
    })),
  ];

  return items.sort((a, b) => (a.date ?? "9999") > (b.date ?? "9999") ? 1 : -1);
}

async function fetchProjectBriefs(): Promise<DashboardProjectBrief[]> {
  const rows = await db.aggregate(`
    SELECT id, name, status, period_end as "periodEnd"
    FROM projects ORDER BY updated_at DESC LIMIT 6
  `);

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    status: String(r.status ?? ""),
    periodEnd: r.periodEnd as string | undefined,
  }));
}

function dayDiff(a: Date, b: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const t1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((t2 - t1) / oneDay);
}
```

**Step 2: Commit**

```bash
git add src/services/dashboardService.ts
git commit -m "feat: rewrite dashboardService with SQL aggregation"
```

---

### Task 16: Create subscriptionService.ts + Rewrite Store

**Files:**
- Create: `src/services/subscriptionService.ts`
- Modify: `src/stores/useSubscriptionStore.ts` (replace entire file, 123 lines)
- Modify: `src/lib/types/subscription.ts` (remove Notion fields, lines 13-14)

**Step 1: Remove Notion fields from subscription type**

In `src/lib/types/subscription.ts`, remove lines 13-14:
```
  notionAssetPageId: string;
  notionLedgerPageId?: string;
```

**Step 2: Create subscriptionService.ts**

Create `src/services/subscriptionService.ts`:

```typescript
import { db } from "../lib/sqlite/provider";
import type { NewSubscriptionInput, SubscriptionRecord, SubscriptionStatus } from "../lib/types/subscription";
import { calculateNextBillingDate } from "./billingDateCalculator";

export async function fetchSubscriptions(): Promise<SubscriptionRecord[]> {
  return db.aggregate(`
    SELECT id, name,
           service_version as "serviceVersion",
           service_area as "serviceArea",
           status,
           start_date as "startDate",
           description,
           software_version as "softwareVersion",
           download_url as "downloadUrl",
           note, price, currency,
           billing_cycle as "billingCycle",
           cost_sub_category as "costSubCategory",
           last_payment_date as "lastPaymentDate",
           next_billing_date as "nextBillingDate",
           monthly_equivalent as "monthlyEquivalent",
           yearly_equivalent as "yearlyEquivalent"
    FROM subscriptions ORDER BY next_billing_date ASC
  `) as unknown as SubscriptionRecord[];
}

export async function updateSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
): Promise<void> {
  await db.update("subscriptions", id, { status });
}

export async function createSubscription(input: NewSubscriptionInput): Promise<void> {
  const nextBilling = calculateNextBillingDate(input.billingCycle, input.paymentDate);

  await db.insert("subscriptions", {
    name: input.toolName,
    service_version: input.serviceVersion,
    service_area: input.serviceArea,
    status: "服役中",
    start_date: input.paymentDate,
    description: input.description ?? null,
    software_version: input.softwareVersion ?? null,
    download_url: input.downloadUrl ?? null,
    note: input.note ?? null,
    price: input.amount,
    currency: input.currency,
    billing_cycle: input.billingCycle,
    cost_sub_category: input.subCategory,
    last_payment_date: input.paymentDate,
    next_billing_date: nextBilling,
    monthly_equivalent: computeMonthly(input.billingCycle, input.amount),
    yearly_equivalent: computeYearly(input.billingCycle, input.amount),
  });

  // Also create a ledger expense entry
  await db.insert("ledger_expenses", {
    title: `${input.toolName} 订阅`,
    expense_date: input.paymentDate,
    amount_original: input.amount,
    amount_local: input.amount,
    cost_category: "订阅服务",
    cost_detail: input.subCategory,
  });
}

function computeMonthly(cycle: string, price: number): number {
  switch (cycle) {
    case "月度付费": return price;
    case "季度付费": return price / 3;
    case "半年付费": return price / 6;
    case "年度付费": return price / 12;
    default: return 0;
  }
}

function computeYearly(cycle: string, price: number): number {
  switch (cycle) {
    case "月度付费": return price * 12;
    case "季度付费": return price * 4;
    case "半年付费": return price * 2;
    case "年度付费": return price;
    default: return 0;
  }
}
```

**Step 3: Rewrite useSubscriptionStore.ts**

Replace the entire content of `src/stores/useSubscriptionStore.ts` with:

```typescript
import { create } from "zustand";
import type { NewSubscriptionInput, SubscriptionRecord, SubscriptionStatus } from "../lib/types/subscription";
import { fetchSubscriptions, updateSubscriptionStatus, createSubscription } from "../services/subscriptionService";

type FilterState = {
  keyword: string;
  status: "全部" | "服役中" | "暂停使用" | "Done";
  area: string;
  cycle: string;
};

type State = {
  items: SubscriptionRecord[];
  selectedId?: string;
  filters: FilterState;
  isSyncing: boolean;
  isSaving: boolean;
  error?: string;
  success?: string;
  sync: () => Promise<void>;
  select: (id?: string) => void;
  setFilters: (next: Partial<FilterState>) => void;
  updateStatus: (id: string, status: SubscriptionStatus) => Promise<void>;
  createSubscription: (input: NewSubscriptionInput) => Promise<void>;
};

export const useSubscriptionStore = create<State>((set, get) => ({
  items: [],
  selectedId: undefined,
  filters: { keyword: "", status: "全部", area: "全部", cycle: "全部" },
  isSyncing: false,
  isSaving: false,
  error: undefined,
  success: undefined,

  async sync() {
    set({ isSyncing: true, error: undefined, success: undefined });
    try {
      const items = await fetchSubscriptions();
      set({
        items,
        selectedId: get().selectedId ?? items[0]?.id,
        isSyncing: false,
      });
    } catch (error) {
      set({
        isSyncing: false,
        error: error instanceof Error ? error.message : "数据加载失败",
      });
    }
  },

  select(id) {
    set({ selectedId: id });
  },

  setFilters(next) {
    set({ filters: { ...get().filters, ...next } });
  },

  async updateStatus(id, status) {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await updateSubscriptionStatus(id, status);
      set({ isSaving: false, success: "状态已更新" });
      await get().sync();
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "状态更新失败",
      });
    }
  },

  async createSubscription(input) {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await createSubscription(input);
      set({ isSaving: false, success: "订阅已创建" });
      await get().sync();
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "新增失败",
      });
    }
  },
}));

export function useFilteredSubscriptions(): SubscriptionRecord[] {
  const { items, filters } = useSubscriptionStore();
  const keyword = filters.keyword.trim().toLowerCase();

  return items
    .filter((item) => (filters.status === "全部" ? true : item.status === filters.status))
    .filter((item) => (filters.area === "全部" ? true : item.serviceArea === filters.area))
    .filter((item) => (filters.cycle === "全部" ? true : item.billingCycle === filters.cycle))
    .filter((item) => {
      if (!keyword) return true;
      return item.name.toLowerCase().includes(keyword) || (item.description ?? "").toLowerCase().includes(keyword);
    })
    .sort((a, b) => (a.nextBillingDate ?? "9999") > (b.nextBillingDate ?? "9999") ? 1 : -1);
}
```

**Step 4: Commit**

```bash
git add src/services/subscriptionService.ts src/stores/useSubscriptionStore.ts src/lib/types/subscription.ts
git commit -m "feat: create subscriptionService + rewrite store — no more Notion"
```

---

### Task 17: Rewrite Remaining Stores

**Files:**
- Modify: `src/stores/useQuoteStore.ts` (lines 20, 89-103)
- Modify: `src/stores/useProjectStore.ts` (no changes needed — imports from projectService only)

**Step 1: Rename saveToNotion in useQuoteStore.ts**

In `src/stores/useQuoteStore.ts`:
- Line 20: rename `saveToNotion` → `save` in the State type
- Lines 89-103: rename the method and update the success message

Replace lines 20-21:
```typescript
  saveToNotion: () => Promise<void>;
```
with:
```typescript
  save: () => Promise<void>;
```

Replace lines 89-103:
```typescript
  async saveToNotion() {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await createQuoteRecord(get().draft);
      set({
        isSaving: false,
        success: "报价已回写 Notion"
      });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "报价回写失败"
      });
    }
  }
```
with:
```typescript
  async save() {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await createQuoteRecord(get().draft);
      set({ isSaving: false, success: "报价已保存" });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "报价保存失败",
      });
    }
  }
```

**Step 2: Commit**

```bash
git add src/stores/useQuoteStore.ts
git commit -m "feat: rename saveToNotion → save in quote store"
```

---

### Task 18: Update Page Components

**Files:**
- Modify: `src/pages/QuoteCenterPage.tsx` (lines 52, 57-58)
- Modify: `src/pages/LedgerPage.tsx` (line 257)
- Modify: `src/pages/SubscriptionPage.tsx` (lines 434-436, 537)

**Step 1: Update QuoteCenterPage.tsx**

- Line 52: change `Notion 回写` → `保存` in text content
- Line 57: change `store.saveToNotion()` → `store.save()`
- Line 58: change `"回写 Notion"` → `"保存报价"`

**Step 2: Update LedgerPage.tsx**

- Line 257: change `"保存到 Notion"` → `"保存"`

**Step 3: Update SubscriptionPage.tsx**

- Lines 434-436: change `selected.notionAssetPageId` → `selected.id` (3 occurrences)
- Line 537: change `"创建并写回 Notion"` → `"创建订阅"`

**Step 4: Commit**

```bash
git add src/pages/QuoteCenterPage.tsx src/pages/LedgerPage.tsx src/pages/SubscriptionPage.tsx
git commit -m "feat: update page components — remove Notion references from UI"
```

---

### Task 19: Checkpoint — Verify TypeScript Build

**Step 1: Run TypeScript compilation**

```bash
pnpm build
```

Expected: Compilation succeeds with zero errors. If there are type errors, fix the mismatched field names between SQLite column aliases and TypeScript interfaces.

**Step 2: Commit**

```bash
git add -A
git commit -m "checkpoint: Phase 2 complete — all services/stores use SQLite"
```

---

## Phase 3: Cleanup

### Task 20: Delete Old Notion Code

**Files:**
- Delete: `src/lib/notion/client.ts`
- Delete: `src/lib/notion/dataProvider.ts`
- Delete: `src/lib/notion/helpers.ts`
- Delete: `src/lib/notion/settings.ts`
- Delete: `src/lib/types/notion.ts`
- Delete: `src/services/subscriptionSyncService.ts`
- Delete: `src/services/subscriptionMapper.ts`

**Step 1: Delete files**

```bash
rm -rf src/lib/notion/
rm src/lib/types/notion.ts
rm src/services/subscriptionSyncService.ts
rm src/services/subscriptionMapper.ts
```

**Step 2: Grep for any remaining Notion references**

```bash
grep -ri "notion" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: Zero results, OR only `SubscriptionPage.tsx` lines 648/685 (icon matching for "Notion" the product — this is valid, it's branding not API).

**Step 3: Verify builds**

```bash
pnpm build
cd src-tauri && cargo check && cd ..
```

Expected: Both pass with zero errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete all Notion API code — client, dataProvider, helpers, settings, mapper, syncService"
```

---

### Task 21: Update SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.tsx` (replace entire file, 222 lines)

**Step 1: Rewrite SettingsPage**

The current SettingsPage is entirely about configuring Notion Token and 8 database IDs. Replace it with a minimal page showing the database path and export/import buttons. The exact implementation depends on the UI patterns in the V7 design, so write a placeholder that the UI team can style later:

```typescript
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function SettingsPage() {
  const [message, setMessage] = useState("");

  async function handleExport() {
    try {
      const path = await invoke<string>("db_export_json", {
        path: `mixarlabos_export_${Date.now()}.json`,
      });
      setMessage(`已导出到: ${path}`);
    } catch (error) {
      setMessage(`导出失败: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  async function handleImport() {
    // TODO: Use Tauri file dialog to pick a JSON file
    setMessage("导入功能开发中");
  }

  return (
    <div className="page">
      <h2>设置</h2>
      <section>
        <h3>数据管理</h3>
        <p className="muted">数据存储在本地 SQLite 数据库中。</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => void handleExport()}>导出 JSON</button>
          <button onClick={() => void handleImport()}>导入 JSON</button>
        </div>
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </section>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: rewrite SettingsPage — SQLite export/import, remove Notion config"
```

---

### Task 22: Final Verification

**Step 1: Full build**

```bash
pnpm build && cd src-tauri && cargo build && cd ..
```
Expected: Both pass.

**Step 2: Final grep check**

```bash
grep -ri "notion" src/ --include="*.ts" --include="*.tsx" | grep -v "// icon" | grep -v "notion.ts"
```
Expected: Zero results (or only the brand icon matching in SubscriptionPage).

**Step 3: Final commit**

```bash
git add -A
git commit -m "checkpoint: Phase 3 complete — all Notion code removed, clean build"
```

---

## Phase 4: Polish (separate tasks, lower priority)

### Task 23: Add Motion.dev animations

**Files:**
- Modify: `package.json` (add `motion` dependency)
- Modify: `src/App.tsx` (add `LazyMotion` provider)

**Step 1: Install motion**

```bash
pnpm add motion
```

**Step 2: Add LazyMotion to App.tsx**

Add at the top of the component tree in `src/App.tsx`:

```typescript
import { LazyMotion, domAnimation } from "motion/react";

// Wrap the entire app:
<LazyMotion features={domAnimation}>
  {/* existing Router content */}
</LazyMotion>
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src/App.tsx
git commit -m "feat: add motion library with LazyMotion provider"
```

### Task 24: Verify notificationService compatibility

**Files:**
- Read: `src/services/notificationService.ts`

**Step 1: Check if SubscriptionRecord.id semantics changed**

The `notificationService.ts` uses `item.id` to build notification keys. Since we removed `notionAssetPageId` and `notionLedgerPageId` but kept `id` as the primary key (now a UUID instead of a Notion page ID), the notification key format `${item.id}:${dayLabel}` still works — just with different ID formats. No code changes needed, but verify the service still compiles.

**Step 2: Commit if any changes**

Only commit if changes were actually needed.
