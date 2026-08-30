use cancels::{Route, ServerState};
use services::{App, BuildReporter};
use tokio::sync::mpsc;

use crate::common::{json_error, project_error, route_project_uuid};

pub(crate) fn all() -> Vec<Route<App>> {
    vec![
        Route::post("/projects/:uuid/compile", compile_project),
        Route::ws("/projects/:uuid/build-events", build_events),
    ]
}

async fn build_events(state: ServerState<App>) -> Result<String, cancels::HyperErrorResponse> {
    Ok(build_channel(&route_project_uuid(&state)?))
}

async fn compile_project(
    state: ServerState<App>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    let project_uuid = route_project_uuid(&state)?;
    let channel = build_channel(&project_uuid);
    let sockets = state.socket_container.clone();
    let (sender, mut receiver) = mpsc::unbounded_channel();
    let reporter = BuildReporter::new(sender);
    let forwarder = tokio::spawn(async move {
        while let Some(event) = receiver.recv().await {
            if let Ok(message) = serde_json::to_string(&event) {
                let _ = sockets.send_to(&channel, message).await;
            }
        }
    });
    let result = state
        .shared
        .compile_project(&project_uuid, reporter.clone())
        .await;
    if let Err(error) = &result {
        reporter.failed("build", error.to_string());
    }
    drop(reporter);
    let _ = forwarder.await;
    let compiled = result.map_err(project_error)?;
    let response =
        serde_json::to_value(compiled).map_err(|error| json_error(error.to_string(), 500))?;
    Ok(cancels::HyperResponse::from(response).status(201))
}

fn build_channel(project_uuid: &str) -> String {
    format!("project-build:{project_uuid}")
}
