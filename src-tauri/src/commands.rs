use crate::db::{self, AppDb};
use crate::http::client::{self, HttpRequest};
use serde::{Deserialize, Serialize};

// ── HTTP ──

#[tauri::command]
pub async fn send_request(
    request: HttpRequest,
) -> Result<client::HttpResponse, String> {
    client::execute_request(request).await
}

// ── Workspace ──

#[derive(Debug, Serialize)]
pub struct Workspace {
    pub collections: Vec<db::collections::Collection>,
    pub folders: Vec<db::folders::Folder>,
    pub requests: Vec<db::requests::SavedRequest>,
    pub environments: Vec<db::environments::Environment>,
    pub active_environment_id: Option<String>,
}

#[tauri::command]
pub fn load_workspace(db: tauri::State<'_, AppDb>) -> Result<Workspace, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let active_environment_id = db::settings::get(&conn, "active_environment_id")?;
    Ok(Workspace {
        collections: db::collections::get_all(&conn)?,
        folders: db::folders::get_all(&conn)?,
        requests: db::requests::get_all(&conn)?,
        environments: db::environments::get_all(&conn)?,
        active_environment_id,
    })
}

// ── Collections ──

#[tauri::command]
pub fn create_collection(
    db: tauri::State<'_, AppDb>,
    name: String,
) -> Result<db::collections::Collection, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::collections::create(&conn, &name)
}

#[tauri::command]
pub fn update_collection(
    db: tauri::State<'_, AppDb>,
    id: String,
    data: db::collections::UpdateCollection,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::collections::update(&conn, &id, &data)
}

#[tauri::command]
pub fn delete_collection(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::collections::delete(&conn, &id)
}

// ── Folders ──

#[tauri::command]
pub fn create_folder(
    db: tauri::State<'_, AppDb>,
    collection_id: String,
    name: String,
    parent_folder_id: Option<String>,
) -> Result<db::folders::Folder, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::folders::create(&conn, &collection_id, &name, parent_folder_id.as_deref())
}

#[tauri::command]
pub fn update_folder(
    db: tauri::State<'_, AppDb>,
    id: String,
    data: db::folders::UpdateFolder,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::folders::update(&conn, &id, &data)
}

#[tauri::command]
pub fn delete_folder(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::folders::delete(&conn, &id)
}

// ── Requests ──

#[tauri::command]
pub fn create_request(
    db: tauri::State<'_, AppDb>,
    data: db::requests::CreateRequest,
) -> Result<db::requests::SavedRequest, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::requests::create(&conn, &data)
}

#[tauri::command]
pub fn update_request(
    db: tauri::State<'_, AppDb>,
    id: String,
    data: db::requests::UpdateRequest,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::requests::update(&conn, &id, &data)
}

#[tauri::command]
pub fn delete_request(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::requests::delete(&conn, &id)
}

#[tauri::command]
pub fn duplicate_request(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<db::requests::SavedRequest, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::requests::duplicate(&conn, &id)
}

#[tauri::command]
pub fn move_request(
    db: tauri::State<'_, AppDb>,
    id: String,
    folder_id: Option<String>,
    collection_id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::requests::move_request(&conn, &id, folder_id.as_deref(), &collection_id)
}

// ── Environments ──

#[tauri::command]
pub fn load_environments(
    db: tauri::State<'_, AppDb>,
) -> Result<Vec<db::environments::Environment>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::environments::get_all(&conn)
}

#[tauri::command]
pub fn create_environment(
    db: tauri::State<'_, AppDb>,
    name: String,
) -> Result<db::environments::Environment, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::environments::create(&conn, &name)
}

#[tauri::command]
pub fn update_environment(
    db: tauri::State<'_, AppDb>,
    id: String,
    data: db::environments::UpdateEnvironment,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::environments::update(&conn, &id, &data)
}

#[tauri::command]
pub fn delete_environment(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::environments::delete(&conn, &id)
}

// ── Settings ──

#[tauri::command]
pub fn get_setting(
    db: tauri::State<'_, AppDb>,
    key: String,
) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::settings::get(&conn, &key)
}

#[tauri::command]
pub fn set_setting(
    db: tauri::State<'_, AppDb>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::settings::set(&conn, &key, &value)
}

// ── Reorder ──

#[derive(Debug, Deserialize)]
pub struct ReorderItem {
    pub id: String,
    pub sort_order: i32,
}

#[tauri::command]
pub fn reorder_items(
    db: tauri::State<'_, AppDb>,
    items: Vec<ReorderItem>,
    table: String,
) -> Result<(), String> {
    let table_name = match table.as_str() {
        "collections" | "folders" | "requests" | "environments" => table.as_str(),
        _ => return Err(format!("Invalid table name: {}", table)),
    };

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = format!("UPDATE {} SET sort_order = ?1 WHERE id = ?2", table_name);

    for item in &items {
        conn.execute(&sql, rusqlite::params![item.sort_order, item.id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
