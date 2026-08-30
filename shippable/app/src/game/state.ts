import type {
  GameDefinition,
  GeneratedGameState,
  RunSummary,
} from "./types";
import { loadGameState } from "./persistence";

type PersistentRunState = Pick<
  GeneratedGameState,
  "persistentExperience" | "historicalActions"
> & { runtime?: Pick<GeneratedGameState["runtime"], "persistentActions"> };

function freshRun(
  data: GameDefinition,
  persistent: PersistentRunState,
  endedRun: RunSummary | null,
  previousRun: RunSummary | null,
): GeneratedGameState {
  const persistentExperience = Object.fromEntries(data.skills.map((skill) => [
    skill.uuid,
    persistent.persistentExperience[skill.uuid] ?? 0,
  ]));
  return {
    runtime: {
      currentAction: null,
      activeQueuedAction: null,
      actionQueue: [],
      actionProgress: {},
      completedActions: [],
      persistentActions: [...(persistent.runtime?.persistentActions ?? [])],
      inventory: {},
      elapsedMs: 0,
    },
    currentLocation: data.locations[0]?.uuid ?? "",
    energy: {
      currentEnergy: data.engineVariables.baseEnergyCapacity,
      maxEnergy: data.engineVariables.baseEnergyCapacity,
      energyDrainRate: data.engineVariables.initialEnergyDecayRate,
    },
    runExperience: Object.fromEntries(
      data.skills.map((skill) => [skill.uuid, 0]),
    ),
    persistentExperience,
    runStartPersistentExperience: { ...persistentExperience },
    historicalActions: [...persistent.historicalActions],
    flags: {},
    timeline: [],
    endedRun,
    previousRun,
  };
}

export function initialState(data: GameDefinition) {
  const fallback = freshRun(data, {
    persistentExperience: {},
    historicalActions: [],
  }, null, null);
  return loadGameState(data, fallback);
}

export function endRun(
  data: GameDefinition,
  snapshot: GeneratedGameState,
) {
  const summary: RunSummary = {
    elapsedMs: snapshot.runtime.elapsedMs,
    locationUuid: snapshot.currentLocation,
    completedActions: [...snapshot.runtime.completedActions],
    runExperience: { ...snapshot.runExperience },
    initialPersistentExperience: { ...snapshot.runStartPersistentExperience },
    persistentExperience: { ...snapshot.persistentExperience },
    timeline: snapshot.timeline.map((entry) => ({ ...entry })),
  };
  return freshRun(data, snapshot, summary, snapshot.previousRun);
}

export function beginNextRun(
  data: GameDefinition,
  snapshot: GeneratedGameState,
) {
  return freshRun(data, snapshot, null, snapshot.endedRun ?? snapshot.previousRun);
}
