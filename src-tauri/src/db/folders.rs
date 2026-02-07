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
}

pub fn get_all(conn: &Connection) -> Result<Vec<Folder>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order, created_at
             FROM folders ORDER BY sort_order, created_at",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
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
            })
        })
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
        "SELECT id, collection_id, parent_folder_id, name, default_headers, default_auth, variables, sort_order, created_at
         FROM folders WHERE id = ?1",
        params![id],
        |row| {
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
            })
        },
    )
    .map_err(|e| e.to_string())
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
