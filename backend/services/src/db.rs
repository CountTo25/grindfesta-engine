use std::time::Duration;

use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
};

pub async fn get_pool() -> SqlitePool {
    let connect_options = SqliteConnectOptions::new()
        .filename(variables::var::SQLITE_FILENAME.clone())
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .connect_with(connect_options)
        .await
        .expect("failed to make or open sqlite database, aborting");
    sqlx::migrate!("../migrations")
        .run(&pool)
        .await
        .expect("failed to migrate");
    pool
}
