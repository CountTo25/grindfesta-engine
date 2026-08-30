use std::path::{Component, Path, PathBuf};
use std::process::Command;

use cancels::{BodyType, HyperErrorResponse, HyperResponse, Route, ServerState};
use services::App;

pub fn route() -> Option<Route<App>> {
    let root = asset_root()?;
    Some(Route::get("/*", move |state: ServerState<App>| {
        let root = root.clone();
        async move { serve_asset(&root, state).await }
    }))
}

pub fn use_binary_directory() {
    let Some(directory) = binary_directory() else {
        return;
    };
    if let Err(error) = std::env::set_current_dir(&directory) {
        eprintln!(
            "Could not use {} as the data directory: {error}",
            directory.display()
        );
    }
}

pub fn open_browser() {
    let url = format!("http://localhost:{}", *variables::var::API_PORT);
    println!("Grindfesta Engine: {url}");
    if std::env::var_os("GRINDFESTA_NO_OPEN").is_some() {
        return;
    }
    std::thread::spawn(move || {
        if let Err(error) = launch(&url) {
            eprintln!("Could not open the browser: {error}. Open {url} manually.");
        }
    });
}

async fn serve_asset(
    root: &Path,
    state: ServerState<App>,
) -> Result<HyperResponse, HyperErrorResponse> {
    let requested = state.route.get_argument("*").unwrap_or_default();
    let Some(relative) = safe_relative_path(&requested) else {
        return Ok(not_found());
    };
    let path = root.join(&relative);
    let Ok(content) = tokio::fs::read(&path).await else {
        return Ok(not_found());
    };
    let content_type = content_type(&path);
    let cache_control = if relative == Path::new("index.html") {
        "no-cache"
    } else {
        "public, max-age=31536000, immutable"
    };
    Ok(HyperResponse::new(BodyType::Bytes(content), 200)
        .header("Content-Type", content_type)
        .header("Cache-Control", cache_control))
}

fn asset_root() -> Option<PathBuf> {
    let root = binary_directory()?.join("frontend");
    root.join("index.html").is_file().then_some(root)
}

fn binary_directory() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()?
        .parent()
        .map(Path::to_path_buf)
}

fn safe_relative_path(requested: &str) -> Option<PathBuf> {
    let requested = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };
    let path = Path::new(requested);
    path.components()
        .all(|part| matches!(part, Component::Normal(_)))
        .then(|| path.to_path_buf())
}

fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some("css") => "text/css; charset=utf-8",
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("json") | Some("map") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("ico") => "image/x-icon",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("ttf") => "font/ttf",
        Some("wasm") => "application/wasm",
        _ => "application/octet-stream",
    }
}

fn not_found() -> HyperResponse {
    HyperResponse::new(BodyType::String("Not found".into()), 404)
        .header("Content-Type", "text/plain; charset=utf-8")
}

#[cfg(target_os = "windows")]
fn launch(url: &str) -> std::io::Result<()> {
    Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn()
        .map(|_| ())
}

#[cfg(target_os = "macos")]
fn launch(url: &str) -> std::io::Result<()> {
    Command::new("open").arg(url).spawn().map(|_| ())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn launch(url: &str) -> std::io::Result<()> {
    Command::new("xdg-open").arg(url).spawn().map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_accepts_relative_asset_paths() {
        assert_eq!(safe_relative_path(""), Some(PathBuf::from("index.html")));
        assert_eq!(
            safe_relative_path("assets/app.js"),
            Some(PathBuf::from("assets/app.js"))
        );
        assert_eq!(safe_relative_path("../db"), None);
        assert_eq!(safe_relative_path("/etc/passwd"), None);
    }

    #[test]
    fn serves_javascript_with_a_browser_mime_type() {
        assert_eq!(
            content_type(Path::new("app.js")),
            "text/javascript; charset=utf-8"
        );
    }
}
