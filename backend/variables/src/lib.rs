#[environment::load]
pub mod var {
    const API_PORT: u16 = 9002;
    const SVELTE_PORT: u16 = 5173;
    const SQLITE_FILENAME: String = "db";
}
