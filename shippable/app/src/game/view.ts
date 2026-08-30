import { getSkillProgressGain, getSkillProgression } from "../engine/mechanics/skills";
import { estimateEnergyRemainingMs } from "../engine/mechanics/energy";
import type { GeneratedGameState, RuntimeAction } from "./types";
import { skillExperience } from "./types";
import type { GameDefinition } from "./types";
import { energyDrainConfig, skillProgressionConfig } from "./engineConfig";

export function skillView(
  data: GameDefinition,
  state: GeneratedGameState,
  skillUuid: string,
) {
  const progression = getSkillProgression(
    skillExperience(state, skillUuid),
    skillProgressionConfig(data.engineVariables),
  );
  return {
    runLevel: progression.levels.run.level,
    persistentLevel: progression.levels.timeCompression.level,
    runProgress: progression.levels.run.progress * 100,
    persistentProgress: progression.levels.timeCompression.progress * 100,
    runModifier: progression.modifiers.run,
    persistentModifier: progression.modifiers.timeCompression,
    modifier: progression.modifiers.total,
  };
}

export function actionDuration(
  data: GameDefinition,
  state: GeneratedGameState,
  action: RuntimeAction,
) {
  return formatDuration(actionDurationSeconds(data, state, action));
}

export function actionDurationSeconds(
  data: GameDefinition,
  state: GeneratedGameState,
  action: RuntimeAction,
) {
  const view = skillView(data, state, action.skill);
  const gain = getSkillProgressGain(
    { run: view.runLevel, timeCompression: view.persistentLevel },
    1000,
    data.engineVariables.baseActionProgressPerSecond,
    skillProgressionConfig(data.engineVariables),
  );
  return action.weight / gain;
}

export function formatDuration(seconds: number) {
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    : `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`;
}

export function actionProgress(state: GeneratedGameState, action: RuntimeAction) {
  const progress = state.runtime.actionProgress[action.uuid]?.progress ?? 0;
  return Math.min(100, (progress / action.weight) * 100);
}

export function elapsedTime(elapsedMs: number) {
  if (!Number.isFinite(elapsedMs)) return "∞";
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function energyRemainingTime(data: GameDefinition, state: GeneratedGameState) {
  return elapsedTime(estimateEnergyRemainingMs(
    state.energy,
    energyDrainConfig(data.engineVariables),
  ));
}
