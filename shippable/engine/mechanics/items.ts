import type { StateEffect } from "../hooks";

export type InventoryEntry = {
  amount: number;
  cooldownMs: number;
};

export type Inventory<ItemId extends string> = Partial<
  Record<ItemId, InventoryEntry>
>;

export type ItemCapacity<State> = number | null | ((state: State) => number | null);

export type ItemDefinition<State> = {
  capacity: ItemCapacity<State>;
};

export type ItemMechanicsOptions<State, ItemId extends string> = {
  items: Readonly<Record<ItemId, ItemDefinition<State>>>;
  getInventory: (state: State) => Inventory<ItemId>;
};

export type ItemMechanics<State, ItemId extends string> = {
  getItemAmount: (state: State, itemId: ItemId) => number;
  getItemCapacity: (state: State, itemId: ItemId) => number | null;
  addItem: (itemId: ItemId, amount: number) => StateEffect<State>;
  removeItem: (itemId: ItemId, amount: number) => StateEffect<State>;
  fillItemToCapacity: (itemId: ItemId) => StateEffect<State>;
};

function requireAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError("Item amount must be a non-negative finite number");
  }
}

function requireCapacity(capacity: number | null) {
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
    throw new RangeError("Item capacity must be null or a non-negative finite number");
  }
  return capacity;
}

export function createItemMechanics<State, ItemId extends string>(
  options: ItemMechanicsOptions<State, ItemId>,
): ItemMechanics<State, ItemId> {
  const getItemAmount = (state: State, itemId: ItemId) =>
    options.getInventory(state)[itemId]?.amount ?? 0;

  const getItemCapacity = (state: State, itemId: ItemId) => {
    const definition = options.items[itemId];
    if (!definition) throw new Error(`Unknown item: ${itemId}`);
    const capacity = typeof definition.capacity === "function"
      ? definition.capacity(state)
      : definition.capacity;
    return requireCapacity(capacity);
  };

  const ensureEntry = (state: State, itemId: ItemId) =>
    (options.getInventory(state)[itemId] ??= { amount: 0, cooldownMs: 0 });

  const addItem = (itemId: ItemId, amount: number): StateEffect<State> => {
    requireAmount(amount);
    return (state) => {
      const entry = ensureEntry(state, itemId);
      const capacity = getItemCapacity(state, itemId);
      entry.amount = capacity === null
        ? entry.amount + amount
        : Math.min(entry.amount + amount, capacity);
      return state;
    };
  };

  const removeItem = (itemId: ItemId, amount: number): StateEffect<State> => {
    requireAmount(amount);
    return (state) => {
      const entry = options.getInventory(state)[itemId];
      if (entry) entry.amount = Math.max(0, entry.amount - amount);
      return state;
    };
  };

  const fillItemToCapacity = (itemId: ItemId): StateEffect<State> => (state) => {
    const capacity = getItemCapacity(state, itemId);
    if (capacity !== null) ensureEntry(state, itemId).amount = capacity;
    return state;
  };

  return {
    getItemAmount,
    getItemCapacity,
    addItem,
    removeItem,
    fillItemToCapacity,
  };
}
