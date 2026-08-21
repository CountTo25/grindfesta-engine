pub mod routes;
use colored::Colorize;
use futures_util::{future::BoxFuture, stream::SplitSink, SinkExt, StreamExt};
pub use hyper::http::request::Parts;
use hyper::{
    body::{Bytes, HttpBody},
    header::{self, HeaderValue},
    http::response::Builder,
    server::accept::Accept,
    service::{make_service_fn, service_fn},
    Body, HeaderMap, Request, Response, StatusCode,
};
use hyper_tungstenite::{
    tungstenite::{Error as SocketError, Message},
    HyperWebsocket,
};
use routes::*;
pub use routes::{Route, RouteGroup};
use std::{
    collections::HashMap,
    convert::Infallible,
    fmt::Display,
    future::Future,
    marker::PhantomData,
    net::SocketAddr,
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};
use tokio::{
    io::{AsyncRead, AsyncWrite, ReadBuf},
    net::{TcpListener, TcpStream},
    sync::RwLock,
    task::JoinHandle,
};
use tokio_util::sync::CancellationToken;

struct ServerListener(TcpListener);

struct ClientConnection {
    conn: TcpStream,
    cancel: CancellationToken,
}

impl Drop for ClientConnection {
    fn drop(&mut self) {
        self.cancel.cancel()
    }
}

pub type HyperOutcome = Result<HyperResponse, HyperErrorResponse>;

impl AsyncRead for ClientConnection {
    fn poll_read(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<tokio::io::Result<()>> {
        Pin::new(&mut Pin::into_inner(self).conn).poll_read(context, buf)
    }
}

impl AsyncWrite for ClientConnection {
    fn poll_write(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<Result<usize, tokio::io::Error>> {
        Pin::new(&mut Pin::into_inner(self).conn).poll_write(context, buf)
    }

    fn poll_flush(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<Result<(), tokio::io::Error>> {
        Pin::new(&mut Pin::into_inner(self).conn).poll_flush(context)
    }

    fn poll_shutdown(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<Result<(), tokio::io::Error>> {
        Pin::new(&mut Pin::into_inner(self).conn).poll_shutdown(context)
    }
}

impl Accept for ServerListener {
    type Conn = ClientConnection;
    type Error = std::io::Error;
    fn poll_accept(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Result<Self::Conn, Self::Error>>> {
        let (conn, _addr) = futures_util::ready!(self.0.poll_accept(cx))?;
        Poll::Ready(Some(Ok(ClientConnection {
            conn,
            cancel: CancellationToken::new(),
        })))
    }
}

pub struct HyperServer<T: Send + Sync + 'static> {
    _m: PhantomData<T>,
}

pub struct ServerBuilder<State: Send + Sync + 'static + Clone> {
    state: State,
    routes: Vec<Route<State>>,
    cfg: ServerCfg,
    socket_listeners: Option<SocketContainer>,
    before_handler_hooks: Vec<BeforeHook<State>>,
    before_response_hooks: Vec<
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
}

#[derive(Clone)]
pub struct BeforeHook<State: Clone + Send + Sync + 'static> {
    title: Option<String>,
    effect:
        Arc<Box<dyn Fn(ServerState<State>) -> BoxFuture<'static, BeforeHookOutcome> + Send + Sync>>,
    setup: Option<
        Arc<
            Box<
                dyn Fn(Route<State>, State) -> BoxFuture<'static, Result<(), String>> + Send + Sync,
            >,
        >,
    >,
}

#[derive(Clone)]
pub enum BeforeHookOutcome {
    Continue,
    Cancel(HyperResponse),
}

impl<State: Clone + Send + Sync + 'static> BeforeHook<State> {
    pub fn new<Fut: Future<Output = BeforeHookOutcome> + Send + Sync + 'static>(
        title: impl Display,
        effect: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
    ) -> Self {
        Self {
            title: Some(title.to_string()),
            effect: Arc::new(Box::new(move |x| Box::pin(effect(x)))),
            setup: None,
        }
    }

