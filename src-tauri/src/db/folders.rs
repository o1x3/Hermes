use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub collection_id: String,
    pub parent_folder_id: Option<String>,
    pub name: String,
    pub default_headers: String,
    pub default_auth: String,
    pub variables: String,
    pub sort_order: i32,
    pub created_at: String,
    pub cloud_id: Option<String>,
    pub synced_at: Option<String>,
    pub dirty: i32,
}

const SELECT_COLS: &str =
    "id, collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order, created_at, cloud_id, synced_at, dirty";

fn row_to_folder(row: &rusqlite::Row) -> rusqlite::Result<Folder> {
    Ok(Folder {
        id: row.get(0)?,
        collection_id: row.get(1)?,
        parent_folder_id: row.get(2)?,
        name: row.get(3)?,
        default_headers: row.get(4)?,
        default_auth: row.get(5)?,
        variables: row.get(6)?,
        sort_order: row.get(7)?,
        created_at: row.get(8)?,
        cloud_id: row.get(9)?,
        synced_at: row.get(10)?,
        dirty: row.get::<_, Option<i32>>(11)?.unwrap_or(0),
    })
}

pub fn get_all(conn: &Connection) -> Result<Vec<Folder>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM folders ORDER BY sort_order, created_at",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row_to_folder(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn create(
    conn: &Connection,
    collection_id: &str,
    name: &str,
    parent_folder_id: Option<&str>,
) -> Result<Folder, String> {
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM folders WHERE collection_id = ?1",
            params![collection_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO folders (id, collection_id, parent_folder_id, name, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, collection_id, parent_folder_id, name, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    get_by_id(conn, &id)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Folder, String> {
    conn.query_row(
        &format!("SELECT {} FROM folders WHERE id = ?1", SELECT_COLS),
        params![id],
        |row| row_to_folder(row),
    )
    .map_err(|e| e.to_string())
}

pub fn get_dirty(conn: &Connection) -> Result<Vec<Folder>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM folders WHERE dirty = 1",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row_to_folder(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn mark_synced(conn: &Connection, id: &str, cloud_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE folders SET cloud_id = ?1, synced_at = datetime('now'), dirty = 0 WHERE id = ?2",
        params![cloud_id, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn mark_dirty(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE folders SET dirty = 1 WHERE id = ?1 AND cloud_id IS NOT NULL",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn upsert_from_cloud(
    conn: &Connection,
    cloud_id: &str,
    collection_id: &str,
    parent_folder_id: Option<&str>,
    name: &str,
    default_headers: &str,
    default_auth: &str,
    variables: &str,
    sort_order: i32,
) -> Result<Folder, String> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM folders WHERE cloud_id = ?1",
            params![cloud_id],
            |row| row.get(0),
        )
        .ok();

    if let Some(local_id) = existing {
        conn.execute(
            "UPDATE folders SET collection_id = ?1, parent_folder_id = ?2, name = ?3, default_headers = ?4, default_auth = ?5, variables = ?6, sort_order = ?7, synced_at = datetime('now'), dirty = 0 WHERE id = ?8",
            params![collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order, local_id],
        )
        .map_err(|e| e.to_string())?;
        get_by_id(conn, &local_id)
    } else {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO folders (id, collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order, cloud_id, synced_at, dirty)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), 0)",
            params![id, collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order, cloud_id],
        )
        .map_err(|e| e.to_string())?;
        get_by_id(conn, &id)
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateFolder {
    pub name: Option<String>,
    pub default_headers: Option<String>,
    pub default_auth: Option<String>,
    pub variables: Option<String>,
}

pub fn update(conn: &Connection, id: &str, data: &UpdateFolder) -> Result<(), String> {
    let mut sets = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    if let Some(ref name) = data.name {
        sets.push(format!("name = ?{}", values.len() + 1));
        values.push(Box::new(name.clone()));
    }
    if let Some(ref headers) = data.default_headers {
        sets.push(format!("default_headers = ?{}", values.len() + 1));
        values.push(Box::new(headers.clone()));
    }
    if let Some(ref auth) = data.default_auth {
        sets.push(format!("default_auth = ?{}", values.len() + 1));
        values.push(Box::new(auth.clone()));
    }
    if let Some(ref variables) = data.variables {
        sets.push(format!("variables = ?{}", values.len() + 1));
        values.push(Box::new(variables.clone()));
    }

    if sets.is_empty() {
        return Ok(());
    }

    // Auto-mark dirty if this is a synced folder
    sets.push("dirty = CASE WHEN cloud_id IS NOT NULL THEN 1 ELSE dirty END".to_string());

    let sql = format!(
        "UPDATE folders SET {} WHERE id = ?{}",
        sets.join(", "),
        values.len() + 1
    );
    values.push(Box::new(id.to_string()));

    conn.execute(
        &sql,
        rusqlite::params_from_iter(values.iter().map(|v| v.as_ref())),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
