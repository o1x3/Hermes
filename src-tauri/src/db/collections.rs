use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub default_headers: String,
    pub default_auth: String,
    pub variables: String,
    pub sort_order: i32,
    pub updated_at: String,
    pub created_at: String,
    pub team_id: Option<String>,
    pub cloud_id: Option<String>,
    pub synced_at: Option<String>,
    pub dirty: i32,
}

const SELECT_COLS: &str =
    "id, name, description, default_headers, default_auth, variables, sort_order, updated_at, created_at, team_id, cloud_id, synced_at, dirty";

fn row_to_collection(row: &rusqlite::Row) -> rusqlite::Result<Collection> {
    Ok(Collection {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        default_headers: row.get(3)?,
        default_auth: row.get(4)?,
        variables: row.get(5)?,
        sort_order: row.get(6)?,
        updated_at: row.get(7)?,
        created_at: row.get(8)?,
        team_id: row.get(9)?,
        cloud_id: row.get(10)?,
        synced_at: row.get(11)?,
        dirty: row.get::<_, Option<i32>>(12)?.unwrap_or(0),
    })
}

pub fn get_all(conn: &Connection) -> Result<Vec<Collection>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM collections ORDER BY sort_order, created_at",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row_to_collection(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn create(conn: &Connection, name: &str) -> Result<Collection, String> {
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) FROM collections", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO collections (id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![id, name, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    get_by_id(conn, &id)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Collection, String> {
    conn.query_row(
        &format!("SELECT {} FROM collections WHERE id = ?1", SELECT_COLS),
        params![id],
        |row| row_to_collection(row),
    )
    .map_err(|e| e.to_string())
}

pub fn get_by_team(conn: &Connection, team_id: &str) -> Result<Vec<Collection>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM collections WHERE team_id = ?1 ORDER BY sort_order, created_at",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![team_id], |row| row_to_collection(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_dirty(conn: &Connection) -> Result<Vec<Collection>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM collections WHERE dirty = 1 AND team_id IS NOT NULL",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row_to_collection(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn mark_synced(
    conn: &Connection,
    id: &str,
    cloud_id: &str,
    team_id: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE collections SET cloud_id = ?1, team_id = ?2, synced_at = datetime('now'), dirty = 0 WHERE id = ?3",
        params![cloud_id, team_id, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn mark_dirty(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE collections SET dirty = 1 WHERE id = ?1 AND team_id IS NOT NULL",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn upsert_from_cloud(
    conn: &Connection,
    cloud_id: &str,
    team_id: &str,
    name: &str,
    description: &str,
    default_headers: &str,
    default_auth: &str,
    variables: &str,
    sort_order: i32,
) -> Result<Collection, String> {
    // Check if we already have this cloud record cached locally
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM collections WHERE cloud_id = ?1",
            params![cloud_id],
            |row| row.get(0),
        )
        .ok();

    if let Some(local_id) = existing {
        conn.execute(
            "UPDATE collections SET name = ?1, description = ?2, default_headers = ?3, default_auth = ?4, variables = ?5, sort_order = ?6, team_id = ?7, synced_at = datetime('now'), dirty = 0 WHERE id = ?8",
            params![name, description, default_headers, default_auth, variables, sort_order, team_id, local_id],
        )
        .map_err(|e| e.to_string())?;
        get_by_id(conn, &local_id)
    } else {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO collections (id, name, description, default_headers, default_auth, variables, sort_order, team_id, cloud_id, synced_at, dirty)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), 0)",
            params![id, name, description, default_headers, default_auth, variables, sort_order, team_id, cloud_id],
        )
        .map_err(|e| e.to_string())?;
        get_by_id(conn, &id)
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateCollection {
    pub name: Option<String>,
    pub description: Option<String>,
    pub default_headers: Option<String>,
    pub default_auth: Option<String>,
    pub variables: Option<String>,
}

pub fn update(conn: &Connection, id: &str, data: &UpdateCollection) -> Result<(), String> {
    let mut sets = vec!["updated_at = datetime('now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    if let Some(ref name) = data.name {
        sets.push(format!("name = ?{}", values.len() + 1));
        values.push(Box::new(name.clone()));
    }
    if let Some(ref desc) = data.description {
        sets.push(format!("description = ?{}", values.len() + 1));
        values.push(Box::new(desc.clone()));
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

    // Auto-mark dirty if this is a synced collection
    sets.push(format!(
        "dirty = CASE WHEN team_id IS NOT NULL THEN 1 ELSE dirty END"
    ));

    let sql = format!(
        "UPDATE collections SET {} WHERE id = ?{}",
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
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