    pub fn with_setup<
        Fut: Future<Output = BeforeHookOutcome> + Send + Sync + 'static,
        SetupFut: Future<Output = Result<(), String>> + Send + Sync + 'static,
    >(
        title: impl Display,
        effect: impl Fn(ServerState<State>) -> Fut + 'static + Send + Sync,
        setup: impl Fn(Route<State>, State) -> SetupFut + 'static + Send + Sync,
    ) -> Self {
        Self {
            title: Some(title.to_string()),
            effect: Arc::new(Box::new(move |x| Box::pin(effect(x)))),
            setup: Some(Arc::new(Box::new(move |x, y| Box::pin(setup(x, y))))),
        }
    }
}

impl<
        State: Clone + Send + Sync + 'static,
        Fut: Future<Output = BeforeHookOutcome> + Send + Sync + 'static,
        FnFut: (Fn(ServerState<State>) -> Fut) + Send + Sync + 'static,
    > From<FnFut> for BeforeHook<State>
{
    fn from(value: FnFut) -> Self {
        Self {
            title: None,
            effect: Arc::new(Box::new(move |x| Box::pin((value)(x)))),
            setup: None,
        }
    }
}

impl<State: Send + Sync + 'static + Clone> ServerBuilder<State> {
    pub fn route(mut self, route: impl Into<AttacheableRoutes<State>>) -> Self {
        let mut to_attach: AttacheableRoutes<_> = route.into();
        self.routes.append(&mut to_attach.routes);
        self
    }

    ///Attaches global before_handler hook to all routes
    pub fn before_handler(mut self, hook: impl Into<BeforeHook<State>>) -> Self {
        let hook: BeforeHook<State> = hook.into();
        self.before_handler_hooks.push(hook);
        self
    }
    pub fn before_response<Fut: Future<Output = ()> + Send + 'static>(
        mut self,
        hook: impl Fn(ServerState<State>, HyperOutcome) -> Fut + 'static + Send + Sync,
    ) -> Self {
        self.before_response_hooks
            .push(Arc::new(Box::new(move |x, y| Box::pin(hook(x, y)))));
        self
    }

    pub fn max_request_size(mut self, size: u64) -> Self {
        self.cfg.max_request_size = size;
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.cfg.port = Some(port);
        self
    }

    pub fn ip(mut self, addr: [u8; 4]) -> Self {
        self.cfg.ip = Some(addr);
        self
    }

    pub fn connect_sockets(mut self, sockets: &SocketContainer) -> Self {
        self.socket_listeners = Some(sockets.clone());
        self
    }

    pub async fn start(self, on_liftoff: Option<fn()>) {
        let width = termsize::get().map(|size| size.cols).unwrap_or(0) as usize;
        println!(
            "{:<width$}",
            "        Starting hyper-based server...".black().on_white(),
            width = width
        );
        let address = SocketAddr::from((
            self.cfg.ip.unwrap_or([127, 0, 0, 1]),
            self.cfg.port.unwrap_or(8083),
        ));
        let str_address = address.to_string();
        let listener = match TcpListener::bind(address).await {
            Ok(l) => l,
            Err(e) => {
                println!(
                    "{}{}{:<width$}",
                    "        Failed to start server: ".black().on_red(),
                    e.to_string().black().on_red(),
                    "".on_red(),
                    width = width
                );
                return;
            }
        };

        println!("  Obtained listener @ {str_address}");
        if self.routes.is_empty() {
            println!(
                "{:<width$}",
                "        Failed to start server: no routes are supplied to builder"
                    .black()
                    .on_red(),
                width = width
            );
            return;
        }
        println!("  Mounting {} routes:", self.routes.len());
        for route in &self.routes {
            let mut base_msg = format!(
                "      {: >10} {}",
                route.method.to_string().green(),
                route.display_path
            );
            if route.on_cancel.is_some() {
                base_msg = format!("{base_msg} | handles cancel")
            }

            for setup in self
                .before_handler_hooks
                .iter()
                .chain(route.before_handler_hooks.iter())
                .filter_map(|s| s.setup.clone())
            {
                if let Err(e) = setup(route.clone(), self.state.clone()).await {
                    println!(
                        "{}{}{:<width$}",
                        "        Failed to start server during hook setup: "
                            .black()
                            .on_red(),
                        e.to_string().black().on_red(),
                        "".on_red(),
                        width = width
                    );
                    return;
                };
            }

            println!("{base_msg}");
            if self.before_handler_hooks.len() > 0
                || route.before_handler_hooks.len() > 0
                || self.before_response_hooks.len() > 0
                || route.before_response_hooks.len() > 0
            {
                //for now non-transparent map, just let us know if there's a hook
                //add an option for named ones so its easier to track
                println!(
                    "      {: >10} {} -> {} -> {}",
                    " ",
                    self.before_handler_hooks
                        .iter()
                        .chain(route.before_handler_hooks.iter())
                        .map(|h| h.title.clone().unwrap_or(String::from("(anon hook)")))
                        .collect::<Vec<_>>()
                        .join(" | "),
                    route.display_path.green(),
                    self.before_response_hooks
                        .iter()
                        .chain(route.before_response_hooks.iter())
                        .map(|_| "(anon hook)")
                        .collect::<Vec<_>>()
                        .join(" | ")
                );
            }
        }
        let routes = std::sync::Arc::new(self.routes);
        let cfg = self.cfg.clone();

        let wh_listeners = self.socket_listeners.clone().unwrap_or_else(|| {
            println!("Missing connected WS handler: will use detached container");
            SocketContainer::new()
        });

        let make_service = make_service_fn(|conn: &ClientConnection| {
            let state = self.state.clone();
            let routes = routes.clone();
            let ip = conn.conn.peer_addr().map(|v| v.to_string()).ok();
            let client_connection_cancel = conn.cancel.clone();
            let cfg = cfg.clone();
            let before_handler_hooks = self.before_handler_hooks.clone();
            let wh_moved = wh_listeners.clone();
            let before_response_hooks = self.before_response_hooks.clone();
            let term_width = termsize::get().map(|size| size.cols).unwrap_or(0) as usize;

            async move {
                let routes = routes.clone();
                let state = state.clone();
                Ok::<_, Infallible>(service_fn(move |req| {
                    let ip = req
                        .headers()
                        .get("X-Real-IP")
                        .and_then(|v| v.to_str().map(String::from).ok())
                        .or(ip.clone())
                        .unwrap_or(String::from("unknown"));
                    handle(
                        req,
                        client_connection_cancel.clone(),
                        state.clone(),
                        wh_moved.clone(),
                        routes.clone(),
                        cfg.clone(),
                        ip,
                        before_handler_hooks.clone(),
                        before_response_hooks.clone(),
                        term_width,
                    )
                }))
            }
        });
        if let Some(on_liftoff) = on_liftoff {
            on_liftoff()
        }
        let server = hyper::server::Server::builder(ServerListener(listener)) //
            .serve(make_service);
        println!(
            "{:<width$}",
            "        Server is ready".black().on_white(),
            width = width
        );

        if let Err(e) = server.await {
            eprintln!("server error: {}", e);
        }
    }
}

