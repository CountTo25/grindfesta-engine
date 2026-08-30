import type {
  OneOrMany,
  StateCondition,
  StateEffect,
  StateText,
} from "./hooks";

export type ActionReference<ActionId extends string = string> = {
  id: ActionId;
};

export type CurrentAction<ActionId extends string = string> =
  ActionReference<ActionId>;

export type QueuedActionMode = "once" | "max";
export type QueuedActionSource = "manual" | "retrace";

export type QueuedAction<ActionId extends string = string> =
  ActionReference<ActionId> & {
    mode: QueuedActionMode;
    source?: QueuedActionSource;
  };

export type ActionProgress = {
  progress: number;
  complete: boolean;
};

export type ActionProgressMap<ActionId extends string = string> = Partial<
  Record<ActionId, ActionProgress>
>;

export type ActionDefinition<
  State,
  SkillId extends string = string,
  ItemId extends string = string,
  ConditionMetadata = unknown,
  EffectMetadata = unknown,
> = {
  title: StateText<State>;
  skill: SkillId;
  weight: number;
  index?: number;
  conditions: readonly StateCondition<State, ConditionMetadata>[];
  repeatable: boolean;
  crossGeneration: boolean;
  revealConditions?: readonly StateCondition<State, ConditionMetadata>[];
  revealExplanations?: readonly StateText<State>[];
  onComplete: OneOrMany<StateEffect<State, EffectMetadata>>;
  flavourText?: StateText<State>;
  stopOnRepeat?: boolean;
  grants?: readonly ItemId[];
};

export type ActionShape = {
  title: unknown;
  skill: string;
  weight: number;
  conditions: readonly unknown[];
  repeatable: boolean;
  crossGeneration: boolean;
  onComplete: unknown;
};

export function shouldAutoRepeatAction(
  action: Pick<ActionShape, "repeatable"> & { stopOnRepeat?: boolean },
  mode: QueuedActionMode | undefined,
  available: boolean,
) {
  return action.repeatable && !action.stopOnRepeat && mode !== "once" && available;
}

export type ActionRepository<
  ActionId extends string,
  Definition extends ActionShape,
> = Readonly<Record<ActionId, Definition>>;

export type ActionRegistry<Definitions extends Record<string, ActionShape>> = {
  readonly definitions: Readonly<Definitions>;
  readonly ids: readonly Extract<keyof Definitions, string>[];
  has: (id: string) => id is Extract<keyof Definitions, string>;
  get: <Id extends Extract<keyof Definitions, string>>(
    id: Id,
  ) => Definitions[Id];
  require: (id: string) => Definitions[Extract<keyof Definitions, string>];
};

export function createActionRegistry<
  const Definitions extends Record<string, ActionShape>,
>(definitions: Definitions): ActionRegistry<Definitions> {
  const registered = Object.freeze({ ...definitions }) as Readonly<Definitions>;
  const ids = Object.freeze(Object.keys(registered)) as readonly Extract<
    keyof Definitions,
    string
  >[];

  return {
    definitions: registered,
    ids,
    has: (id): id is Extract<keyof Definitions, string> =>
      Object.hasOwn(registered, id),
    get: (id) => registered[id],
    require: (id) => {
      if (!Object.hasOwn(registered, id)) {
        throw new Error(`Unknown action: ${id}`);
      }
      return registered[id as Extract<keyof Definitions, string>];
    },
  };
}
