import { get, type Readable, type Writable } from "svelte/store";
import {
  shouldAutoRepeatAction,
  type ActionDefinition,
  type ActionProgressMap,
} from "./actions";
import type { OneOrMany, StateCondition, StateEffect } from "./hooks";
import { createTickLoop, type TickLoop } from "./loop";
import type { InventoryEntry, ItemDefinition } from "./mechanics/items";
import type { QueueRuntimeState } from "./mechanics/queue";
import {
  evaluateActionAvailability,
  filterActionIds,
  type ActionAvailability,
} from "./mechanics/reveal";

export type { InventoryEntry } from "./mechanics/items";

export type CoreRuntimeState<
  ActionId extends string,
  ItemId extends string,
> = QueueRuntimeState<ActionId> & {
  actionProgress: ActionProgressMap<ActionId>;
  completedActions: ActionId[];
  persistentActions: ActionId[];
  inventory: Partial<Record<ItemId, InventoryEntry>>;
  elapsedMs: number;
};

export type CoreItemDefinition<State> = ItemDefinition<State> & {
  consumable: boolean;
  cooldownMs?: number;
  consumeRequirements: OneOrMany<StateCondition<State>>;
  onConsume: OneOrMany<StateEffect<State>>;
};

export type CoreOptions<
  State,
  ActionId extends string,
  SkillId extends string,
  ItemId extends string,
> = {
  state: Writable<State>;
  ticksPerSecond: Readable<number>;
  timeScale: Readable<number>;
  actions: Readonly<Record<ActionId, ActionDefinition<State, SkillId, ItemId>>>;
  items: Readonly<Partial<Record<ItemId, CoreItemDefinition<State>>>>;
  getRuntime: (state: State) => CoreRuntimeState<ActionId, ItemId>;
  getProgressGain: (
    state: State,
    action: ActionDefinition<State, SkillId, ItemId>,
    tickMs: number,
  ) => number;
  prepareTick?: StateEffect<State>;
  applyTickCosts?: (state: State, tickMs: number) => State;
  canTick?: (state: State) => boolean;
  canContinue?: (state: State) => boolean;
  onProgress?: (state: State, actionId: ActionId, gain: number) => State;
  onComplete?: (state: State, actionId: ActionId) => State;
  onHalt?: (state: State) => State;
  autoStart?: boolean;
};

export type CoreEngine<State, ActionId extends string> = {
  loop: TickLoop;
  tick: (tickMs: number) => void;
  canStartAction: (state: State, actionId: ActionId) => boolean;
  getActionAvailability: (state: State, actionId: ActionId) => ActionAvailability<State>;
  getVisibleActionIds: (state: State) => ActionId[];
  getAvailableActionIds: (state: State) => ActionId[];
};

function asArray<Value>(value: OneOrMany<Value>): readonly Value[] {
  return Array.isArray(value) ? value : [value as Value];
}

export function createCore<
  State,
  ActionId extends string,
  SkillId extends string,
  ItemId extends string,