impl<T: Send + Sync + 'static + Clone> HyperServer<T> {
    pub fn state(shared_state: T) -> ServerBuilder<T> {
        ServerBuilder {
            state: shared_state,
            routes: Vec::new(),
            cfg: ServerCfg {
                max_request_size: 1024 * 1024 * 1024, //100 mb
                port: None,
                ip: None,
            },
            before_handler_hooks: Vec::new(),
            before_response_hooks: Vec::new(),
            socket_listeners: None,
        }
    }
}

// TODO split into middleware
pub fn get_allowed_origins() -> Vec<String> {
    let mut origins = vec!["http://localhost:5173"]
        .into_iter()
        .map(String::from)
        .collect::<Vec<String>>();
    if let Ok(o) = std::env::var("NATIVE_DEV_CORS") {
        origins.push(o);
    }
    origins
}

pub fn cors(headers: HeaderMap<HeaderValue>, b: Builder) -> Builder {
    if let Some(allowed_origin) = headers
        .get("origin")
        .or(headers.get("Origin"))
        .and_then(|v| v.to_str().ok())
        .or(Some("")) // Treat missing origin as empty string
        .and_then(|origin| {
            if origin.is_empty() || origin == "null" {
                Some("*".to_string())
            } else {
                get_allowed_origins()
                    .iter()
                    .find(|o| o.as_str() == origin)
                    .cloned()
            }
        })
    {
        return b
            .header(header::ACCESS_CONTROL_ALLOW_CREDENTIALS.as_str(), "true")
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN.as_str(), allowed_origin)
            .header(
                header::ACCESS_CONTROL_ALLOW_METHODS.as_str(),
                "GET, POST, PUT, DELETE, OPTIONS",
            )
            .header(
                header::ACCESS_CONTROL_ALLOW_HEADERS.as_str(),
                "Content-Type, Authorization, authorization",
            );
    }

    b
}

