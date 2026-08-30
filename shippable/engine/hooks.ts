export type OneOrMany<Value> = Value | readonly Value[];

export type StateText<State> = string | ((state: State) => string);

export type StateCondition<State, Metadata = unknown> = (
  (state: State) => boolean
) & {
  readonly metadata?: Metadata;
};

export type StateEffect<State, Metadata = unknown> = (
  (state: State) => State
) & {
  readonly metadata?: Metadata;
};

export function allConditions<State>(
  conditions: readonly StateCondition<State>[],
): StateCondition<State> {
  return (state) => conditions.every((condition) => condition(state));
}

export function anyConditions<State>(
  conditions: readonly StateCondition<State>[],
): StateCondition<State> {
  return (state) => conditions.some((condition) => condition(state));
}

export function notCondition<State>(
  condition: StateCondition<State>,
): StateCondition<State> {
  return (state) => !condition(state);
}
