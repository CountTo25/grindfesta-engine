use cancels::{Route, ServerState};
use serde::Deserialize;
use services::App;

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
struct CreateLocationRequest {
    title: String,
    flavour: String,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/locations", list_locations),
        Route::post("/projects/:uuid/locations", create_location),
        Route::put("/projects/:uuid/locations/:locationUuid", update_location),
    ]
}

async fn update_location(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let location_uuid = state
        .route
        .get_argument("locationUuid")
        .ok_or_else(|| json_error("Location was not found.", 404))?;
    let request: CreateLocationRequest =
        json_body(&state, "Location details are required.").await?;
    let location = state
        .shared
        .projects()
        .update_location(
            &project_uuid,
            &location_uuid,
            &request.title,
            &request.flavour,
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(location).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn list_locations(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let locations = state
        .shared
        .projects()
        .list_locations(&project_uuid)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(locations).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_location(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: CreateLocationRequest =
        json_body(&state, "Location details are required.").await?;
    let location = state
        .shared
        .projects()
        .create_location(&project_uuid, &request.title, &request.flavour)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(location).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}