async fn handle<T: Send + Sync + Clone>(
    req: Request<Body>,
    client_connection_cancel: CancellationToken,
    state: T,
    wh_listeners: SocketContainer,
    routes: std::sync::Arc<Vec<Route<T>>>,
    server_cfg: ServerCfg,
    ip: String,
    before_handler_hooks: Vec<BeforeHook<T>>,
    before_response_hooks: Vec<
        Arc<Box<dyn Fn(ServerState<T>, HyperOutcome) -> BoxFuture<'static, ()> + Send + Sync>>,
    >,
    term_width: usize,
) -> Result<Response<Body>, hyper::http::Error> {
    let max_content_size: u64 = server_cfg.max_request_size.clone();
    let (route, args) = find_route(routes.clone(), req.uri(), req.method()).unzip();
    let handle: JoinHandle<Result<Response<Body>, HyperErrorResponse>> = tokio::spawn(async move {
        let mut builder = Response::builder()
            .header("server", "Rocket")
            .header("permissions-policy", "interest-cohort=()")
            .header("x-frame-options", "SAMEORIGIN")
            .header("x-content-type-options", "nosniff");

        if req.method() == hyper::Method::OPTIONS {
            let response = builder
                .status(200)
                .header(
                    hyper::header::ACCESS_CONTROL_ALLOW_ORIGIN,
                    req.headers()
                        .get("origin")
                        .and_then(|s| s.to_str().ok())
                        .unwrap_or("*"),
                )
                .header(
                    hyper::header::ACCESS_CONTROL_ALLOW_METHODS,
                    "GET, POST, PUT, DELETE, OPTIONS",
                )
                .header(
                    hyper::header::ACCESS_CONTROL_ALLOW_HEADERS,
                    "Content-Type, Authorization",
                )
                .body(Body::empty())
                .unwrap_or_else(|_| Response::default());
            return Ok(response);
        }

        builder = cors(req.headers().clone(), builder);

        let request_content_length = match req.body().size_hint().upper() {
            Some(v) => v,
            None => max_content_size + 1, // Just to protect ourselves from a malicious request
        };
        if request_content_length > max_content_size {
            let response = builder
                .status(413)
                .body(Body::empty())
                .unwrap_or_else(|_| Response::default());
            return Ok(response);
        }

        let abstract_path = route
            .as_ref()
            .map(|r| r.get_path())
            .unwrap_or(String::from("no_match"));
        if let Some(handler) = route.as_ref().and_then(|r| r.authorize_ws()) {
            if hyper_tungstenite::is_upgrade_request(&req) {
                let state = ServerState {
                    request: std::sync::Arc::new(steal_parts(&req)),
                    shared: state.clone(),
                    route: RouteState::new(args.unwrap_or(Vec::new()), abstract_path),
                    body: std::sync::Arc::new(tokio::sync::Mutex::new(None)),
                    session_storage: SessionStorage::new(),
                    meta: RequestMeta::new(&ip),
                    socket_container: wh_listeners.clone(),
                };

                let res = (handler)(state).await;
                let connect_id = match res {
                    Ok(connect_id) => connect_id,
                    Err(e) => {
                        log::error!(
                            "erorr handling websocket connect route: {}",
                            match e.get_body() {
                                BodyType::Bytes(b) =>
                                    String::from_utf8(b).unwrap_or(String::from("malformed bytes")),
                                BodyType::String(s) => s,
                            }
                        );
                        return Ok(to_response(builder, e));
                    }
                };
                let (response, websocket) = match hyper_tungstenite::upgrade(req, None) {
                    Ok(v) => v,
                    Err(e) => {
                        log::error!("error handling websocket connect @ tungstenite: {e}");
                        return Ok(to_response(
                            builder.status(500),
                            HyperResponse::from(serde_json::json!({"e": e.to_string()})),
                        ));
                    }
                };

                tokio::spawn(async move { wh_listeners.connect(connect_id, websocket).await });
                return Ok(response);
            }
        }

        let meta = RequestMeta::new(&ip);
        let (parts, body) = req.into_parts();
        let request = std::sync::Arc::new(parts);
        print_info(
            format!(
                "    {}: {} -> {} @ {} (#{})",
                meta.time, ip, request.method, request.uri, meta.id
            ),
            term_width,
        );
        let Some(route) = route else {
            print_info(
                format!("        could not match route for request (#{})", meta.id),
                term_width,
            );
            return Ok(builder
                .status(hyper::http::StatusCode::NOT_FOUND)
                .header("Content-Type", "application/json")
                .body(Body::from(
                    serde_json::json!({"error": "Not found"}).to_string(),
                ))
                .unwrap_or_else(|_| Response::default()));
        };
        let Some(executor) = route.executor.as_ref() else {
            print_info(
                format!("   {}: missing executor", route.get_path()),
                term_width,
            );
            return Ok(Response::builder()
                .status(500)
                .body(Body::empty())
                .unwrap_or_else(|_| Response::default()));
        };
        let body = std::sync::Arc::new(tokio::sync::Mutex::new(Some(body)));

        let state = ServerState {
            request,
            shared: state.clone(),
            route: RouteState::new(args.unwrap_or(Vec::new()), abstract_path),
            body,
            session_storage: SessionStorage::new(),
            meta: RequestMeta::new(&ip),
            socket_container: wh_listeners,
        };
        tokio::select! {
            _ = client_connection_cancel.cancelled() => {
                if let Some(on_cancel) = route.on_cancel.as_ref() {
                    (on_cancel)(state.clone()).await;
                }
                print_info(format!("    {}: client disconnected (#{})", chrono::Utc::now(), state.meta.id), term_width);
                // aborted, doesn't matter
                return Ok(Response::builder().status(200).body(Body::empty()).unwrap_or_else(|_|Response::default()));
            },
            result = async {
                print_info(format!("        matched {} (#{})", route.path, state.meta.id), term_width);
                for before_handler in before_handler_hooks.iter().chain(route.before_handler_hooks.iter()) {
                    let result = (before_handler.effect)(state.clone()).await;
                    if let BeforeHookOutcome::Cancel(outcome) = result {
                        for before_response in route.before_response_hooks.iter().chain(before_response_hooks.iter()) {
                            (before_response)(state.clone(), Ok(outcome.clone())).await;
                        };
                        return to_response(builder, outcome);
                    }
                }
                let result = (executor)(state.clone()).await;
                for before_response in before_response_hooks.iter().chain(route.before_response_hooks.iter()) {
                    (before_response)(state.clone(), result.clone()).await;
                };
                match result {
                    Ok(res) => {
                        print_info(format!("    {}: outcome: {} after {} ms (#{})", chrono::Utc::now(), res.status, (chrono::Utc::now() - state.meta.time).num_milliseconds() ,state.meta.id), term_width);
                        return to_response(builder, res);
                    }
                    Err(e) => {
                        let response = to_response(builder, e);
                        print_info(format!("    {}: outcome: {} after {} ms (#{})", chrono::Utc::now(), response.status().as_u16(), (chrono::Utc::now() - state.meta.time).num_milliseconds(), state.meta.id), term_width);
                        return response;
                    }
                }

            } => {
                return Ok(result);
            }
        }
    });

    let res = handle
        .await
        .unwrap_or_else(|_| {
            Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::empty())
                .unwrap_or_else(|_| Response::default()))
        })
        .unwrap_or_else(|_| Response::default());
    Ok(res)
}

