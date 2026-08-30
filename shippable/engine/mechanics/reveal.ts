import type { ActionProgressMap } from "../actions";
import type { StateCondition, StateText } from "../hooks";

export type RevealCheck<State, Metadata = unknown> = {
  revealConditions: readonly StateCondition<State, Metadata>[];
  revealExplanations: readonly StateText<State>[];
};

export type RevealFailure<State> = {
  index: number;
  explanation?: StateText<State>;
};

export type RevealEvaluation<State> = {
  revealed: boolean;
  failures: readonly RevealFailure<State>[];
};

export type RevealableAction<State> = {
  conditions: readonly StateCondition<State, unknown>[];
  repeatable: boolean;
  crossGeneration: boolean;
  revealConditions?: readonly StateCondition<State, unknown>[];
  revealExplanations?: readonly StateText<State>[];
};

export type AvailabilityRuntime<ActionId extends string> = {
  actionProgress: ActionProgressMap<ActionId>;
  persistentActions: readonly ActionId[];
};

export type ActionAvailability<State> = RevealEvaluation<State> & {
  status: "hidden" | "locked" | "available";
  visible: boolean;
  available: boolean;
  hiddenReason?: "unknown" | "completed" | "persistent" | "conditions";
};

export function createRevealCheck<State, Metadata = unknown>(
  condition: StateCondition<State, Metadata>,
  explanation: StateText<State>,
): RevealCheck<State, Metadata> {
  return {
    revealConditions: [condition],
    revealExplanations: [explanation],
  };
}

export function combineRevealChecks<State, Metadata = unknown>(
  checks: readonly RevealCheck<State, Metadata>[],
): RevealCheck<State, Metadata> {
  return {
    revealConditions: checks.flatMap((check) => check.revealConditions),
    revealExplanations: checks.flatMap((check) => check.revealExplanations),
  };
}

export function evaluateRevealChecks<State>(
  state: State,
  conditions: readonly StateCondition<State, unknown>[] = [],
  explanations: readonly StateText<State>[] = [],
): RevealEvaluation<State> {
  const failures = conditions.flatMap((condition, index) =>
    condition(state) ? [] : [{ index, explanation: explanations[index] }]);
  return { revealed: failures.length === 0, failures };
}

export function resolveStateText<State>(
  text: StateText<State> | undefined,
  state: State,
) {
  return typeof text === "function" ? text(state) : (text ?? "");
}

export function evaluateActionAvailability<
  State,
  ActionId extends string,
>(
  state: State,
  actionId: ActionId,
  action: RevealableAction<State> | undefined,
  runtime: AvailabilityRuntime<ActionId>,
): ActionAvailability<State> {
  const hidden = (
    hiddenReason: NonNullable<ActionAvailability<State>["hiddenReason"]>,
  ): ActionAvailability<State> => ({
    status: "hidden",
    visible: false,
    available: false,
    revealed: false,
    failures: [],
    hiddenReason,
  });
  if (!action) return hidden("unknown");
  if (!action.repeatable && runtime.actionProgress[actionId]?.complete) {
    return hidden("completed");
  }
  if (action.crossGeneration && runtime.persistentActions.includes(actionId)) {
    return hidden("persistent");
  }
  if (!action.conditions.every((condition) => condition(state))) {
    return hidden("conditions");
  }
  const reveal = evaluateRevealChecks(
    state,
    action.revealConditions,
    action.revealExplanations,
  );
  return {
    ...reveal,
    status: reveal.revealed ? "available" : "locked",
    visible: true,
    available: reveal.revealed,
  };
}

export function filterActionIds<
  State,
  ActionId extends string,
  Action extends RevealableAction<State>,
>(
  state: State,
  actions: Readonly<Record<ActionId, Action>>,
  runtime: AvailabilityRuntime<ActionId>,
  filter: "visible" | "available",
) {
  return (Object.keys(actions) as ActionId[]).filter((actionId) =>
    evaluateActionAvailability(state, actionId, actions[actionId], runtime)[filter]);
}
