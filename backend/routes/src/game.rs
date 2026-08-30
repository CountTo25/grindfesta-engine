use std::path::{Component, Path};

use cancels::{BodyType, Route, ServerState};
use services::App;
use tokio::fs;

use crate::common::{json_error, project_error, route_project_uuid};

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/shippable", download_shippable),
        Route::get("/projects/:uuid/game", serve_game),
        Route::get("/projects/:uuid/game/*", serve_game),
    ]
}

async fn download_shippable(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let archive = state
        .shared
        .shippable_archive(&project_uuid)
        .await
        .map_err(project_error)?;
    Ok(
        cancels::HyperResponse::new(BodyType::Bytes(archive.bytes), 200)
            .header("content-type", "application/zip")
            .header(
                "content-disposition",
                format!("attachment; filename=\"{}\"", archive.filename),
            )
            .header("cache-control", "no-store"),
    )
}

async fn serve_game(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let requested = state
        .route
        .get_argument("*")
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "index.html".into());
    if !safe_relative_path(&requested) {
        return Err(json_error("Game artifact was not found.", 404));
    }
    let project_dir = state
        .shared
        .projects()
        .project_dir(&project_uuid)
        .await
        .map_err(project_error)?;
    let artifact = project_dir.join("generated/dist").join(&requested);
    let bytes = fs::read(&artifact)
        .await
        .map_err(|_| json_error("Build the project before launching it.", 404))?;
    Ok(cancels::HyperResponse::new(BodyType::Bytes(bytes), 200)
        .header("content-type", content_type(&artifact))
        .header("cache-control", "no-cache"))
}

fn safe_relative_path(path: &str) -> bool {
    !path.contains('\\')
        && Path::new(path)
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
}

fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some("css") => "text/css; charset=utf-8",
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        _ => "application/octet-stream",
    }
}