fn to_response(mut b: Builder, t: HyperResponse) -> Response<Body> {
    for (header, value) in t.headers {
        b = b.header(header, value);
    }
    b.status(t.status)
        .body(Body::from(t.body))
        .unwrap_or_else(|_| Response::default())
}

impl From<String> for HyperResponse {
    fn from(value: String) -> Self {
        Self {
            body: BodyType::String(value),
            headers: Vec::new(),
            status: 200,
        }
    }
}

impl From<&str> for HyperResponse {
    fn from(value: &str) -> Self {
        Self {
            headers: Vec::new(),
            body: BodyType::String(value.to_string()),
            status: 200,
        }
    }
}

impl From<serde_json::Value> for HyperResponse {
    fn from(value: serde_json::Value) -> Self {
        Self {
            headers: vec![(
                String::from("content-type"),
                String::from("application/json"),
            )],
            body: BodyType::String(value.to_string()),
            status: 200,
        }
    }
}

pub type HyperErrorResponse = HyperResponse;

#[derive(Debug, Clone)]
pub struct HyperResponse {
    headers: Vec<(String, String)>,
    body: BodyType,
    status: u16,
}

#[derive(Debug, Clone)]
pub enum BodyType {
    String(String),
    Bytes(Vec<u8>),
}

impl From<BodyType> for Body {
    fn from(value: BodyType) -> Self {
        match value {
            BodyType::Bytes(b) => Self::from(b),
            BodyType::String(s) => Self::from(s),
        }
    }
}

