use sqlx::SqlitePool;

const GET_CONFIG_VALUE: &str = include_str!("../../sql/get_config_value.sql");

pub async fn get_value(pool: &SqlitePool, key: &str) -> Result<String, sqlx::Error> {
    sqlx::query_scalar(GET_CONFIG_VALUE)
        .bind(key)
        .fetch_one(pool)
        .await
}
