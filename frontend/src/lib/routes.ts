const projectRoute = /^\/editor\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;
const buildRoute = /^\/editor\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/build\/?$/i;

export type AppRoute =
  | { page: "launcher" }
  | { page: "editor" | "build"; projectUuid: string };

export function appRouteFromLocation(): AppRoute {
  if (typeof window === "undefined") {
    return { page: "launcher" };
  }
  const buildUuid = window.location.pathname.match(buildRoute)?.[1];
  if (buildUuid) return { page: "build", projectUuid: buildUuid };
  const projectUuid = window.location.pathname.match(projectRoute)?.[1];
  return projectUuid ? { page: "editor", projectUuid } : { page: "launcher" };
}

export function routeToProject(projectUuid: string) {
  navigate(`/editor/${projectUuid}`);
}

export function routeToProjectBuild(projectUuid: string) {
  navigate(`/editor/${projectUuid}/build`);
}

export function routeToLauncher() {
  navigate("/");
}

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