impl HyperResponse {
    pub fn new(body: BodyType, status: u16) -> Self {
        Self {
            headers: Vec::new(),
            body,
            status,
        }
    }

    pub fn header(mut self, name: impl Display, value: impl Display) -> Self {
        self.headers.push((name.to_string(), value.to_string()));
        self
    }

    pub fn status(mut self, status: u16) -> Self {
        self.status = status;
        self
    }

    pub fn get_status(&self) -> u16 {
        self.status.clone()
    }

    pub fn get_body(&self) -> BodyType {
        self.body.clone()
    }

    pub fn redirect(to: impl Display, permanent: bool) -> Self {
        let location = to.to_string();
        let status = if permanent {
            hyper::StatusCode::PERMANENT_REDIRECT
        } else {
            hyper::StatusCode::FOUND
        };
        Self {
            headers: vec![("Location".into(), location)],
            body: BodyType::Bytes(Vec::new()),
            status: status.as_u16(),
        }
    }
}

#[derive(Clone)]
pub struct SocketContainer {
    inner: std::sync::Arc<tokio::sync::RwLock<HashMap<String, Vec<WebsocketParts>>>>,
}

#[derive(Clone)]
struct WebsocketParts {
    id: String,
    stream: Arc<
        RwLock<SplitSink<hyper_tungstenite::WebSocketStream<hyper::upgrade::Upgraded>, Message>>,
    >,
    #[allow(dead_code)]
    sink: Arc<
        RwLock<
            futures_util::stream::SplitStream<
                hyper_tungstenite::WebSocketStream<hyper::upgrade::Upgraded>,
            >,
        >,
    >,
}

impl SocketContainer {
    pub async fn send_to(
        &self,
        to: impl Display,
        message: impl Display,
    ) -> Result<Option<()>, hyper_tungstenite::tungstenite::Error> {
        let targets = {
            let read = self.inner.read().await;
            read.get(&to.to_string()).cloned()
        };

        if let Some(list) = targets.clone() {
            let msg = message.to_string();
            let dead_ids = Arc::new(tokio::sync::Mutex::new(Vec::new()));
            let mut handles = Vec::new();
            for ws in list.clone() {
                let to_move = msg.clone();
                let to_move_ids = dead_ids.clone();
                handles.push(tokio::spawn(async move {
                    if ws.send(to_move).await.is_err() {
                        let mut locked = to_move_ids.lock().await;
                        locked.push(ws.id.clone());
                    }
                }));
            }

            futures_util::future::join_all(handles).await;

            let dead = dead_ids.lock().await;
            if !dead.is_empty() {
                let mut write = self.inner.write().await;
                if let Some(live_list) = write.get_mut(&to.to_string()) {
                    live_list.retain(|l| !dead.contains(&l.id));
                }
            }
        }
        Ok(Some(()))
    }
}

impl WebsocketParts {
    async fn send(&self, message: impl Display) -> Result<(), SocketError> {
        let mut w = self.stream.write().await;
        w.send(Message::Text(message.to_string())).await?;
        Ok(())
    }
}

impl SocketContainer {
    async fn connect(
        &self,
        id: impl Display,
        socket: HyperWebsocket,
    ) -> Result<(), hyper_tungstenite::tungstenite::Error> {
        let mut write = self.inner.write().await;
        let connected = socket.await?;
        let (send, listen) = connected.split();
        let stream = Arc::new(RwLock::new(send));
        let sink = Arc::new(RwLock::new(listen));
        let parts = WebsocketParts {
            stream,
            sink,
            id: uuid::Uuid::new_v4().to_string(),
        };
        let entry = write.entry(id.to_string()).or_insert_with(Vec::new);
        entry.push(parts);
        drop(write);
        self.send_to(
            id,
            serde_json::json!({"channel": "server", "message": "connected"}),
        )
        .await?;
        Ok(())
    }
}

