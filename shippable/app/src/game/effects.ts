import type { StateEffect } from "../engine/hooks";
import type { GeneratedGameState } from "./types";

function changeEnergy(
  update: (state: GeneratedGameState) => void,
): StateEffect<GeneratedGameState> {
  return (state) => {
    update(state);
    return state;
  };
}

export const COMPLETION_EFFECTS = {
  addLog: (text: string): StateEffect<GeneratedGameState> => (state) => {
    state.timeline.push({ ts: state.runtime.elapsedMs, text });
    return state;
  },
  changeLocation: (locationUuid: string): StateEffect<GeneratedGameState> => (state) => {
    state.currentLocation = locationUuid;
    return state;
  },
  cutDecay: (factor: number) => changeEnergy((state) => {
    state.energy.energyDrainRate /= factor;
  }),
  restoreEnergy: (amount: number) => changeEnergy((state) => {
    state.energy.currentEnergy = Math.min(
      state.energy.currentEnergy + amount,
      state.energy.maxEnergy,
    );
  }),
  spendEnergy: (amount: number) => changeEnergy((state) => {
    state.energy.currentEnergy = Math.max(0, state.energy.currentEnergy - amount);
  }),
  setEnergy: (amount: number) => changeEnergy((state) => {
    state.energy.currentEnergy = Math.max(0, Math.min(amount, state.energy.maxEnergy));
  }),
  addItem: (
    itemUuid: string,
    amount: number,
    capacity: number | null,
  ): StateEffect<GeneratedGameState> => (state) => {
    const entry = (state.runtime.inventory[itemUuid] ??= { amount: 0, cooldownMs: 0 });
    entry.amount = capacity === null
      ? entry.amount + amount
      : Math.min(capacity, entry.amount + amount);
    return state;
  },
  useItem: (
    itemUuid: string,
    amount: number,
  ): StateEffect<GeneratedGameState> => (state) => {
    const entry = state.runtime.inventory[itemUuid];
    if (entry) entry.amount = Math.max(0, entry.amount - amount);
    return state;
  },
};
