use cancels::ServerState;
use serde::de::DeserializeOwned;
use services::{App, ProjectError};

pub(crate) async fn json_body<Value: DeserializeOwned>(
    state: &ServerState<App>,
    invalid_message: &str,
) -> Result<Value, cancels::HyperErrorResponse> {
    let body = state
        .get_body_bytes()
        .await
        .map_err(|error| json_error(error.to_string(), 500))?
        .unwrap_or_default();
    serde_json::from_slice(&body).map_err(|_| json_error(invalid_message, 400))
}

pub(crate) fn route_project_uuid(
    state: &ServerState<App>,
) -> Result<String, cancels::HyperErrorResponse> {
    state
        .route
        .get_argument("uuid")
        .ok_or_else(|| json_error("Project was not found.", 404))
}

pub(crate) fn project_error(error: ProjectError) -> cancels::HyperErrorResponse {
    let status = match error {
        ProjectError::InvalidInput(_) => 400,
        ProjectError::AlreadyExists => 409,
        ProjectError::NotFound => 404,
        ProjectError::Internal(_) => 500,
    };
    json_error(error.to_string(), status)
}

pub(crate) fn json_error(message: impl ToString, status: u16) -> cancels::HyperErrorResponse {
    cancels::HyperResponse::from(serde_json::json!({ "error": message.to_string() })).status(status)
}