impl SocketContainer {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl Default for SocketContainer {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone)]
pub struct ServerState<SharedState: Send + Sync + Clone + 'static> {
    pub shared: SharedState,
    pub request: std::sync::Arc<hyper::http::request::Parts>,
    pub route: RouteState,
    pub body: std::sync::Arc<tokio::sync::Mutex<Option<hyper::Body>>>,
    /// To use on handle drops and stuff
    pub session_storage: SessionStorage,
    pub meta: RequestMeta,
    pub socket_container: SocketContainer,
}

impl<SharedState: Send + Sync + Clone + 'static> ServerState<SharedState> {
    pub async fn derive<T: FromRequest<SharedState>>(&self) -> Result<T, HyperErrorResponse> {
        <T as FromRequest<SharedState>>::from_request(&self).await
    }

    pub async fn take_body_stream(&self) -> Option<hyper::Body> {
        let mut lock = self.body.lock().await;
        lock.take()
    }

    pub async fn get_body_bytes(&self) -> Result<Option<Bytes>, hyper::Error> {
        let stream = {
            let mut lock = self.body.lock().await;
            lock.take()
        };
        match stream {
            Some(body) => match hyper::body::to_bytes(body).await {
                Ok(b) => Ok(Some(b)),
                Err(e) => {
                    log::error!("Failed to read body: {}", e);
                    Err(e)
                }
            },
            None => Ok(None),
        }
    }
}

#[derive(Clone)]
pub struct SessionStorage(std::sync::Arc<tokio::sync::RwLock<HashMap<String, String>>>);
impl SessionStorage {
    pub fn new() -> Self {
        Self(std::sync::Arc::new(
            tokio::sync::RwLock::new(HashMap::new()),
        ))
    }

    pub async fn set(
        &self,
        key: impl Display,
        value: impl Display,
    ) -> Result<(), tokio::sync::TryLockError> {
        self.0
            .try_write()?
            .insert(key.to_string(), value.to_string());
        Ok(())
    }

    pub async fn get(
        &self,
        key: impl Display,
    ) -> Result<Option<String>, tokio::sync::TryLockError> {
        Ok(self.0.try_read()?.get(key.to_string().as_str()).cloned())
    }
}

#[derive(Clone, Debug)]
pub struct RouteState {
    arguments: std::collections::HashMap<String, Vec<String>>,
    abstract_path: String,
}

impl RouteState {
    pub fn get_argument(&self, a: impl Display) -> Option<String> {
        self.arguments
            .get(&a.to_string())
            .and_then(|v| v.first())
            .cloned()
    }
    pub fn get_argument_vec(&self, a: impl Display) -> Vec<String> {
        self.arguments
            .get(&a.to_string())
            .cloned()
            .unwrap_or_else(Vec::new)
    }

    pub fn get_abstract_path(&self) -> String {
        self.abstract_path.clone()
    }

    pub fn new(args: Vec<(String, String)>, path: String) -> Self {
        let arguments = args
            .into_iter()
            .fold(HashMap::new(), |mut prev, (key, value)| {
                let decoded = urlencoding::decode(value.as_str())
                    .map(|val| val.to_string())
                    .ok();
                if let Some(decoded) = decoded {
                    prev.entry(key).or_insert(Vec::new()).push(decoded);
                }
                prev
            });
        Self {
            arguments,
            abstract_path: path,
        }
    }
}

pub trait IntoHyperResponse {
    fn convert(self) -> HyperResponse;
    fn with_context(
        &self,
        _ctx: Option<&Arc<Parts>>,
        _request_id: Option<String>,
    ) -> Option<HyperResponse>
    where
        Self: Sized,
    {
        return None;
    }
}

impl<I: IntoHyperResponse> From<I> for HyperResponse {
    fn from(value: I) -> Self {
        value.convert()
    }
}

#[derive(Clone)]
struct ServerCfg {
    pub(crate) max_request_size: u64,
    pub(crate) port: Option<u16>,
    pub(crate) ip: Option<[u8; 4]>,
}

#[derive(Clone)]
pub struct RequestMeta {
    pub id: String,
    pub time: chrono::DateTime<chrono::Utc>,
    pub ip: String,
}

impl RequestMeta {
    pub fn new(ip: impl Display) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            time: chrono::Utc::now(),
            ip: ip.to_string(),
        }
    }
}

fn print_info(message: impl Display, width: usize) {
    println!(
        "{:<width$}",
        message.to_string().black().on_white(),
        width = width
    );
}

