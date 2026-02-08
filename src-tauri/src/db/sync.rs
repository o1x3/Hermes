use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncQueueEntry {
    pub id: i64,
    pub table_name: String,
    pub local_id: String,
    pub operation: String,
    pub payload: Option<String>,
    pub queued_at: String,
    pub retry_count: i32,
    pub last_error: Option<String>,
}

pub fn enqueue(
    conn: &Connection,
    table_name: &str,
    local_id: &str,
    operation: &str,
    payload: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO sync_queue (table_name, local_id, operation, payload) VALUES (?1, ?2, ?3, ?4)",
        params![table_name, local_id, operation, payload],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_pending(conn: &Connection, limit: i32) -> Result<Vec<SyncQueueEntry>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, table_name, local_id, operation, payload, queued_at, retry_count, last_error
             FROM sync_queue ORDER BY id ASC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(SyncQueueEntry {
                id: row.get(0)?,
                table_name: row.get(1)?,
                local_id: row.get(2)?,
                operation: row.get(3)?,
                payload: row.get(4)?,
                queued_at: row.get(5)?,
                retry_count: row.get(6)?,
                last_error: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn remove(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn mark_failed(conn: &Connection, id: i64, error: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?1 WHERE id = ?2",
        params![error, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn clear_for_item(conn: &Connection, table_name: &str, local_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM sync_queue WHERE table_name = ?1 AND local_id = ?2",
        params![table_name, local_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