>(options: CoreOptions<State, ActionId, SkillId, ItemId>): CoreEngine<State, ActionId> {
  const runtimeOf = options.getRuntime;
  const availabilityOf = (state: State, actionId: ActionId) =>
    evaluateActionAvailability(state, actionId, options.actions[actionId], runtimeOf(state));
  const canStartAction = (state: State, actionId: ActionId) =>
    availabilityOf(state, actionId).available;
  const getVisibleActionIds = (state: State) =>
    filterActionIds(state, options.actions, runtimeOf(state), "visible");
  const getAvailableActionIds = (state: State) =>
    filterActionIds(state, options.actions, runtimeOf(state), "available");

  const startNextAction = (state: State) => {
    const runtime = runtimeOf(state);
    runtime.currentAction = null;
    runtime.activeQueuedAction = null;
    while (runtime.actionQueue.length > 0) {
      const queued = runtime.actionQueue.shift()!;
      if (!canStartAction(state, queued.id)) continue;
      runtime.activeQueuedAction = queued;
      runtime.currentAction = { id: queued.id };
      break;
    }
    return state;
  };

  const consumeItems = (initialState: State, tickMs: number) => {
    let state = initialState;
    const itemIds = Object.keys(runtimeOf(state).inventory) as ItemId[];
    for (const itemId of itemIds) {
      let entry = runtimeOf(state).inventory[itemId];
      const item = options.items[itemId];
      if (!entry || !item?.consumable) continue;
      entry.cooldownMs = Math.max(0, entry.cooldownMs - tickMs);
      if (entry.amount <= 0 || entry.cooldownMs > 0) continue;
      if (!asArray(item.consumeRequirements).every((check) => check(state))) continue;
      for (const effect of asArray(item.onConsume)) state = effect(state);
      entry = runtimeOf(state).inventory[itemId];
      if (!entry) continue;
      entry.amount -= 1;
      entry.cooldownMs = item.cooldownMs ?? 0;
    }
    return state;
  };

  const completeAction = (initialState: State, actionId: ActionId) => {
    let state = initialState;
    const action = options.actions[actionId];
    let runtime = runtimeOf(state);
    if (!runtime.completedActions.includes(actionId)) runtime.completedActions.push(actionId);
    if (action.crossGeneration && !runtime.persistentActions.includes(actionId)) {
      runtime.persistentActions.push(actionId);
    }
    for (const effect of asArray(action.onComplete)) state = effect(state);
    runtime = runtimeOf(state);
    const progress = (runtime.actionProgress[actionId] ??= { progress: 0, complete: false });
    const active = runtime.activeQueuedAction;
    const canRepeat = shouldAutoRepeatAction(
      action,
      active?.mode,
      canStartAction(state, actionId),
    );
    if (action.repeatable || action.stopOnRepeat) {
      progress.progress = 0;
      progress.complete = false;
    } else {
      progress.complete = true;
    }
    if (!canRepeat) runtime.currentAction = null;
    if (runtime.currentAction === null && active?.id === actionId) {
      runtime.activeQueuedAction = null;
    }
    return options.onComplete?.(state, actionId) ?? state;
  };

  const runTick = (initialState: State, tickMs: number) => {
    let state = options.prepareTick?.(initialState) ?? initialState;
    let runtime = runtimeOf(state);
    if (!runtime.currentAction) return startNextAction(state);
    const actionId = runtime.currentAction.id;
    const action = options.actions[actionId];
    if (!action) return startNextAction(state);
    runtime.elapsedMs += tickMs;
    state = consumeItems(state, tickMs);
    state = options.applyTickCosts?.(state, tickMs) ?? state;
    if (options.canContinue && !options.canContinue(state)) {
      return options.onHalt?.(state) ?? state;
    }
    const gain = options.getProgressGain(state, action, tickMs);
    if (!Number.isFinite(gain)) throw new RangeError("Action progress gain must be finite");
    runtime = runtimeOf(state);
    const progress = (runtime.actionProgress[actionId] ??= { progress: 0, complete: false });
    progress.progress += gain;
    state = options.onProgress?.(state, actionId, gain) ?? state;
    return progress.progress >= action.weight ? completeAction(state, actionId) : state;
  };

  const tick = (tickMs: number) => options.state.update((state) => runTick(state, tickMs));
  const hasWork = () => {
    const state = get(options.state);
    const runtime = runtimeOf(state);
    return (options.canTick?.(state) ?? true) && Boolean(
      runtime.currentAction || runtime.activeQueuedAction || runtime.actionQueue.length,
    );
  };
  const loop = createTickLoop({
    ticksPerSecond: options.ticksPerSecond,
    timeScale: options.timeScale,
    hasWork,
    onTick: ({ tickMs }) => tick(tickMs),
    autoStart: options.autoStart,
  });
  return { loop, tick, canStartAction, getActionAvailability: availabilityOf,
    getVisibleActionIds, getAvailableActionIds };
}
