use std::sync::Arc;

use hyper::{Method, Uri};

use crate::routes::{find_route, Route};
use crate::HyperResponse;

fn response_route(path: &str) -> Route<()> {
    Route::get(path.to_string(), |_| async {
        Ok(HyperResponse::from("ok"))
    })
}

#[test]
fn wildcard_requires_its_fixed_prefix() {
    let routes = Arc::new(vec![response_route("/projects/:uuid/game/*")]);
    let uri = Uri::from_static("/projects");

    assert!(find_route(routes, &uri, &Method::GET).is_none());
}

#[test]
fn wildcard_accepts_a_path_after_its_fixed_prefix() {
    let routes = Arc::new(vec![response_route("/projects/:uuid/game/*")]);
    let uri = Uri::from_static("/projects/123/game/assets/app.js");

    let (_, arguments) = find_route(routes, &uri, &Method::GET).expect("route should match");
    assert_eq!(
        arguments,
        vec![
            ("uuid".into(), "123".into()),
            ("*".into(), "assets/app.js".into())
        ]
    );
}
