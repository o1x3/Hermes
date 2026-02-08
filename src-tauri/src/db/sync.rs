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

