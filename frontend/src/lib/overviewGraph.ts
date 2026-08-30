import type { ActionDefinition } from "./api/actions";
import type { FlagDefinition } from "./api/flags";
import type { ItemDefinition } from "./api/items";
import type { LocationDefinition } from "./api/locations";
import type { SkillDefinition } from "./api/skills";
import { conditionRule, effectRule, type OverviewLookups } from "./overviewRules";
import type { OverviewEdge, OverviewEdgeKind, OverviewGraph, OverviewNode } from "./overviewTypes";

export type OverviewSources = {
  actions: ActionDefinition[];
  flags: FlagDefinition[];
  items: ItemDefinition[];
  locations: LocationDefinition[];
  skills: SkillDefinition[];
};

export function buildOverviewGraph(sources: OverviewSources): OverviewGraph {
  const lookups = buildLookups(sources);
  const skillNames = new Map(sources.skills.map((skill) => [skill.uuid, skill.name]));
  const locationNodes = sources.locations.map(locationNode);
  const actionNodes = sources.actions.map((action) => actionNode(action, lookups, skillNames));
  const edges: OverviewEdge[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];

  for (const node of actionNodes) {
    node.requirements.forEach((rule) => directEdge(rule, node.id, "requirement", edges, seen));
    node.reveals.forEach((rule) => directEdge(rule, node.id, "reveal", edges, seen));
    node.effects.filter((rule) => rule.kind === "location").forEach((rule) => {
      if (rule.targetNodeId) pushEdge(node.id, rule.targetNodeId, "travel", rule.detail, false, edges, seen);
    });
  }
  connectResources(actionNodes, edges, seen);
  collectWarnings(sources.actions, warnings);
  return { nodes: [...locationNodes, ...actionNodes], edges, warnings };
}

function buildLookups(sources: OverviewSources): OverviewLookups {
  return {
    actions: new Map(sources.actions.map((action) => [action.uuid, action.title])),
    flags: new Map(sources.flags.map((flag) => [flag.uuid, flag])),
    items: new Map(sources.items.map((item) => [item.uuid, item])),
    locations: new Map(sources.locations.map((location) => [location.uuid, location])),
  };
}

function locationNode(location: LocationDefinition): OverviewNode {
  return {
    id: `location:${location.uuid}`,
    entityUuid: location.uuid,
    kind: "location",
    title: location.title,
    subtitle: location.flavour,
    groupId: location.uuid,
    requirements: [], reveals: [], effects: [],
  };
}

function actionNode(
  action: ActionDefinition,
  lookups: OverviewLookups,
  skillNames: Map<string, string>,
): OverviewNode {
  const requirements = action.conditions.map((condition) => conditionRule(condition, lookups));
  const locations = action.conditions.filter((condition) => condition.condition === "location");
  return {
    id: `action:${action.uuid}`,
    entityUuid: action.uuid,
    kind: "action",
    title: action.title,
    subtitle: action.flavour,
    groupId: locations[0]?.value ?? "anywhere",
    skillId: action.requiredSkill,
    skillName: skillNames.get(action.requiredSkill) ?? action.requiredSkill,
    weight: action.weight,
    repeatable: action.repeatable,
    conditionJoin: action.conditionJoin,
    requirements,
    reveals: action.revealConditions.map((condition) => conditionRule(condition, lookups)),
    effects: action.completionEffects.map((effect) => effectRule(effect, lookups)),
  };
}

function directEdge(
  rule: OverviewNode["requirements"][number],
  target: string,
  kind: OverviewEdgeKind,
  edges: OverviewEdge[],
  seen: Set<string>,
) {
  if (rule.targetNodeId) {
    pushEdge(rule.targetNodeId, target, kind, rule.detail, rule.negated, edges, seen);
  }
}

function connectResources(nodes: OverviewNode[], edges: OverviewEdge[], seen: Set<string>) {
  const producers = new Map<string, OverviewNode[]>();
  for (const node of nodes) {
    for (const rule of node.effects) {
      if (!rule.resourceKey || !isProducer(rule.operation)) continue;
      const matches = producers.get(rule.resourceKey) ?? [];
      matches.push(node);
      producers.set(rule.resourceKey, matches);
    }
  }
  for (const node of nodes) {
    for (const rule of [...node.requirements, ...node.reveals]) {
      if (!rule.resourceKey) continue;
      for (const producer of producers.get(rule.resourceKey) ?? []) {
        if (producer.id === node.id) continue;
        const kind = rule.kind === "state" ? "state" : "resource";
        pushEdge(producer.id, node.id, kind, rule.detail, rule.negated, edges, seen);
      }
    }
  }
}

function pushEdge(
  from: string, to: string, kind: OverviewEdgeKind, label: string, negated: boolean,
  edges: OverviewEdge[], seen: Set<string>,
) {
  const key = `${from}|${to}|${kind}|${label}|${negated}`;
  if (!seen.add(key)) return;
  edges.push({ id: `overview-edge-${edges.length + 1}`, from, to, kind, label, negated });
}

function isProducer(operation: string) {
  return ["addItem", "setFlag", "increaseFlag", "decreaseFlag", "clearFlag", "custom"]
    .includes(operation);
}

function collectWarnings(actions: ActionDefinition[], warnings: string[]) {
  for (const action of actions) {
    const locations = action.conditions.filter((condition) => condition.condition === "location");
    const destinations = action.completionEffects.filter((effect) => effect.effect === "changeLocation");
    if (locations.length > 1 && action.conditionJoin === "and") {
      warnings.push(`${action.title} requires multiple locations simultaneously.`);
    }
    if (destinations.length > 1) warnings.push(`${action.title} changes location more than once.`);
    if (destinations.length > 0 && locations.length === 0) {
      warnings.push(`${action.title} can change location from anywhere.`);
    }
    if (action.conditions.some((condition) =>
      condition.condition.startsWith("actionDone") && condition.value === action.uuid)) {
      warnings.push(`${action.title} requires itself to be completed.`);
    }
  }
}
