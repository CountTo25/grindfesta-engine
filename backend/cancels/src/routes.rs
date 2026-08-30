use std::{collections::HashMap, fmt::Display, future::Future, sync::Arc};

use futures_util::future::BoxFuture;

use crate::{BeforeHook, HyperErrorResponse, HyperResponse, ServerState};
use url::form_urlencoded;

#[derive(Clone)]
pub struct Route<State: Send + Sync + 'static + Clone> {
    pub(crate) query_params: Vec<String>,
    pub(crate) query_metadata: HashMap<String, QueryMetadata>,
    pub(crate) display_path: String,
    pub(crate) method: hyper::http::Method,
    pub(crate) path: String,
    pub(crate) executor: Option<
        std::sync::Arc<
            Box<
                dyn Fn(
                        ServerState<State>,
                    )
                        -> BoxFuture<'static, Result<HyperResponse, HyperErrorResponse>>
                    + Send
                    + Sync,
            >,
        >,
    >,
    pub(crate) ws_authorizer: Option<
        std::sync::Arc<
            Box<
                dyn Fn(ServerState<State>) -> BoxFuture<'static, Result<String, HyperErrorResponse>>
                    + Send
                    + Sync,
            >,
        >,
    >,
    #[allow(dead_code)]
    pub(crate) is_ws: bool,
    /// Handle cancel request — i.e. cleanup checkout data
    /// Somehow it became option at some point? No idea
    pub(crate) on_cancel:
        Option<Arc<Box<dyn Fn(ServerState<State>) -> BoxFuture<'static, ()> + Send + Sync>>>,
    pub(crate) before_response_hooks: Vec<
        Arc<
            Box<
                dyn Fn(
                        ServerState<State>,
                        Result<HyperResponse, HyperErrorResponse>,
                    ) -> BoxFuture<'static, ()>
                    + Send
                    + Sync,
            >,
        >,
    >,
    pub(crate) before_handler_hooks: Vec<BeforeHook<State>>,
}

impl<T> Route<T>
where
    T: Send + Sync + 'static + Clone,
{
    pub(crate) fn check_query_param(&self, name: impl Display) -> Option<bool> {
        let name = name.to_string();
        if self.query_params.iter().find(|v| v == &&name).is_none() {
            return None;
        };

        self.query_metadata
            .get(&name)
            .map(|v| v.required)
            .or(Some(false))
    }

    pub fn authorize_ws(
        &self,
    ) -> Option<
        std::sync::Arc<
            Box<
                dyn Fn(ServerState<T>) -> BoxFuture<'static, Result<String, HyperErrorResponse>>
                    + Send
                    + Sync,
            >,
        >,
    > {
        self.ws_authorizer.clone()
    }

    pub fn get_path(&self) -> String {
        self.display_path.clone()
    }

    pub(crate) fn rebuild_display_url(&mut self) {
        self.display_path =
            Navigable::bake_display_url(&self.query_metadata, &self.query_params, &self.path);
    }
}

use std::fmt;

impl<State: Send + Sync + 'static + Clone> fmt::Debug for Route<State> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Route")
            .field("method", &self.method)
            .field("path", &self.path)
            .finish()
    }
}

pub struct RouteGroup<State: Send + Sync + 'static + Clone> {
    pub(crate) prefix: Option<String>,
    pub(crate) routes: Vec<Route<State>>,
}

impl<T: Send + Sync + 'static + Clone> RouteGroup<T> {
    pub fn prefix(mut self, prefix: impl Display) -> Self {
        self.prefix = Some(prefix.to_string());
        self
    }
    pub fn new(v: impl IntoIterator<Item = Route<T>>) -> Self {
        Self {
            prefix: None,
            routes: v.into_iter().collect(),
        }
    }

    pub fn as_vec(self) -> Vec<Route<T>> {
        self.routes
            .into_iter()
            .map(|r| maybe_add_prefix(self.prefix.clone())(r))
            .collect()
    }

    pub fn with_prefix(prefix: impl Display, routes: impl IntoIterator<Item = Route<T>>) -> Self {
        Self::new(routes).prefix(prefix)
    }
}

#[derive(Clone, Debug)]
pub struct QueryMetadata {
    pub kind: String,
    pub required: bool,
}

pub struct Navigable {
    pub path: String,
    pub query_metadata: HashMap<String, QueryMetadata>,
    pub query_params: Vec<String>,
    pub(crate) display_path: String,
}

impl Navigable {
    pub fn with_meta(path: impl Display, metadata: HashMap<String, QueryMetadata>) -> Self {
        let path = path.to_string();
        let query_params = Self::extract_params(&path);
        let path = path.split("?").map(String::from).collect::<Vec<_>>();
        let path = path.get(0).cloned().unwrap();
        Self {
            display_path: Self::bake_display_url(&metadata, &query_params, &path),
            query_metadata: metadata,
            path,
            query_params,
        }
    }

