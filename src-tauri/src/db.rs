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
    std::fs::create_dir_all(&db_dir).map_err(|e| format!("创建数据目录失败: {e}"))?;

    let db_path = db_dir.join("data.db");
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {e}"))?;

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