fn steal_parts(r: &Request<Body>) -> Parts {
    let mut r2 = Request::builder();
    for (name, value) in r.headers() {
        r2 = r2.header(name, value);
    }
    r2 = r2.uri(r.uri().clone());
    r2 = r2.version(r.version());
    r2 = r2.method(r.method());
    //safe-ish
    r2.body(()).unwrap().into_parts().0
}

pub struct HyperDownloadResponse {
    pub content: Vec<u8>,
    pub filename: String,
    pub content_type: String,
}

impl IntoHyperResponse for hyper::http::StatusCode {
    fn convert(self) -> crate::HyperResponse {
        let response =
            crate::HyperResponse::new(crate::BodyType::String(String::new()), self.as_u16())
                .header("Content-Type", "text/plain");
        response
    }
}
impl IntoHyperResponse for hyper::Error {
    fn convert(self) -> crate::HyperResponse {
        let response = crate::HyperResponse::new(crate::BodyType::String(self.to_string()), 500)
            .header("Content-Type", "text/plain");
        response
    }
}

impl IntoHyperResponse for HyperDownloadResponse {
    fn convert(self) -> crate::HyperResponse {
        let response = crate::HyperResponse::new(crate::BodyType::Bytes(self.content), 200)
            .header("Content-Type", self.content_type)
            .header(
                "Content-Disposition",
                format!("attachment; filename=\"{}\"", &self.filename),
            );
        response
    }
}

pub trait FromRequest<State: Clone + Send + Sync + 'static>
where
    Self: Send + Sync + Sized,
{
    #[allow(async_fn_in_trait)]
    async fn from_request(req: &ServerState<State>) -> Result<Self, crate::HyperErrorResponse>;
}

use multer::Multipart;
pub struct File<T: HasFileExtension>(Vec<u8>, PhantomData<T>, String);

pub trait HasFileExtension {
    const EXTENSION: &[&'static str];
}

impl<T: HasFileExtension> File<T> {
    pub fn get_extension() -> &'static [&'static str] {
        T::EXTENSION
    }

    pub fn as_vec(self) -> Vec<u8> {
        self.0
    }

    pub fn filename(&self) -> &str {
        &self.2
    }

    pub async fn from_req_bulk(
        req: Bytes,
        content_type: &str,
    ) -> Result<Vec<Self>, crate::HyperErrorResponse> {
        let boundary = match multer::parse_boundary(content_type) {
            Ok(v) => v,
            Err(e) => return Err(HyperResponse::from(serde_json::json!({"e": e.to_string()}))),
        };
        let stream = futures_util::stream::once(async move { Ok::<Bytes, Infallible>(req) });
        let mut multipart = Multipart::new(stream, boundary);
        let mut output = Vec::new();
        while let Some(field) = match multipart.next_field().await {
            Ok(v) => v,
            Err(e) => return Err(HyperResponse::from(serde_json::json!({"e": e.to_string()}))),
        } {
            if let Some(filename) = field.file_name().map(String::from) {
                let extension = filename
                    .split(".")
                    .last()
                    .map(|extension| format!(".{extension}"))
                    .unwrap_or_else(String::new);
                if Self::get_extension().contains(&extension.as_str()) {
                    let data = match field.bytes().await {
                        Ok(v) => v,
                        Err(e) => {
                            return Err(HyperResponse::from(
                                serde_json::json!({"e": e.to_string()}),
                            ))
                        }
                    };
                    output.push(Self(data.to_vec(), PhantomData, filename.to_string()));
                }
            }
        }
        Ok(output)
    }

    pub async fn from_req(
        req: Bytes,
        content_type: &str,
    ) -> Result<Self, crate::HyperErrorResponse> {
        let all = Self::from_req_bulk(req, content_type).await?;
        all.into_iter()
            .next()
            .ok_or(format!("no {} files found", Self::get_extension().join("/")).into())
    }
}

pub struct Zip;
impl HasFileExtension for Zip {
    const EXTENSION: &[&'static str] = &[".zip"];
}
pub struct Image;
impl HasFileExtension for Image {
    const EXTENSION: &[&'static str] = &[".png", ".jpg", ".webp"];
}
pub struct Video;
impl HasFileExtension for Video {
    const EXTENSION: &[&'static str] = &[".mp4", ".avi", ".mov", ".webm"];
}