    fn extract_params(path: &String) -> Vec<String> {
        let mut query_params = Vec::new();
        let parts = path.split("?").map(String::from).collect::<Vec<_>>();
        let params = parts.get(1).cloned();
        if let Some(params) = params {
            query_params.extend(
                params
                    .split("&")
                    .map(|v| v.replace("<", "").replace(">", ""))
                    .collect::<Vec<_>>(),
            );
        }
        query_params
    }

    fn bake_display_url(
        query_metadata: &HashMap<String, QueryMetadata>,
        query_params: &Vec<String>,
        path: &String,
    ) -> String {
        let display_query = query_params
            .iter()
            .map(String::from)
            .map(|v| {
                format!(
                    "<{v}{}>",
                    if let Some(meta) = query_metadata.get(&v) {
                        format!(":{}{}", meta.kind, if !meta.required { "?" } else { "" })
                    } else {
                        String::new()
                    }
                )
            })
            .collect::<Vec<_>>()
            .join("&");
        format!(
            "{path}{}{display_query}",
            if display_query.len() > 0 { "?" } else { "" }
        )
    }
}

impl<T: Display> From<T> for Navigable {
    fn from(value: T) -> Self {
        let path = value.to_string();
        let query_params = Self::extract_params(&path);
        let parts = path.split("?").map(String::from).collect::<Vec<_>>();
        let path = parts.get(0).cloned().unwrap();
        let query_metadata = HashMap::<String, QueryMetadata>::new();
        let display_path = Navigable::bake_display_url(&query_metadata, &query_params, &path);
        Self {
            display_path,
            query_metadata,
            path,
            query_params,
        }
    }
}

impl<State: Send + Sync + 'static + Clone> Route<State> {
    pub fn get<Fut: Future<Output = Result<HyperResponse, HyperErrorResponse>> + Send + 'static>(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_params,
            query_metadata,
            on_cancel: None,
            display_path,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::GET,
            path,
            is_ws: false,
            ws_authorizer: None,
            executor: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            before_handler_hooks: Vec::new(),
        }
    }
    pub fn post<
        Fut: Future<Output = Result<HyperResponse, HyperErrorResponse>> + Send + 'static,
    >(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_metadata,
            display_path,
            query_params,
            on_cancel: None,
            is_ws: false,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::POST,
            path,
            ws_authorizer: None,
            executor: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            before_handler_hooks: Vec::new(),
        }
    }
    pub fn ws<Fut: Future<Output = Result<String, HyperErrorResponse>> + Send + 'static>(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_metadata,
            display_path,
            query_params,
            on_cancel: None,
            is_ws: true,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::GET,
            path,
            ws_authorizer: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            executor: None,
            before_handler_hooks: Vec::new(),
        }
    }

    pub fn head<
        Fut: Future<Output = Result<HyperResponse, HyperErrorResponse>> + Send + 'static,
    >(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_metadata,
            display_path,
            query_params,
            on_cancel: None,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::HEAD,
            path,
            is_ws: false,
            ws_authorizer: None,
            executor: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            before_handler_hooks: Vec::new(),
        }
    }
    pub fn delete<
        Fut: Future<Output = Result<HyperResponse, HyperErrorResponse>> + Send + 'static,
    >(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_metadata,
            display_path,
            query_params,
            on_cancel: None,
            is_ws: false,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::DELETE,
            path,
            executor: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            ws_authorizer: None,
            before_handler_hooks: Vec::new(),
        }
    }
    pub fn put<Fut: Future<Output = Result<HyperResponse, HyperErrorResponse>> + Send + 'static>(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_metadata,
            display_path,
            query_params,
            on_cancel: None,
            is_ws: false,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::PUT,
            path,
            executor: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            ws_authorizer: None,
            before_handler_hooks: Vec::new(),
        }
    }
    pub fn options<
        Fut: Future<Output = Result<HyperResponse, HyperErrorResponse>> + Send + 'static,
    >(
        path: impl Into<Navigable>,
        executor: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        let Navigable {
            path,
            query_metadata,
            query_params,
            display_path,
        } = path.into();
        Self {
            query_metadata,
            display_path,
            query_params,
            on_cancel: None,
            is_ws: false,
            before_response_hooks: Vec::new(),
            method: hyper::http::Method::OPTIONS,
            path,
            executor: Some(Arc::new(Box::new(move |x| Box::pin(executor(x))))),
            ws_authorizer: None,
            before_handler_hooks: Vec::new(),
        }
    }

    pub fn on_cancel<Fut: Future<Output = ()> + Send + 'static>(
        mut self,
        on_cancel: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        self.on_cancel = Some(Arc::new(Box::new(move |x| Box::pin(on_cancel(x)))));
        self
    }
    pub fn before_response<Fut: Future<Output = ()> + Send + 'static>(
        mut self,
        before_response: impl Fn(ServerState<State>, Result<HyperResponse, HyperErrorResponse>) -> Fut
            + 'static
            + Send
            + Sync,
    ) -> Self {
        self.before_response_hooks
            .push(Arc::new(Box::new(move |x, res| {
                Box::pin(before_response(x, res))
            })));
        self
    }
    pub fn before_handler(mut self, hook: impl Into<BeforeHook<State>>) -> Self {
        let hook: BeforeHook<State> = hook.into();
        self.before_handler_hooks.push(hook);
        self
    }
}
use std::cmp::Reverse;

