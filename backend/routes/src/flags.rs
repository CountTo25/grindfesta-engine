use cancels::{Route, ServerState};
use serde::Deserialize;
use services::{App, FlagValueType};

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateFlagRequest {
    name: String,
    value_type: FlagValueType,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/flags", list_flags),
        Route::post("/projects/:uuid/flags", create_flag),
        Route::put("/projects/:uuid/flags/:flagUuid", update_flag),
    ]
}

async fn update_flag(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let flag_uuid = state
        .route
        .get_argument("flagUuid")
        .ok_or_else(|| json_error("Flag was not found.", 404))?;
    let request: CreateFlagRequest = json_body(&state, "Flag details are required.").await?;
    let flag = state
        .shared
        .projects()
        .update_flag(&project_uuid, &flag_uuid, &request.name, request.value_type)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(flag).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn list_flags(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let flags = state
        .shared
        .projects()
        .list_flags(&project_uuid)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(flags).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_flag(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: CreateFlagRequest = json_body(&state, "Flag details are required.").await?;
    let flag = state
        .shared
        .projects()
        .create_flag(&project_uuid, &request.name, request.value_type)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(flag).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}
