use crate::db::{self, AppDb};
use crate::http::client::{self, HttpConfig, HttpRequest};
use serde::{Deserialize, Serialize};

// ── HTTP ──

#[tauri::command]
pub async fn send_request(
    request: HttpRequest,
    config: Option<HttpConfig>,
) -> Result<client::HttpResponse, String> {
    client::execute_request(request, config).await
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

// ── History ──

#[tauri::command]
pub fn log_history(
    db: tauri::State<'_, AppDb>,
    data: db::history::CreateHistoryEntry,
) -> Result<db::history::HistoryEntry, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::history::create(&conn, &data)
}

#[tauri::command]
pub fn get_history_entry(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<db::history::HistoryEntry, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::history::get_by_id(&conn, &id)
}

#[tauri::command]
pub fn search_history(
    db: tauri::State<'_, AppDb>,
    params: db::history::HistorySearchParams,
) -> Result<Vec<db::history::HistoryEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::history::search(&conn, &params)
}

#[tauri::command]
pub fn delete_history_entry(
    db: tauri::State<'_, AppDb>,
    id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::history::delete(&conn, &id)
}

#[tauri::command]
pub fn clear_history(db: tauri::State<'_, AppDb>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::history::clear(&conn)
}

#[tauri::command]
pub fn cleanup_old_history(
    db: tauri::State<'_, AppDb>,
    retention_days: i32,
) -> Result<u64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::history::cleanup_old(&conn, retention_days)
}

// ── Sync ──

#[derive(Debug, Serialize)]
pub struct DirtyRecords {
    pub collections: Vec<db::collections::Collection>,
    pub folders: Vec<db::folders::Folder>,
    pub requests: Vec<db::requests::SavedRequest>,
}

#[tauri::command]
pub fn mark_synced(
    db: tauri::State<'_, AppDb>,
    table: String,
    local_id: String,
    cloud_id: String,
    team_id: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    match table.as_str() {
        "collections" => db::collections::mark_synced(
            &conn,
            &local_id,
            &cloud_id,
            team_id.as_deref().ok_or("team_id required for collections")?,
        ),
        "folders" => db::folders::mark_synced(&conn, &local_id, &cloud_id),
        "requests" => db::requests::mark_synced(&conn, &local_id, &cloud_id),
        _ => Err(format!("Invalid table: {}", table)),
    }
}

#[tauri::command]
pub fn mark_dirty(
    db: tauri::State<'_, AppDb>,
    table: String,
    local_id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    match table.as_str() {
        "collections" => db::collections::mark_dirty(&conn, &local_id),
        "folders" => db::folders::mark_dirty(&conn, &local_id),
        "requests" => db::requests::mark_dirty(&conn, &local_id),
        _ => Err(format!("Invalid table: {}", table)),
    }
}

#[tauri::command]
pub fn get_dirty_records(db: tauri::State<'_, AppDb>) -> Result<DirtyRecords, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    Ok(DirtyRecords {
        collections: db::collections::get_dirty(&conn)?,
        folders: db::folders::get_dirty(&conn)?,
        requests: db::requests::get_dirty(&conn)?,
    })
}

#[derive(Debug, Deserialize)]
#[serde(tag = "table")]
pub enum UpsertFromCloud {
    #[serde(rename = "collections")]
    Collection {
        cloud_id: String,
        team_id: String,
        name: String,
        description: String,
        default_headers: String,
        default_auth: String,
        variables: String,
        sort_order: i32,
    },
    #[serde(rename = "folders")]
    Folder {
        cloud_id: String,
        collection_id: String,
        parent_folder_id: Option<String>,
        name: String,
        default_headers: String,
        default_auth: String,
        variables: String,
        sort_order: i32,
    },
    #[serde(rename = "requests")]
    Request {
        cloud_id: String,
        collection_id: String,
        folder_id: Option<String>,
        name: String,
        method: String,
        url: String,
        headers: String,
        params: String,
        body: String,
        auth: String,
        variables: String,
        sort_order: i32,
    },
}

#[tauri::command]
pub fn upsert_from_cloud(
    db: tauri::State<'_, AppDb>,
    data: UpsertFromCloud,
) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    match data {
        UpsertFromCloud::Collection {
            cloud_id, team_id, name, description, default_headers, default_auth, variables, sort_order,
        } => {
            let c = db::collections::upsert_from_cloud(
                &conn, &cloud_id, &team_id, &name, &description, &default_headers, &default_auth, &variables, sort_order,
            )?;
            Ok(c.id)
        }
        UpsertFromCloud::Folder {
            cloud_id, collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order,
        } => {
            let f = db::folders::upsert_from_cloud(
                &conn, &cloud_id, &collection_id, parent_folder_id.as_deref(), &name, &default_headers, &default_auth, &variables, sort_order,
            )?;
            Ok(f.id)
        }
        UpsertFromCloud::Request {
            cloud_id, collection_id, folder_id, name, method, url, headers, params, body, auth, variables, sort_order,
        } => {
            let r = db::requests::upsert_from_cloud(
                &conn, &cloud_id, &collection_id, folder_id.as_deref(), &name, &method, &url, &headers, &params, &body, &auth, &variables, sort_order,
            )?;
            Ok(r.id)
        }
    }
}

#[tauri::command]
pub fn load_team_workspace(
    db: tauri::State<'_, AppDb>,
    team_id: String,
) -> Result<Workspace, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let collections = db::collections::get_by_team(&conn, &team_id)?;
    let col_ids: Vec<&str> = collections.iter().map(|c| c.id.as_str()).collect();

    // Filter folders and requests to only those in team collections
    let all_folders = db::folders::get_all(&conn)?;
    let all_requests = db::requests::get_all(&conn)?;

    let folders: Vec<_> = all_folders
        .into_iter()
        .filter(|f| col_ids.contains(&f.collection_id.as_str()))
        .collect();
    let requests: Vec<_> = all_requests
        .into_iter()
        .filter(|r| col_ids.contains(&r.collection_id.as_str()))
        .collect();

    Ok(Workspace {
        collections,
        folders,
        requests,
        environments: vec![],
        active_environment_id: None,
    })
}

#[tauri::command]
pub fn get_sync_queue(
    db: tauri::State<'_, AppDb>,
    limit: i32,
) -> Result<Vec<db::sync::SyncQueueEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::sync::get_pending(&conn, limit)
}

#[tauri::command]
pub fn remove_sync_queue_entry(
    db: tauri::State<'_, AppDb>,
    id: i64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::sync::remove(&conn, id)
}

#[tauri::command]
pub fn hard_delete_synced(
    db: tauri::State<'_, AppDb>,
    table: String,
    local_id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = match table.as_str() {
        "collections" => "DELETE FROM collections WHERE id = ?1 AND cloud_id IS NOT NULL",
        "folders" => "DELETE FROM folders WHERE id = ?1 AND cloud_id IS NOT NULL",
        "requests" => "DELETE FROM requests WHERE id = ?1 AND cloud_id IS NOT NULL",
        _ => return Err(format!("Invalid table: {}", table)),
    };
    conn.execute(sql, rusqlite::params![local_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── File I/O ──

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}
