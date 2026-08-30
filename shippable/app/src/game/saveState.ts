import type { QueuedAction } from "../engine/actions";
import type {
  GameDefinition,
  GeneratedGameState,
} from "./types";
import { restoreFlags } from "./saveFlags";
import { restoreRunSummary, restoreTimeline } from "./restoreRunSummary";

type UnknownRecord = Record<string, unknown>;
const MAX_SAVED_ENTRIES = 5_000;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function strings(value: unknown, allowed: (value: string) => boolean) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (entry): entry is string => typeof entry === "string" && allowed(entry),
  ))].slice(-MAX_SAVED_ENTRIES);
}

function experience(
  value: unknown,
  data: GameDefinition,
  fallback: Record<string, number>,
) {
  const source = record(value);
  return Object.fromEntries(data.skills.map((skill) => [
    skill.uuid,
    number(source[skill.uuid], fallback[skill.uuid] ?? 0),
  ]));
}

function queueEntry(
  value: unknown,
  hasAction: (uuid: string) => boolean,
): QueuedAction<string> | null {
  const source = record(value);
  if (typeof source.id !== "string" || !hasAction(source.id)) return null;
  const mode = source.mode === "max" ? "max" : "once";
  const entry: QueuedAction<string> = { id: source.id, mode };
  if (source.source === "manual" || source.source === "retrace") {
    entry.source = source.source;
  }
  return entry;
}

function runtime(
  value: unknown,
  data: GameDefinition,
  fallback: GeneratedGameState["runtime"],
): GeneratedGameState["runtime"] {
  const source = record(value);
  const hasAction = (uuid: string) => Object.hasOwn(data.actions, uuid);
  const currentSource = record(source.currentAction);
  let currentAction = typeof currentSource.id === "string" && hasAction(currentSource.id)
    ? { id: currentSource.id }
    : null;
  let activeQueuedAction = queueEntry(source.activeQueuedAction, hasAction);
  if (activeQueuedAction && !currentAction) currentAction = { id: activeQueuedAction.id };
  if (activeQueuedAction?.id !== currentAction?.id) activeQueuedAction = null;
  const actionQueue = Array.isArray(source.actionQueue)
    ? source.actionQueue.flatMap((entry) => queueEntry(entry, hasAction) ?? [])
      .slice(0, MAX_SAVED_ENTRIES)
    : [];
  const progressSource = record(source.actionProgress);
  const actionProgress = Object.fromEntries(Object.keys(data.actions).flatMap((uuid) => {
    const entry = record(progressSource[uuid]);
    if (Object.keys(entry).length === 0) return [];
    const weight = Math.max(0, data.actions[uuid].weight);
    return [[uuid, {
      progress: Math.min(number(entry.progress), weight),
      complete: entry.complete === true,
    }]];
  }));
  const inventorySource = record(source.inventory);
  const items = new Map(data.items.map((item) => [item.uuid, item]));
  const inventory = Object.fromEntries(Object.entries(inventorySource)
    .filter(([uuid]) => items.has(uuid))
    .slice(0, MAX_SAVED_ENTRIES)
    .flatMap(([uuid, value]) => {
      const entry = record(value);
      return Object.keys(entry).length > 0
        ? [[uuid, {
          amount: Math.min(number(entry.amount), items.get(uuid)?.capacity ?? Number.MAX_SAFE_INTEGER),
          cooldownMs: number(entry.cooldownMs),
        }]]
        : [];
    }));
  return {
    currentAction,
    activeQueuedAction,
    actionQueue,
    actionProgress,
    completedActions: strings(source.completedActions, hasAction),
    persistentActions: strings(source.persistentActions, (uuid) =>
      hasAction(uuid) && data.actions[uuid].crossGeneration),
    inventory,
    elapsedMs: number(source.elapsedMs, fallback.elapsedMs),
  };
}

export function restoreGameState(
  data: GameDefinition,
  fallback: GeneratedGameState,
  value: unknown,
): GeneratedGameState {
  const source = record(value);
  const location = typeof source.currentLocation === "string" &&
    data.locations.some((entry) => entry.uuid === source.currentLocation)
    ? source.currentLocation
    : fallback.currentLocation;
  const energySource = record(source.energy);
  const maxEnergy = Math.max(0.000_001, number(
    energySource.maxEnergy,
    fallback.energy.maxEnergy,
  ));
  const persistentExperience = experience(
    source.persistentExperience,
    data,
    fallback.persistentExperience,
  );
  return {
    runtime: runtime(source.runtime, data, fallback.runtime),
    currentLocation: location,
    energy: {
      currentEnergy: Math.min(number(
        energySource.currentEnergy,
        fallback.energy.currentEnergy,
      ), maxEnergy),
      maxEnergy,
      energyDrainRate: number(
        energySource.energyDrainRate,
        fallback.energy.energyDrainRate,
      ),
    },
    runExperience: experience(source.runExperience, data, fallback.runExperience),
    persistentExperience,
    runStartPersistentExperience: experience(
      source.runStartPersistentExperience,
      data,
      persistentExperience,
    ),
    historicalActions: strings(
      source.historicalActions,
      (uuid) => Object.hasOwn(data.actions, uuid),
    ),
    flags: restoreFlags(source.flags, data),
    timeline: restoreTimeline(source.timeline),
    endedRun: restoreRunSummary(
      source.endedRun, data, fallback.endedRun, persistentExperience,
    ),
    previousRun: restoreRunSummary(source.previousRun, data, fallback.previousRun),
  };
}
