use cancels::{Route, ServerState};

pub fn all<State: Send + Sync + Clone + 'static>() -> Vec<Route<State>> {
    vec![
        Route::get("/ping", ping::<State>),
        Route::get("/health", health::<State>),
    ]
}

async fn ping<State: Send + Sync + Clone + 'static>(
    _state: ServerState<State>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    Ok("pong".into())
}

async fn health<State: Send + Sync + Clone + 'static>(
    _state: ServerState<State>,
) -> Result<cancels::HyperResponse, cancels::HyperErrorResponse> {
    Ok("ok".into())
}
