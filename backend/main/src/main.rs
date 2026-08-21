use cancels::RouteGroup;

#[tokio::main]
async fn main() {
    variables::var::init();
    let app = services::App::new().await;
    let server = cancels::HyperServer::state(app)
        .port(*variables::var::API_PORT)
        .route(RouteGroup::new(routes::all()))
        .start(None);

    server.await;
}
