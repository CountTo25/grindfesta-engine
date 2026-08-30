import {
  getSkillLevelModifiers,
  getSkillProgressGain,
  type SkillLevels,
} from "../../../shippable/engine/mechanics/skills";
import type { ActionDefinition } from "./api/actions";
import type { EngineVariables } from "./api/projects";
import { previewSkillConfig } from "./engineVariableDefinitions";

export type ActionPreviewSkillLevels = SkillLevels;

export function actionSkillModifier(
  levels: ActionPreviewSkillLevels,
  variables: EngineVariables,
) {
  return getSkillLevelModifiers(levels, previewSkillConfig(variables)).total;
}

export function actionDurationSeconds(
  weight: number,
  levels: ActionPreviewSkillLevels,
  variables: EngineVariables,
) {
  return weight / getSkillProgressGain(
    levels,
    1000,
    variables.baseActionProgressPerSecond,
    previewSkillConfig(variables),
  );
}

export function formatActionDuration(
  weight: number,
  levels: ActionPreviewSkillLevels,
  variables: EngineVariables,
) {
  const seconds = actionDurationSeconds(weight, levels, variables);
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}m ${remainder}s`;
  }
  return `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`;
}

export function actionMatchesLocation(action: ActionDefinition, locationUuid: string) {
  if (!locationUuid) return true;
  const checks = action.conditions
    .filter((condition) => condition.condition === "location")
    .map((condition) => {
      const matches = condition.value === locationUuid;
      return condition.not ? !matches : matches;
    });
  if (checks.length === 0) return true;
  return action.conditionJoin === "or" ? checks.some(Boolean) : checks.every(Boolean);
}
