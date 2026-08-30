use cancels::{Route, ServerState};
use serde::Deserialize;
use services::{App, ItemAutoUse};

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateItemRequest {
    name: String,
    description: String,
    capacity: Option<u32>,
    auto_use: Option<ItemAutoUse>,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/items", list_items),
        Route::post("/projects/:uuid/items", create_item),
        Route::put("/projects/:uuid/items/:itemUuid", update_item),
    ]
}

async fn update_item(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let item_uuid = state
        .route
        .get_argument("itemUuid")
        .ok_or_else(|| json_error("Item was not found.", 404))?;
    let request: CreateItemRequest = json_body(&state, "Item details are required.").await?;
    let item = state
        .shared
        .projects()
        .update_item(
            &project_uuid,
            &item_uuid,
            &request.name,
            &request.description,
            request.capacity,
            request.auto_use,
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(item).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn list_items(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let items = state
        .shared
        .projects()
        .list_items(&project_uuid)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(items).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_item(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: CreateItemRequest = json_body(&state, "Item details are required.").await?;
    let item = state
        .shared
        .projects()
        .create_item(
            &project_uuid,
            &request.name,
            &request.description,
            request.capacity,
            request.auto_use,
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(item).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}
