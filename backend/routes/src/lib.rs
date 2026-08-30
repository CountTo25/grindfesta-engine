mod actions;
mod common;
mod compile;
mod flags;
mod game;
mod icon_libraries;
mod items;
mod locations;
mod projects;
mod skills;
mod system;

use cancels::Route;
use services::App;

pub fn all() -> Vec<Route<App>> {
    let mut routes = system::all();
    routes.extend(projects::all());
    routes.extend(skills::all());
    routes.extend(locations::all());
    routes.extend(flags::all());
    routes.extend(items::all());
    routes.extend(actions::all());
    routes.extend(icon_libraries::all());
    routes.extend(compile::all());
    routes.extend(game::all());
    routes
}
