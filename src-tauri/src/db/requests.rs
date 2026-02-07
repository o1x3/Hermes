use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedRequest {
    pub id: String,
    pub collection_id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: String,
    pub params: String,
    pub body: String,
    pub auth: String,
    pub variables: String,
    pub sort_order: i32,
    pub updated_at: String,
    pub created_at: String,
}

fn row_to_request(row: &rusqlite::Row) -> rusqlite::Result<SavedRequest> {
    Ok(SavedRequest {
        id: row.get(0)?,
        collection_id: row.get(1)?,
        folder_id: row.get(2)?,
        name: row.get(3)?,
        method: row.get(4)?,
        url: row.get(5)?,
        headers: row.get(6)?,
        params: row.get(7)?,
        body: row.get(8)?,
        auth: row.get(9)?,
        variables: row.get(10)?,
        sort_order: row.get(11)?,
        updated_at: row.get(12)?,
        created_at: row.get(13)?,
    })
}

const SELECT_COLS: &str =
    "id, collection_id, folder_id, name, method, url, headers, params, body, auth, variables, sort_order, updated_at, created_at";

pub fn get_all(conn: &Connection) -> Result<Vec<SavedRequest>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM requests ORDER BY sort_order, created_at",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row_to_request(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct CreateRequest {
    pub collection_id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: String,
    pub params: String,
    pub body: String,
    pub auth: String,
}

pub fn create(conn: &Connection, data: &CreateRequest) -> Result<SavedRequest, String> {
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM requests WHERE collection_id = ?1",
            params![data.collection_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, params, body, auth, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            data.collection_id,
            data.folder_id,
            data.name,
            data.method,
            data.url,
            data.headers,
            data.params,
            data.body,
            data.auth,
            max_order + 1
        ],
    )
    .map_err(|e| e.to_string())?;

    get_by_id(conn, &id)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<SavedRequest, String> {
    conn.query_row(
        &format!("SELECT {} FROM requests WHERE id = ?1", SELECT_COLS),
        params![id],
        |row| row_to_request(row),
    )
    .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct UpdateRequest {
    pub name: Option<String>,
    pub method: Option<String>,
    pub url: Option<String>,
    pub headers: Option<String>,
    pub params: Option<String>,
    pub body: Option<String>,
    pub auth: Option<String>,
    pub variables: Option<String>,
}

pub fn update(conn: &Connection, id: &str, data: &UpdateRequest) -> Result<(), String> {
    let mut sets = vec!["updated_at = datetime('now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    macro_rules! add_field {
        ($field:expr, $col:literal) => {
            if let Some(ref val) = $field {
                sets.push(format!("{} = ?{}", $col, values.len() + 1));
                values.push(Box::new(val.clone()));
            }
        };
    }

    add_field!(data.name, "name");
    add_field!(data.method, "method");
    add_field!(data.url, "url");
    add_field!(data.headers, "headers");
    add_field!(data.params, "params");
    add_field!(data.body, "body");
    add_field!(data.auth, "auth");
    add_field!(data.variables, "variables");

    let sql = format!(
        "UPDATE requests SET {} WHERE id = ?{}",
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
    conn.execute("DELETE FROM requests WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn duplicate(conn: &Connection, id: &str) -> Result<SavedRequest, String> {
    let original = get_by_id(conn, id)?;
    let new_id = Uuid::new_v4().to_string();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM requests WHERE collection_id = ?1",
            params![original.collection_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO requests (id, collection_id, folder_id, name, method, url, headers, params, body, auth, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            new_id,
            original.collection_id,
            original.folder_id,
            format!("Copy of {}", original.name),
            original.method,
            original.url,
            original.headers,
            original.params,
            original.body,
            original.auth,
            max_order + 1
        ],
    )
    .map_err(|e| e.to_string())?;

    get_by_id(conn, &new_id)
}

pub fn move_request(
    conn: &Connection,
    id: &str,
    folder_id: Option<&str>,
    collection_id: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE requests SET folder_id = ?1, collection_id = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![folder_id, collection_id, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