pub(crate) fn find_route<'t, T: Send + Sync + 'static + Clone>(
    routes: Arc<Vec<Route<T>>>,
    uri: &hyper::http::Uri,
    method: &hyper::http::Method,
) -> Option<(Route<T>, Vec<(String, String)>)> {
    let mut candidates: Vec<_> = routes
        .iter()
        .filter(|r| r.method == method)
        .map(|r| {
            let route_segments: Vec<_> = r.path.split('/').filter(|r| !r.is_empty()).collect();
            let uri_segments: Vec<_> = uri.path().split('/').filter(|r| !r.is_empty()).collect();
            let static_count = route_segments
                .iter()
                .filter(|seg| {
                    !seg.starts_with(':')
                        && !(seg.starts_with('<') && seg.ends_with('>'))
                        && *seg != &"*"
                })
                .count();
            (r, route_segments, uri_segments, static_count)
        })
        .filter(|(_, route_segments, uri_segments, _)| {
            if route_segments.contains(&"*") {
                uri_segments.len() >= route_segments.len().saturating_sub(1)
            } else {
                route_segments.len() == uri_segments.len()
            }
        })
        .collect();

    candidates.sort_by_key(|(_, _, _, static_count)| Reverse(*static_count));

    for (route, route_segments, uri_segments, _) in candidates {
        let mut params = Vec::new();
        let mut is_match = true;

        for (r_seg, u_seg) in route_segments.iter().zip(uri_segments.iter()) {
            if *r_seg == "*" {
                let idx = route_segments.iter().position(|s| s == r_seg).unwrap();
                let tail = uri_segments[idx..].join("/");
                params.push(("*".to_string(), tail));
                break;
            } else if r_seg.starts_with(':') {
                params.push((r_seg[1..].to_string(), u_seg.to_string()));
            } else if r_seg != u_seg {
                is_match = false;
                break;
            }
        }

        if is_match {
            let query_params: Vec<(String, String)> = uri
                .query()
                .map(|q| form_urlencoded::parse(q.as_bytes()).into_owned().collect())
                .unwrap_or_default();
            for param in route.query_params.iter() {
                let required = route.check_query_param(param);
                if Some(true) == required && query_params.iter().all(|(name, _)| name != param) {
                    is_match = false;
                    break;
                }
                for (name, value) in query_params.iter().filter(|(n, _)| n == param) {
                    params.push((name.clone(), value.clone()));
                }
            }
        }

        if is_match {
            return Some((route.clone(), params));
        }
    }

    None
}

fn add_leading_slash<T: Send + Sync + Clone + 'static>(mut route: Route<T>) -> Route<T> {
    if route.path.starts_with("/") {
        return route;
    };
    route.path = format!("/{}", route.path);
    route
}

pub struct AttacheableRoutes<T: Send + Sync + Clone + 'static> {
    pub(crate) routes: Vec<Route<T>>,
}

impl<T: Send + Sync + Clone + 'static> From<Route<T>> for AttacheableRoutes<T> {
    fn from(value: Route<T>) -> Self {
        Self {
            routes: vec![add_leading_slash(value)],
        }
    }
}
impl<T: Send + Sync + Clone + 'static> From<RouteGroup<T>> for AttacheableRoutes<T> {
    fn from(value: RouteGroup<T>) -> Self {
        Self {
            routes: value
                .routes
                .into_iter()
                .map(add_leading_slash)
                .map(maybe_add_prefix(value.prefix))
                .collect(),
        }
    }
}

fn maybe_add_prefix<T: Send + Sync + Clone + 'static>(
    prefix: Option<String>,
) -> impl Fn(Route<T>) -> Route<T> {
    move |mut route| {
        if let Some(mut prefix) = prefix.clone() {
            if !prefix.starts_with("/") {
                prefix = format!("/{prefix}");
            }
            if prefix.ends_with("/") {
                prefix.remove(prefix.chars().count() - 1);
            }
            route.path = format!("{prefix}{}", route.path);
            route.rebuild_display_url();
            route
        } else {
            route
        }
    }
}
