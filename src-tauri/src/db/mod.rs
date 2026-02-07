pub mod collections;
pub mod environments;
pub mod folders;
pub mod requests;
pub mod settings;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct AppDb(pub Mutex<Connection>);

pub fn init_db(app_data_dir: &Path) -> Result<Connection, String> {
    std::fs::create_dir_all(app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let db_path = app_data_dir.join("hermes.db");
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    run_migrations(&conn)?;

    Ok(conn)
}

fn get_schema_version(conn: &Connection) -> Result<i32, String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
    )
    .map_err(|e| format!("Failed to create schema_version table: {}", e))?;

    let version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |r| r.get(0),
        )
        .map_err(|e| format!("Failed to read schema version: {}", e))?;

    Ok(version)
}

fn run_migrations(conn: &Connection) -> Result<(), String> {
    let current = get_schema_version(conn)?;

    if current < 1 {
        migrate_v0(conn)?;
    }

    if current < 2 {
        migrate_v1(conn)?;
    }

    Ok(())
}

/// v0: baseline schema (collections, folders, requests)
fn migrate_v0(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        BEGIN;

        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            default_headers TEXT NOT NULL DEFAULT '[]',
            default_auth TEXT NOT NULL DEFAULT '{\"type\":\"none\"}',
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            parent_folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            default_headers TEXT NOT NULL DEFAULT '[]',
            default_auth TEXT NOT NULL DEFAULT '{\"type\":\"none\"}',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            url TEXT NOT NULL DEFAULT '',
            headers TEXT NOT NULL DEFAULT '[]',
            params TEXT NOT NULL DEFAULT '[]',
            body TEXT NOT NULL DEFAULT '{\"type\":\"none\"}',
            auth TEXT NOT NULL DEFAULT '{\"type\":\"none\"}',
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO schema_version (version) VALUES (1);

        COMMIT;
        ",
    )
    .map_err(|e| format!("Migration v0 failed: {}", e))?;

    Ok(())
}

/// v1: environments, settings, variables on collections/folders/requests
fn migrate_v1(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        BEGIN;

        CREATE TABLE IF NOT EXISTS environments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            variables TEXT NOT NULL DEFAULT '[]',
            is_global INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Add variables column to existing tables (safe: ALTER ADD is no-op if column exists in some SQLite builds,
        -- but we guard by checking schema_version)
        ALTER TABLE collections ADD COLUMN variables TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE folders ADD COLUMN variables TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE requests ADD COLUMN variables TEXT NOT NULL DEFAULT '[]';

        -- Seed global environment
        INSERT OR IGNORE INTO environments (id, name, variables, is_global, sort_order)
        VALUES ('global', 'Global', '[]', 1, 0);

        INSERT INTO schema_version (version) VALUES (2);

        COMMIT;
        ",
    )
    .map_err(|e| format!("Migration v1 failed: {}", e))?;

    Ok(())
}
