mod commands;
mod db;
mod http;

use db::AppDb;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let conn =
                db::init_db(&data_dir).map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            app.manage(AppDb(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::send_request,
            commands::load_workspace,
            commands::create_collection,
            commands::update_collection,
            commands::delete_collection,
            commands::create_folder,
            commands::update_folder,
            commands::delete_folder,
            commands::create_request,
            commands::update_request,
            commands::delete_request,
            commands::duplicate_request,
            commands::move_request,
            commands::reorder_items,
            commands::load_environments,
            commands::create_environment,
            commands::update_environment,
            commands::delete_environment,
            commands::get_setting,
            commands::set_setting,
            commands::log_history,
            commands::get_history_entry,
            commands::search_history,
            commands::delete_history_entry,
            commands::clear_history,
            commands::cleanup_old_history,
            commands::write_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
