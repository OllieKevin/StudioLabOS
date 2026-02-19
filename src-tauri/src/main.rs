#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let state = db::init_db(&app.handle()).expect("数据库初始化失败");
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
