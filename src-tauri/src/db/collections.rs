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
}

pub fn get_all(conn: &Connection) -> Result<Vec<Collection>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, default_headers, default_auth, variables, sort_order, updated_at, created_at
             FROM collections ORDER BY sort_order, created_at",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
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
            })
        })
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
        "SELECT id, name, description, default_headers, default_auth, variables, sort_order, updated_at, created_at
         FROM collections WHERE id = ?1",
        params![id],
        |row| {
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
            })
        },
    )
    .map_err(|e| e.to_string())
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
