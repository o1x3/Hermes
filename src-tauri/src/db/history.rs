use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const MAX_BODY_BYTES: usize = 1_048_576; // 1MB

#[derive(Debug, Serialize, Clone)]
pub struct HistoryEntry {
    pub id: String,
    pub method: String,
    pub url: String,
    pub headers: String,
    pub params: String,
    pub body: String,
    pub auth: String,
    pub response_status: Option<i32>,
    pub response_status_text: Option<String>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
    pub response_time_ms: Option<i64>,
    pub response_size_bytes: Option<i64>,
    pub response_body_truncated: bool,
    pub error: Option<String>,
    pub saved_request_id: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateHistoryEntry {
    pub method: String,
    pub url: String,
    pub headers: String,
    pub params: String,
    pub body: String,
    pub auth: String,
    pub response_status: Option<i32>,
    pub response_status_text: Option<String>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
    pub response_time_ms: Option<i64>,
    pub response_size_bytes: Option<i64>,
    pub error: Option<String>,
    pub saved_request_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HistorySearchParams {
    pub query: Option<String>,
    pub method: Option<String>,
    pub status_min: Option<i32>,
    pub status_max: Option<i32>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

fn row_to_entry(row: &rusqlite::Row) -> rusqlite::Result<HistoryEntry> {
    let truncated: i32 = row.get(13)?;
    Ok(HistoryEntry {
        id: row.get(0)?,
        method: row.get(1)?,
        url: row.get(2)?,
        headers: row.get(3)?,
        params: row.get(4)?,
        body: row.get(5)?,
        auth: row.get(6)?,
        response_status: row.get(7)?,
        response_status_text: row.get(8)?,
        response_headers: row.get(9)?,
        response_body: row.get(10)?,
        response_time_ms: row.get(11)?,
        response_size_bytes: row.get(12)?,
        response_body_truncated: truncated != 0,
        error: row.get(14)?,
        saved_request_id: row.get(15)?,
        timestamp: row.get(16)?,
    })
}

const SELECT_COLS: &str = "id, method, url, headers, params, body, auth, \
    response_status, response_status_text, response_headers, response_body, \
    response_time_ms, response_size_bytes, response_body_truncated, \
    error, saved_request_id, timestamp";

pub fn create(conn: &Connection, data: &CreateHistoryEntry) -> Result<HistoryEntry, String> {
    let id = Uuid::new_v4().to_string();

    let (response_body, truncated) = match &data.response_body {
        Some(body) if body.len() > MAX_BODY_BYTES => {
            (Some(body[..MAX_BODY_BYTES].to_string()), 1i32)
        }
        other => (other.clone(), 0i32),
    };

    conn.execute(
        "INSERT INTO history (id, method, url, headers, params, body, auth, \
         response_status, response_status_text, response_headers, response_body, \
         response_time_ms, response_size_bytes, response_body_truncated, \
         error, saved_request_id) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id,
            data.method,
            data.url,
            data.headers,
            data.params,
            data.body,
            data.auth,
            data.response_status,
            data.response_status_text,
            data.response_headers,
            response_body,
            data.response_time_ms,
            data.response_size_bytes,
            truncated,
            data.error,
            data.saved_request_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_by_id(conn, &id)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<HistoryEntry, String> {
    conn.query_row(
        &format!("SELECT {} FROM history WHERE id = ?1", SELECT_COLS),
        params![id],
        |row| row_to_entry(row),
    )
    .map_err(|e| e.to_string())
}

pub fn search(conn: &Connection, params_filter: &HistorySearchParams) -> Result<Vec<HistoryEntry>, String> {
    let mut conditions = vec![];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    if let Some(ref query) = params_filter.query {
        values.push(Box::new(format!("%{}%", query)));
        conditions.push(format!("url LIKE ?{}", values.len()));
    }

    if let Some(ref method) = params_filter.method {
        values.push(Box::new(method.clone()));
        conditions.push(format!("method = ?{}", values.len()));
    }

    if let Some(status_min) = params_filter.status_min {
        values.push(Box::new(status_min));
        conditions.push(format!("response_status >= ?{}", values.len()));
    }

    if let Some(status_max) = params_filter.status_max {
        values.push(Box::new(status_max));
        conditions.push(format!("response_status <= ?{}", values.len()));
    }

    if let Some(ref from_date) = params_filter.from_date {
        values.push(Box::new(from_date.clone()));
        conditions.push(format!("timestamp >= ?{}", values.len()));
    }

    if let Some(ref to_date) = params_filter.to_date {
        values.push(Box::new(to_date.clone()));
        conditions.push(format!("timestamp <= ?{}", values.len()));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let limit = params_filter.limit.unwrap_or(100);
    let offset = params_filter.offset.unwrap_or(0);

    let sql = format!(
        "SELECT {} FROM history {} ORDER BY timestamp DESC LIMIT ?{} OFFSET ?{}",
        SELECT_COLS,
        where_clause,
        values.len() + 1,
        values.len() + 2,
    );

    values.push(Box::new(limit));
    values.push(Box::new(offset));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(
            rusqlite::params_from_iter(values.iter().map(|v| v.as_ref())),
            |row| row_to_entry(row),
        )
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM history WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn clear(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM history", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn cleanup_old(conn: &Connection, retention_days: i32) -> Result<u64, String> {
    let deleted = conn
        .execute(
            "DELETE FROM history WHERE timestamp < datetime('now', ?1)",
            params![format!("-{} days", retention_days)],
        )
        .map_err(|e| e.to_string())?;

    Ok(deleted as u64)
}
