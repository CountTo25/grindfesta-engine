import { apiRequest } from "./client";
import type { FlagDefinition } from "./flags";
import type { JsonPrimitive } from "../gameData";

export type ActionConditionType =
  | "location"
  | "actionDoneThisRun"
  | "actionDoneHistorically"
  | "hasItem"
  | "hasFlag"
  | "flagEquals"
  | "flagAtLeast"
  | "flagAtMost"
  | "custom";

export type ActionConditionJoin = "and" | "or";
export type ActionRepetitionMode = "once" | "reusable" | "repeatable";
export type ActionComparisonOperator = "=" | "<=" | ">=";
export type ActionNumberOperation = "add" | "subtract";

export type ActionComparison = {
  operator: ActionComparisonOperator;
  value: JsonPrimitive;
};

export type ActionCondition = {
  condition: ActionConditionType;
  value: string;
  not: boolean;
  amount?: number;
  comparisonValue?: string;
  check?: ActionComparison;
};

export type ActionRevealCondition = ActionCondition & {
  description: string;
};

export type ActionEffectType =
  | "addLog"
  | "changeLocation"
  | "cutDecay"
  | "restoreEnergy"
  | "spendEnergy"
  | "setEnergy"
  | "addItem"
  | "useItem"
  | "setFlag"
  | "increaseFlag"
  | "decreaseFlag"
  | "clearFlag"
  | "custom";

export type ActionEffect = {
  effect: ActionEffectType;
  value: string;
  amount?: number;
  flagValue?: string;
  operation?: ActionNumberOperation;
  operand?: number;
};

export type ActionDefinition = {
  uuid: string;
  title: string;
  flavour: string;
  weight: number;
  repeatable: boolean;
  stopOnRepeat: boolean;
  requiredSkill: string;
  conditionJoin: ActionConditionJoin;
  conditions: ActionCondition[];
  revealConditions: ActionRevealCondition[];
  completionEffects: ActionEffect[];
};

export type CreateActionInput = Omit<ActionDefinition, "uuid">;

export function actionRepetitionMode(
  action: Pick<ActionDefinition, "repeatable" | "stopOnRepeat">,
): ActionRepetitionMode {
  if (!action.repeatable) return "once";
  return action.stopOnRepeat ? "reusable" : "repeatable";
}

export function actionConditionIsComplete(condition: ActionCondition) {
  if (!condition.condition || !condition.value) return false;
  if (condition.condition === "custom") return customCheckIsComplete(condition.check);
  if (condition.condition === "hasItem") return validPositiveAmount(condition.amount);
  if (condition.condition === "flagEquals") return Boolean(condition.comparisonValue?.trim());
  if (condition.condition === "flagAtLeast" || condition.condition === "flagAtMost") {
    return validNonNegativeAmount(condition.amount);
  }
  return true;
}

function customCheckIsComplete(check: ActionComparison | undefined) {
  if (!check || !["=", "<=", ">="].includes(check.operator)) return false;
  if (check.value === null || typeof check.value === "boolean") return check.operator === "=";
  if (typeof check.value === "number") return Number.isFinite(check.value);
  return typeof check.value === "string" && check.value.length <= 500;
}

export function actionRevealIsComplete(reveal: ActionRevealCondition) {
  return actionConditionIsComplete(reveal) &&
    reveal.description.trim().length > 0 && reveal.description.trim().length <= 200;
}

export function actionEffectIsComplete(effect: ActionEffect, flags: FlagDefinition[] = []) {
  if (!effect.value.trim()) return false;
  if (effect.effect === "custom") {
    return ["add", "subtract"].includes(effect.operation ?? "") &&
      Number.isFinite(effect.operand) && (effect.operand ?? 0) > 0;
  }
  if (effect.effect === "addLog" || effect.effect === "changeLocation") return true;
  if (effect.effect === "addItem" || effect.effect === "useItem") {
    return validPositiveAmount(effect.amount);
  }
  if (effect.effect === "clearFlag") return flags.some((flag) => flag.uuid === effect.value);
  if (["setFlag", "increaseFlag", "decreaseFlag"].includes(effect.effect)) {
    const flag = flags.find((candidate) => candidate.uuid === effect.value);
    if (!flag) return false;
    if (effect.effect !== "setFlag") return validPositiveAmount(effect.amount);
    if (flag.valueType === "boolean") return true;
    if (flag.valueType === "number") return validNonNegativeAmount(effect.amount);
    return Boolean(effect.flagValue?.trim());
  }
  const value = Number(effect.value);
  return Number.isFinite(value) && value >= 0 && (effect.effect !== "cutDecay" || value > 0);
}

function validPositiveAmount(amount: number | undefined) {
  return Number.isInteger(amount) && (amount ?? 0) > 0;
}

function validNonNegativeAmount(amount: number | undefined) {
  return Number.isInteger(amount) && (amount ?? -1) >= 0;
}

export function listActions(projectUuid: string): Promise<ActionDefinition[]> {
  return apiRequest<ActionDefinition[]>(`/projects/${encodeURIComponent(projectUuid)}/actions`);
}

export function updateAction(
  projectUuid: string,
  actionUuid: string,
  input: CreateActionInput,
): Promise<ActionDefinition> {
  return apiRequest<ActionDefinition>(
    `/projects/${encodeURIComponent(projectUuid)}/actions/${encodeURIComponent(actionUuid)}`,
    {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export function createAction(
  projectUuid: string,
  input: CreateActionInput,
): Promise<ActionDefinition> {
  return apiRequest<ActionDefinition>(`/projects/${encodeURIComponent(projectUuid)}/actions`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
