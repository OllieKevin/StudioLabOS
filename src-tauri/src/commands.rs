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
    "asset_ledger_links",
];

const ALLOWED_OPS: &[&str] = &["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"];

fn validate_table(table: &str) -> Result<(), String> {
    if ALLOWED_TABLES.contains(&table) {
        Ok(())
    } else {
        Err(format!("不允许操作的表: {table}"))
    }
}

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
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

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

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn get_junction_columns(conn: &rusqlite::Connection, table: &str) -> Result<Vec<String>, String> {
    let info_sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn.prepare(&info_sql).map_err(|e| e.to_string())?;
    let col_names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if col_names.len() != 2 {
        return Err(format!("{table} 不是有效的关联表"));
    }

    Ok(col_names)
}

fn sanitize_aggregate_sql(sql: &str) -> Result<String, String> {
    let trimmed = sql.trim();
    let no_trailing = trimmed.strip_suffix(';').unwrap_or(trimmed).trim();

    if no_trailing.contains(';') {
        return Err("aggregate 只允许单条 SELECT 查询".to_string());
    }

    let upper = no_trailing.to_uppercase();
    if !upper.starts_with("SELECT") && !upper.starts_with("WITH") {
        return Err("aggregate 只允许 SELECT 查询".to_string());
    }

    Ok(no_trailing.to_string())
}

fn ensure_aggregate_readonly(conn: &rusqlite::Connection, sql: &str) -> Result<(), String> {
    let stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    if stmt.readonly() {
        Ok(())
    } else {
        Err("aggregate 只允许只读查询".to_string())
    }
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

                let val = clause.get("value").unwrap_or(&Value::Null);
                if op == "IN" {
                    if let Some(arr) = val.as_array() {
                        if arr.is_empty() {
                            conditions.push("1 = 0".to_string());
                        } else {
                            let ph = std::iter::repeat("?")
                                .take(arr.len())
                                .collect::<Vec<_>>()
                                .join(", ");
                            conditions.push(format!("{col} IN ({ph})"));
                            for item in arr {
                                params.push(json_to_sql(item));
                            }
                        }
                    } else {
                        conditions.push(format!("{col} IN (?)"));
                        params.push(json_to_sql(val));
                    }
                } else {
                    conditions.push(format!("{col} {op} ?"));
                    params.push(json_to_sql(val));
                }
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
pub fn db_insert(state: State<'_, DbState>, table: String, data: Value) -> Result<String, String> {
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
pub fn db_delete(state: State<'_, DbState>, table: String, id: String) -> Result<(), String> {
    validate_table(&table)?;
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(&format!("DELETE FROM {table} WHERE id = ?"), [&id])
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
    let col_names = get_junction_columns(&conn, &junction)?;

    let sql = format!(
        "INSERT OR IGNORE INTO {} ({}, {}) VALUES (?, ?)",
        junction, col_names[0], col_names[1]
    );
    conn.execute(&sql, [&left_id, &right_id])
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
    let col_names = get_junction_columns(&conn, &junction)?;

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
    let col_names = get_junction_columns(&conn, &junction)?;

    if !col_names.iter().any(|c| c == &column) {
        return Err(format!("关联表 {junction} 中不存在列 {column}"));
    }

    let other_col = col_names
        .iter()
        .find(|c| c.as_str() != column)
        .ok_or(format!("关联表 {junction} 中未找到非 {column} 列"))?;

    let sql = format!("SELECT {other_col} FROM {junction} WHERE {column} = ?");
    let mut query_stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let ids: Vec<String> = query_stmt
        .query_map([&id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(ids)
}

#[tauri::command]
pub fn db_aggregate(
    state: State<'_, DbState>,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<Vec<Value>, String> {
    let safe_sql = sanitize_aggregate_sql(&sql)?;

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    ensure_aggregate_readonly(&conn, &safe_sql)?;
    let sql_params: Vec<rusqlite::types::Value> = params
        .unwrap_or_default()
        .iter()
        .map(json_to_sql)
        .collect();

    rows_to_json(&conn, &safe_sql, &sql_params)
}

#[tauri::command]
pub fn db_export_json(state: State<'_, DbState>, path: String) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut export = Map::new();

    for &table in ALLOWED_TABLES {
        let sql = format!("SELECT * FROM {table}");
        let rows = rows_to_json(&conn, &sql, &[])?;
        export.insert(table.to_string(), Value::Array(rows));
    }

    let json = serde_json::to_string_pretty(&Value::Object(export)).map_err(|e| e.to_string())?;

    std::fs::write(&path, &json).map_err(|e| format!("写入文件失败: {e}"))?;

    Ok(path)
}

#[tauri::command]
pub fn db_import_json(state: State<'_, DbState>, path: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {e}"))?;
    let data: Value = serde_json::from_str(&content).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let obj = data.as_object().ok_or("JSON 根必须是对象")?;

    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

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
                validate_column(key)?;
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
            tx.execute(&sql, params_from_iter(values.iter()))
                .map_err(|e| format!("导入 {table} 失败: {e}"))?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
