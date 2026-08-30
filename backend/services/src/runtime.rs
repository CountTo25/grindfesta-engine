use std::path::PathBuf;

pub(crate) fn resolve_command(command: &str) -> PathBuf {
    if command != "bun" {
        return PathBuf::from(command);
    }
    let Some(binary_dir) = std::env::current_exe()
        .ok()
        .and_then(|binary| binary.parent().map(|parent| parent.to_path_buf()))
    else {
        return PathBuf::from(command);
    };
    let bundled = binary_dir.join("runtime").join(bun_executable());
    bundled
        .is_file()
        .then_some(bundled)
        .unwrap_or_else(|| PathBuf::from(command))
}

#[cfg(target_os = "windows")]
fn bun_executable() -> &'static str {
    "bun.exe"
}

#[cfg(not(target_os = "windows"))]
fn bun_executable() -> &'static str {
    "bun"
}
