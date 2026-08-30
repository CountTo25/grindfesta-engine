use cancels::{Route, ServerState};
use serde::Deserialize;
use services::App;

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateIconLibraryRequest {
    source_url: Option<String>,
    css_content: Option<String>,
    file_name: Option<String>,
    #[serde(default)]
    prefix: String,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/icon-libraries", list_icon_libraries),
        Route::post("/projects/:uuid/icon-libraries", create_icon_library),
    ]
}

async fn list_icon_libraries(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let libraries = state
        .shared
        .list_icon_libraries(&project_uuid)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(libraries).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_icon_library(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: CreateIconLibraryRequest =
        json_body(&state, "Icon library details are required.").await?;
    let library = state
        .shared
        .create_icon_library(
            &project_uuid,
            request.source_url.as_deref(),
            request.css_content.as_deref(),
            request.file_name.as_deref(),
            &request.prefix,
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(library).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}
