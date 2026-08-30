import type {
  ActionReference,
  QueuedAction,
  QueuedActionMode,
  QueuedActionSource,
} from "../actions";
import type { StateEffect } from "../hooks";

export type QueueRuntimeState<ActionId extends string> = {
  currentAction: ActionReference<ActionId> | null;
  activeQueuedAction: QueuedAction<ActionId> | null;
  actionQueue: QueuedAction<ActionId>[];
};

export type QueueEntryOptions = {
  mode?: QueuedActionMode;
  source?: QueuedActionSource;
};

export type QueueMechanicsOptions<State, ActionId extends string> = {
  getQueue: (state: State) => QueueRuntimeState<ActionId>;
  setQueue?: (
    state: State,
    queue: QueueRuntimeState<ActionId>,
  ) => State;
  canEnqueue?: (
    state: State,
    entry: QueuedAction<ActionId>,
  ) => boolean;
  getDefaultMode?: (state: State, actionId: ActionId) => QueuedActionMode;
  defaultSource?: QueuedActionSource;
};

export type QueueMechanics<State, ActionId extends string> = {
  getLiveQueue: (state: State) => readonly QueuedAction<ActionId>[];
  enqueueAction: (
    actionId: ActionId,
    options?: QueueEntryOptions,
  ) => StateEffect<State>;
  replaceWithAction: (
    actionId: ActionId,
    options?: QueueEntryOptions,
  ) => StateEffect<State>;
  replaceQueue: (
    entries: readonly QueuedAction<ActionId>[],
  ) => StateEffect<State>;
  removeFromQueue: (index: number, count?: number) => StateEffect<State>;
  moveQueuedAction: (fromIndex: number, toIndex: number) => StateEffect<State>;
  clearQueue: () => StateEffect<State>;
};

function requireIndex(index: number, label: string) {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function copyQueue<ActionId extends string>(
  queue: QueueRuntimeState<ActionId>,
): QueueRuntimeState<ActionId> {
  return { ...queue, actionQueue: [...queue.actionQueue] };
}

export function createQueueMechanics<State, ActionId extends string>(
  options: QueueMechanicsOptions<State, ActionId>,
): QueueMechanics<State, ActionId> {
  const commit = (state: State, queue: QueueRuntimeState<ActionId>) => {
    if (options.setQueue) return options.setQueue(state, queue);
    Object.assign(options.getQueue(state), queue);
    return state;
  };
  const entryFor = (
    state: State,
    actionId: ActionId,
    entryOptions: QueueEntryOptions = {},
  ): QueuedAction<ActionId> => ({
    id: actionId,
    mode: entryOptions.mode ?? options.getDefaultMode?.(state, actionId) ?? "once",
    source: entryOptions.source ?? options.defaultSource ?? "manual",
  });
  const isAllowed = (state: State, entry: QueuedAction<ActionId>) =>
    options.canEnqueue?.(state, entry) ?? true;
  const getLiveQueue = (state: State) => {
    const queue = options.getQueue(state);
    return queue.activeQueuedAction
      ? [queue.activeQueuedAction, ...queue.actionQueue]
      : [...queue.actionQueue];
  };
  const enqueueAction = (
    actionId: ActionId,
    entryOptions: QueueEntryOptions = {},
  ): StateEffect<State> => (state) => {
    const entry = entryFor(state, actionId, entryOptions);
    if (!isAllowed(state, entry)) return state;
    const queue = copyQueue(options.getQueue(state));
    queue.actionQueue.push(entry);
    return commit(state, queue);
  };
  const replaceWithAction = (
    actionId: ActionId,
    entryOptions: QueueEntryOptions = {},
  ): StateEffect<State> => (state) => {
    const entry = entryFor(state, actionId, entryOptions);
    if (!isAllowed(state, entry)) return state;
    return commit(state, {
      currentAction: null,
      activeQueuedAction: null,
      actionQueue: [entry],
    });
  };
  const replaceQueue = (
    entries: readonly QueuedAction<ActionId>[],
  ): StateEffect<State> => (state) => commit(state, {
    currentAction: null,
    activeQueuedAction: null,
    actionQueue: entries.filter((entry) => isAllowed(state, entry)).map((entry) => ({
      ...entry,
    })),
  });
  const removeFromQueue = (index: number, count = 1): StateEffect<State> => {
    requireIndex(index, "Queue index");
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new RangeError("Queue removal count must be a positive safe integer");
    }
    return (state) => {
      const queue = copyQueue(options.getQueue(state));
      let pendingIndex = index;
      let pendingCount = count;
      if (queue.activeQueuedAction) {
        if (index === 0) {
          queue.currentAction = null;
          queue.activeQueuedAction = null;
          pendingCount -= 1;
        } else {
          pendingIndex -= 1;
        }
      }
      if (pendingCount > 0 && pendingIndex < queue.actionQueue.length) {
        queue.actionQueue.splice(pendingIndex, pendingCount);
      }
      return commit(state, queue);
    };
  };
  const moveQueuedAction = (
    fromIndex: number,
    toIndex: number,
  ): StateEffect<State> => {
    requireIndex(fromIndex, "Source queue index");
    requireIndex(toIndex, "Destination queue index");
    return (state) => {
      const queue = copyQueue(options.getQueue(state));
      if (fromIndex >= queue.actionQueue.length || toIndex >= queue.actionQueue.length) {
        return state;
      }
      const [entry] = queue.actionQueue.splice(fromIndex, 1);
      queue.actionQueue.splice(toIndex, 0, entry);
      return commit(state, queue);
    };
  };
  const clearQueue = (): StateEffect<State> => (state) => commit(state, {
    currentAction: null,
    activeQueuedAction: null,
    actionQueue: [],
  });
  return {
    getLiveQueue,
    enqueueAction,
    replaceWithAction,
    replaceQueue,
    removeFromQueue,
    moveQueuedAction,
    clearQueue,
  };
}
