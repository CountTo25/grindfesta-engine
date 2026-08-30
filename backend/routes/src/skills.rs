use cancels::{Route, ServerState};
use serde::Deserialize;
use services::App;

use crate::common::{json_body, json_error, project_error, route_project_uuid};

#[derive(Deserialize)]
struct SkillRequest {
    name: String,
    icon: Option<String>,
}

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/projects/:uuid/skills", list_skills),
        Route::post("/projects/:uuid/skills", create_skill),
        Route::put("/projects/:uuid/skills/:skillUuid", update_skill),
    ]
}

async fn list_skills(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let skills = state
        .shared
        .projects()
        .list_skills(&project_uuid)
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(skills).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}

async fn create_skill(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let request: SkillRequest = json_body(&state, "Skill details are required.").await?;
    let skill = state
        .shared
        .projects()
        .create_skill(
            &project_uuid,
            &request.name,
            request.icon.as_deref().unwrap_or(""),
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(skill).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}

async fn update_skill(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let skill_uuid = state
        .route
        .get_argument("skillUuid")
        .ok_or_else(|| json_error("Skill was not found.", 404))?;
    let request: SkillRequest = json_body(&state, "Skill details are required.").await?;
    let skill = state
        .shared
        .projects()
        .update_skill(
            &project_uuid,
            &skill_uuid,
            &request.name,
            request.icon.as_deref(),
        )
        .await
        .map_err(project_error)?;
    let response =
        serde_json::to_value(skill).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}
