use cancels::{Route, ServerState};
use services::App;

use crate::common::json_error;

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::get("/ping", ping),
        Route::get("/health", health),
        Route::get("/dependencies", dependencies),
    ]
}

async fn ping(
    _state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    Ok("pong".into())
}

async fn health(
    _state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    Ok("ok".into())
}

async fn dependencies(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let report = state
        .shared
        .check_dependencies()
        .await
        .map_err(|error| json_error(error, 500))?;
    let response =
        serde_json::to_value(report).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(response.into())
}
