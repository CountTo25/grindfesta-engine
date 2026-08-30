mod editor;

use cancels::RouteGroup;

#[tokio::main]
async fn main() {
    variables::var::init();
    let editor_route = editor::route();
    let packaged = editor_route.is_some();
    if packaged {
        editor::use_binary_directory();
    }

    let app = services::App::new().await;
    let mut app_routes = routes::all();
    if let Some(route) = editor_route {
        app_routes.push(route);
    }
    let server = cancels::HyperServer::state(app)
        .port(*variables::var::API_PORT)
        .route(RouteGroup::new(app_routes))
        .start(packaged.then_some(editor::open_browser as fn()));

    server.await;
}
