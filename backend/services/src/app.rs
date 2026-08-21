// * Adding new dependencies
//   Whenever you need to add something global — add a field
//   Then add a new service to keep this file clean and organized
//   If service cannot be cloned out of the box — Arc it and RwLock if needed

#[derive(Clone)]
pub struct App {
    pool: sqlx::SqlitePool,
}

impl App {
    pub async fn new() -> Self {
        let pool = crate::db::get_pool().await;
        App { pool }
    }

    pub fn get_pool(&self) -> &sqlx::SqlitePool {
        &self.pool
    }
}
