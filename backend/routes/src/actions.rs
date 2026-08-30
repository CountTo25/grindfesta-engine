use cancels::{Route, ServerState};
use serde::Deserialize;
use services::{ActionCondition, ActionEffect, ActionRevealCondition, App};

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActionRequest {
    title: String,
    flavour: String,
    weight: f64,
    #[serde(default)]
    repeatable: bool,
    #[serde(default)]
    stop_on_repeat: bool,
    required_skill: String,
    condition_join: Option<String>,
    #[serde(default)]
    conditions: Vec<ActionCondition>,
    #[serde(default)]
    reveal_conditions: Vec<ActionRevealCondition>,
    #[serde(default)]
    completion_effects: Vec<ActionEffect>,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/actions", list_actions),
        Route::post("/projects/:uuid/actions", create_action),
        Route::put("/projects/:uuid/actions/:actionUuid", update_action),
    ]
}

async fn list_actions(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let actions = state
        .shared
        .projects()
        .list_actions(&project_uuid)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(actions).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_action(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: ActionRequest = json_body(&state, "Action details are required.").await?;
    let action = state
        .shared
        .projects()
        .create_action(
            &project_uuid,
            &request.title,
            &request.flavour,
            request.weight,
            request.repeatable,
            request.stop_on_repeat,
            &request.required_skill,
            request.condition_join.as_deref().unwrap_or("and"),
            request.conditions,
            request.reveal_conditions,
            request.completion_effects,
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(action).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}

async fn update_action(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let action_uuid = state
        .route
        .get_argument("actionUuid")
        .ok_or_else(|| json_error("Action was not found.", 404))?;
    let request: ActionRequest = json_body(&state, "Action details are required.").await?;
    let action = state
        .shared
        .projects()
        .update_action(
            &project_uuid,
            &action_uuid,
            &request.title,
            &request.flavour,
            request.weight,
            request.repeatable,
            request.stop_on_repeat,
            &request.required_skill,
            request.condition_join.as_deref().unwrap_or("and"),
            request.conditions,
            request.reveal_conditions,
            request.completion_effects,
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(action).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}
