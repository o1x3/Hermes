use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub variables: String,
    pub is_global: bool,
    pub sort_order: i32,
    pub updated_at: String,
    pub created_at: String,
}

fn row_to_env(row: &rusqlite::Row) -> rusqlite::Result<Environment> {
    Ok(Environment {
        id: row.get(0)?,
        name: row.get(1)?,
        variables: row.get(2)?,
        is_global: row.get(3)?,
        sort_order: row.get(4)?,
        updated_at: row.get(5)?,
        created_at: row.get(6)?,
    })
}

const SELECT_COLS: &str =
    "id, name, variables, is_global, sort_order, updated_at, created_at";

pub fn get_all(conn: &Connection) -> Result<Vec<Environment>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM environments ORDER BY sort_order, created_at",
            SELECT_COLS
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row_to_env(row))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Environment, String> {
    conn.query_row(
        &format!("SELECT {} FROM environments WHERE id = ?1", SELECT_COLS),
        params![id],
        |row| row_to_env(row),
    )
    .map_err(|e| e.to_string())
}

pub fn create(conn: &Connection, name: &str) -> Result<Environment, String> {
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM environments",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO environments (id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![id, name, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    get_by_id(conn, &id)
}

#[derive(Debug, Deserialize)]
pub struct UpdateEnvironment {
    pub name: Option<String>,
    pub variables: Option<String>,
}

pub fn update(conn: &Connection, id: &str, data: &UpdateEnvironment) -> Result<(), String> {
    let mut sets = vec!["updated_at = datetime('now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    if let Some(ref name) = data.name {
        sets.push(format!("name = ?{}", values.len() + 1));
        values.push(Box::new(name.clone()));
    }
    if let Some(ref variables) = data.variables {
        sets.push(format!("variables = ?{}", values.len() + 1));
        values.push(Box::new(variables.clone()));
    }

    let sql = format!(
        "UPDATE environments SET {} WHERE id = ?{}",
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
    // Refuse to delete the global environment
    let is_global: bool = conn
        .query_row(
            "SELECT is_global FROM environments WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if is_global {
        return Err("Cannot delete the global environment".to_string());
    }

    conn.execute("DELETE FROM environments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
