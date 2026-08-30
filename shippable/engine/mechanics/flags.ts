import type { StateCondition, StateEffect } from "../hooks";

export type FlagValue = string | null;
export type FlagMap<FlagId extends string = string> = Partial<
  Record<FlagId, FlagValue>
>;

export type FlagConditionMetadata<FlagId extends string> = {
  kind: "flagCheck";
  flagId: FlagId;
  comparison: "exists" | "missing" | "atLeast" | "atMost" | "custom";
  target?: number;
};

export type FlagEffectMetadata<FlagId extends string> = {
  kind: "flagEffect";
  flagId: FlagId;
  operation: "set" | "patch" | "increase" | "decrease" | "remove";
};

export type FlagMechanicsOptions<State, FlagId extends string> = {
  getFlags: (state: State) => FlagMap<FlagId>;
  setFlags?: (state: State, flags: FlagMap<FlagId>) => State;
};

export type FlagMechanics<State, FlagId extends string> = {
  getFlag: (state: State, flagId: FlagId) => FlagValue | undefined;
  getNumericFlag: (state: State, flagId: FlagId) => number;
  hasFlag: (state: State, flagId: FlagId) => boolean;
  flag: (
    flagId: FlagId,
    check?: (value: FlagValue) => boolean,
  ) => StateCondition<State, FlagConditionMetadata<FlagId>>;
  noFlag: (flagId: FlagId) => StateCondition<State, FlagConditionMetadata<FlagId>>;
  numericFlagAtLeast: (
    flagId: FlagId,
    target: number,
  ) => StateCondition<State, FlagConditionMetadata<FlagId>>;
  numericFlagAtMost: (
    flagId: FlagId,
    target: number,
  ) => StateCondition<State, FlagConditionMetadata<FlagId>>;
  setFlag: (flagId: FlagId, value?: FlagValue) => StateEffect<State, FlagEffectMetadata<FlagId>>;
  patchFlag: (
    flagId: FlagId,
    patcher: (value: FlagValue) => FlagValue,
  ) => StateEffect<State, FlagEffectMetadata<FlagId>>;
  patchNumericFlag: (
    flagId: FlagId,
    patcher: (value: number) => number,
  ) => StateEffect<State, FlagEffectMetadata<FlagId>>;
  increaseNumericFlag: (
    flagId: FlagId,
    amount?: number,
  ) => StateEffect<State, FlagEffectMetadata<FlagId>>;
  decreaseNumericFlag: (
    flagId: FlagId,
    amount?: number,
    floor?: number,
  ) => StateEffect<State, FlagEffectMetadata<FlagId>>;
  removeFlag: (flagId: FlagId) => StateEffect<State, FlagEffectMetadata<FlagId>>;
};

function requireFinite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
}

export function createFlagMechanics<State, FlagId extends string>(
  options: FlagMechanicsOptions<State, FlagId>,
): FlagMechanics<State, FlagId> {
  const getFlag = (state: State, flagId: FlagId) => options.getFlags(state)[flagId];
  const hasFlag = (state: State, flagId: FlagId) =>
    Object.hasOwn(options.getFlags(state), flagId);
  const getNumericFlag = (state: State, flagId: FlagId) => {
    const parsed = Number.parseInt(getFlag(state, flagId) ?? "0", 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const condition = (
    flagId: FlagId,
    comparison: FlagConditionMetadata<FlagId>["comparison"],
    check: (state: State) => boolean,
    target?: number,
  ) => Object.assign(check, {
    metadata: { kind: "flagCheck" as const, flagId, comparison, target },
  });
  const flag = (flagId: FlagId, check?: (value: FlagValue) => boolean) =>
    condition(flagId, check ? "custom" : "exists", (state) => {
      if (!hasFlag(state, flagId)) return false;
      return check?.(getFlag(state, flagId) ?? null) ?? true;
    });
  const noFlag = (flagId: FlagId) =>
    condition(flagId, "missing", (state) => !hasFlag(state, flagId));
  const numericFlagAtLeast = (flagId: FlagId, target: number) => {
    requireFinite(target, "Flag target");
    return condition(
      flagId,
      "atLeast",
      (state) => hasFlag(state, flagId) && getNumericFlag(state, flagId) >= target,
      target,
    );
  };
  const numericFlagAtMost = (flagId: FlagId, target: number) => {
    requireFinite(target, "Flag target");
    return condition(
      flagId,
      "atMost",
      (state) => getNumericFlag(state, flagId) <= target,
      target,
    );
  };
  const effect = (
    flagId: FlagId,
    operation: FlagEffectMetadata<FlagId>["operation"],
    change: (flags: FlagMap<FlagId>) => void,
  ) => Object.assign(
    (state: State) => {
      const flags = { ...options.getFlags(state) };
      change(flags);
      if (options.setFlags) return options.setFlags(state, flags);
      Object.assign(options.getFlags(state), flags);
      for (const key of Object.keys(options.getFlags(state))) {
        if (!Object.hasOwn(flags, key)) delete options.getFlags(state)[key as FlagId];
      }
      return state;
    },
    { metadata: { kind: "flagEffect" as const, flagId, operation } },
  );
  const setFlag = (flagId: FlagId, value: FlagValue = "1") =>
    effect(flagId, "set", (flags) => void (flags[flagId] = value));
  const patchFlag = (flagId: FlagId, patcher: (value: FlagValue) => FlagValue) =>
    effect(flagId, "patch", (flags) => {
      flags[flagId] = patcher(flags[flagId] ?? null);
    });
  const patchNumericFlag = (flagId: FlagId, patcher: (value: number) => number) =>
    effect(flagId, "patch", (flags) => {
      const current = Number.parseInt(flags[flagId] ?? "0", 10);
      const next = patcher(Number.isNaN(current) ? 0 : current);
      requireFinite(next, "Patched flag value");
      flags[flagId] = next.toString();
    });
  const increaseNumericFlag = (flagId: FlagId, amount = 1) => {
    requireFinite(amount, "Flag increase");
    const increase = patchNumericFlag(flagId, (value) => value + amount);
    return Object.assign(increase, {
      metadata: { kind: "flagEffect" as const, flagId, operation: "increase" as const },
    });
  };
  const decreaseNumericFlag = (flagId: FlagId, amount = 1, floor = 0) => {
    requireFinite(amount, "Flag decrease");
    requireFinite(floor, "Flag floor");
    return effect(flagId, "decrease", (flags) => {
      const current = Number.parseInt(flags[flagId] ?? "0", 10);
      flags[flagId] = Math.max(floor, (Number.isNaN(current) ? 0 : current) - amount).toString();
    });
  };
  const removeFlag = (flagId: FlagId) =>
    effect(flagId, "remove", (flags) => void delete flags[flagId]);
  return {
    getFlag,
    getNumericFlag,
    hasFlag,
    flag,
    noFlag,
    numericFlagAtLeast,
    numericFlagAtMost,
    setFlag,
    patchFlag,
    patchNumericFlag,
    increaseNumericFlag,
    decreaseNumericFlag,
    removeFlag,
  };
}
