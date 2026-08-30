use cancels::{Route, ServerState};
use serde::Deserialize;
use services::{App, EngineVariables, UiControls, UiThemeVariables};

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectRequest {
    name: String,
    description: String,
    #[serde(alias = "ui_component")]
    ui_component: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProjectUiRequest {
    controls: UiControls,
    #[serde(default)]
    variables: UiThemeVariables,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects", list_projects),
        Route::post("/projects", create_project),
        Route::put("/projects/:uuid/ui", update_project_ui),
        Route::put(
            "/projects/:uuid/engine-variables",
            update_project_engine_variables,
        ),
    ]
}

async fn update_project_engine_variables(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let variables: EngineVariables = json_body(&state, "Engine variables are required.").await?;
    let project = state
        .shared
        .projects()
        .update_engine_variables(&project_uuid, variables)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(project).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn update_project_ui(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: UpdateProjectUiRequest = json_body(&state, "UI settings are required.").await?;
    let project = state
        .shared
        .projects()
        .update_ui(&project_uuid, request.controls, request.variables)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(project).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn list_projects(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let projects = state
        .shared
        .projects()
        .list()
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(projects).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_project(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let request: CreateProjectRequest = json_body(&state, "Project details are required.").await?;
    let project = state
        .shared
        .projects()
        .create(&request.name, &request.description, &request.ui_component)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(project).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}
