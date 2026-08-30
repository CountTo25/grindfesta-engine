import type { OverviewEdge, OverviewEdgeKind, OverviewNode } from "./overviewTypes";

export type OverviewConnectionFilter = "all" | OverviewEdgeKind;

export type OverviewFilters = {
  search: string;
  skillId: string;
  locationId: string;
  connection: OverviewConnectionFilter;
};

export function filterOverview(
  nodes: OverviewNode[], edges: OverviewEdge[], filters: OverviewFilters,
) {
  const query = filters.search.trim().toLocaleLowerCase();
  const actions = nodes.filter((node) => node.kind === "action" &&
    (!filters.skillId || node.skillId === filters.skillId) &&
    matchesLocation(node, filters.locationId) && matchesQuery(node, query));
  const actionIds = new Set(actions.map((node) => node.id));
  const locations = nodes.filter((node) => node.kind === "location" &&
    (!filters.locationId || node.entityUuid === filters.locationId) &&
    (matchesQuery(node, query) || actions.some((action) => action.groupId === node.groupId)));
  const visibleNodes = [...locations, ...actions];
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to) &&
    (filters.connection === "all" || edge.kind === filters.connection));
  return { nodes: visibleNodes, edges: visibleEdges, actionCount: actionIds.size };
}

function matchesLocation(node: OverviewNode, locationId: string) {
  if (!locationId) return true;
  return node.groupId === locationId || [...node.requirements, ...node.reveals, ...node.effects]
    .some((rule) => rule.kind === "location" && rule.targetId === locationId);
}

function matchesQuery(node: OverviewNode, query: string) {
  if (!query) return true;
  return [node.title, node.subtitle, node.skillName,
    ...node.requirements.map((rule) => rule.detail),
    ...node.reveals.map((rule) => rule.detail),
    ...node.effects.map((rule) => rule.detail),
  ].some((value) => value?.toLocaleLowerCase().includes(query));
}
