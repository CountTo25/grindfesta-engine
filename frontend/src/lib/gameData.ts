import type { ActionDefinition } from "./api/actions";
import type { FlagDefinition } from "./api/flags";
import type { ItemDefinition } from "./api/items";
import type { LocationDefinition } from "./api/locations";
import type { Project } from "./api/projects";
import type { SkillDefinition } from "./api/skills";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type GameDataSnapshot = { [key: string]: JsonValue };

export function buildActiveRunGameData(
  project: Project,
  skills: SkillDefinition[],
  locations: LocationDefinition[],
  items: ItemDefinition[],
  flags: FlagDefinition[],
  actions: ActionDefinition[],
): GameDataSnapshot {
  const actionProgress = Object.fromEntries(actions.map((action) => [
    action.uuid,
    { progress: 0, complete: false },
  ]));
  const inventory = Object.fromEntries(items.map((item) => [
    item.uuid,
    { amount: 0, cooldownMs: 0 },
  ]));
  return JSON.parse(JSON.stringify({
    runtime: {
      currentAction: null,
      activeQueuedAction: null,
      actionQueue: [],
      actionProgress,
      completedActions: [],
      persistentActions: [],
      inventory,
      elapsedMs: 0,
    },
    currentLocation: locations[0]?.uuid ?? "",
    energy: {
      currentEnergy: project.engineVariables.baseEnergyCapacity,
      maxEnergy: project.engineVariables.baseEnergyCapacity,
      energyDrainRate: project.engineVariables.initialEnergyDecayRate,
    },
    runExperience: Object.fromEntries(skills.map((skill) => [skill.uuid, 0])),
    flags: Object.fromEntries(flags.map((flag) => [flag.uuid, null])),
    timeline: [],
  })) as GameDataSnapshot;
}

export function isJsonContainer(value: JsonValue): value is JsonValue[] | Record<string, JsonValue> {
  return value !== null && typeof value === "object";
}

export function jsonValueType(value: JsonValue) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

export function jsonValuePreview(value: JsonValue) {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  return String(value);
}

export function appendGameDataPath(parent: string, key: string, arrayEntry = false) {
  if (arrayEntry) return `${parent}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${parent}.${key}`
    : `${parent}[${JSON.stringify(key)}]`;
}

export function gameDataNodeLabel(key: string, value: JsonValue, arrayEntry = false) {
  const base = arrayEntry ? `[${key}]` : key;
  if (!isJsonContainer(value) || Array.isArray(value)) return base;
  const identity = value.name ?? value.title;
  return typeof identity === "string" && identity ? `${base} — ${identity}` : base;
}
