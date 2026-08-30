import { writable, type Writable } from "svelte/store";
import { createCore, type CoreEngine } from "../engine/core";
import {
  addSkillExperience,
  getSkillProgressGain,
  getSkillProgression,
} from "../engine/mechanics/skills";
import { createEnergyMechanics } from "../engine/mechanics/energy";
import { createQueueMechanics } from "../engine/mechanics/queue";
import type { QueuedAction } from "../engine/actions";
import type {
  GameDefinition,
  GeneratedGameState,
  RuntimeAction,
} from "./types";
import { skillExperience } from "./types";
import {
  beginNextRun,
  endRun,
  initialState,
} from "./state";
import { createSaveController } from "./persistence";
import { createRuntimeItems } from "./itemRuntime";
import { energyDrainConfig, skillProgressionConfig } from "./engineConfig";

export type GeneratedGame = {
  state: Writable<GeneratedGameState>;
  engine: CoreEngine<GeneratedGameState, string>;
  actions: Record<string, RuntimeAction>;
  playAction: (actionUuid: string) => void;
  pauseAction: () => void;
  enqueueAction: (actionUuid: string) => void;
  removeQueuedAction: (index: number) => void;
  getLiveQueue: (snapshot: GeneratedGameState) => readonly QueuedAction<string>[];
  setLocation: (locationUuid: string) => void;
  beginNextRun: () => void;
  destroy: () => void;
};

export function createGeneratedGame(data: GameDefinition): GeneratedGame {
  const actions = data.actions;
  const items = createRuntimeItems(data.items);
  const skillConfig = skillProgressionConfig(data.engineVariables);
  const state = writable(initialState(data));
  const ticksPerSecond = writable(data.engineVariables.ticksPerSecond);
  const timeScale = writable(1);
  const energy = createEnergyMechanics<GeneratedGameState>({
    drain: energyDrainConfig(data.engineVariables),
    getEnergy: (snapshot) => snapshot.energy,
    setEnergy: (snapshot, nextEnergy) => ({
      ...snapshot,
      energy: nextEnergy,
    }),
  });
  const engine = createCore({
    state,
    ticksPerSecond,
    timeScale,
    actions,
    items,
    getRuntime: (snapshot) => snapshot.runtime,
    getProgressGain: (snapshot, action, tickMs) => {
      const progression = getSkillProgression(
        skillExperience(snapshot, action.skill),
        skillConfig,
      );
      return getSkillProgressGain(
        {
          run: progression.levels.run.level,
          timeCompression: progression.levels.timeCompression.level,
        },
        tickMs,
        data.engineVariables.baseActionProgressPerSecond,
        skillConfig,
      );
    },
    applyTickCosts: (snapshot, tickMs) => energy.drain(tickMs)(snapshot),
    canTick: (snapshot) => snapshot.endedRun === null,
    canContinue: (snapshot) => !energy.isDepleted(snapshot),
    onProgress: (snapshot, actionUuid, gain) => {
      const action = actions[actionUuid];
      const progress = snapshot.runtime.actionProgress[actionUuid]?.progress ?? gain;
      const awarded = Math.min(gain, Math.max(0, action.weight - (progress - gain)));
      const experience = addSkillExperience(skillExperience(snapshot, action.skill), awarded);
      snapshot.runExperience[action.skill] = experience.run;
      snapshot.persistentExperience[action.skill] = experience.timeCompression;
      return snapshot;
    },
    onComplete: (snapshot, actionUuid) => {
      if (!snapshot.historicalActions.includes(actionUuid)) {
        snapshot.historicalActions.push(actionUuid);
      }
      return snapshot;
    },
    onHalt: (snapshot) => {
      const next = endRun(data, snapshot);
      return next;
    },
    autoStart: false,
  });
  const queue = createQueueMechanics<GeneratedGameState, string>({
    getQueue: (snapshot) => snapshot.runtime,
    canEnqueue: (snapshot, entry) =>
      snapshot.endedRun === null && engine.canStartAction(snapshot, entry.id),
    getDefaultMode: (_, actionUuid) => {
      const action = actions[actionUuid];
      return action?.repeatable && !action.stopOnRepeat ? "max" : "once";
    },
  });
  const playAction = (actionUuid: string) => state.update((snapshot) =>
    snapshot.endedRun ? snapshot : queue.replaceWithAction(actionUuid)(snapshot));
  const pauseAction = () => state.update(queue.clearQueue());
  const enqueueAction = (actionUuid: string) =>
    state.update(queue.enqueueAction(actionUuid));
  const removeQueuedAction = (index: number) =>
    state.update(queue.removeFromQueue(index));
  const setLocation = (locationUuid: string) => state.update((snapshot) => {
    if (snapshot.endedRun) return snapshot;
    if (!data.locations.some((location) => location.uuid === locationUuid)) return snapshot;
    snapshot.currentLocation = locationUuid;
    if (
      snapshot.runtime.currentAction &&
      !engine.canStartAction(snapshot, snapshot.runtime.currentAction.id)
    ) snapshot.runtime.currentAction = null;
    return snapshot;
  });
  const startNextRun = () => state.update((snapshot) =>
    snapshot.endedRun ? beginNextRun(data, snapshot) : snapshot);
  state.update((snapshot) => {
    if (snapshot.endedRun) return snapshot;
    const current = snapshot.runtime.currentAction;
    if (current) {
      let canResume = false;
      try {
        canResume = engine.canStartAction(snapshot, current.id);
      } catch {
        canResume = false;
      }
      if (!canResume) {
        snapshot.runtime.currentAction = null;
        snapshot.runtime.activeQueuedAction = null;
      }
    }
    return snapshot;
  });
  const save = createSaveController(data, state);
  engine.loop.start();
  const destroy = () => {
    engine.loop.destroy();
    save.destroy();
  };
  return {
    state,
    engine,
    actions,
    playAction,
    pauseAction,
    enqueueAction,
    removeQueuedAction,
    getLiveQueue: queue.getLiveQueue,
    setLocation,
    beginNextRun: startNextRun,
    destroy,
  };
}
