import type { CoreItemDefinition } from "../engine/core";
import type { StateCondition, StateEffect } from "../engine/hooks";
import type { GeneratedGameState, ItemData } from "./types";

function compileCondition(
  condition: NonNullable<ItemData["autoUse"]>["conditions"][number],
): StateCondition<GeneratedGameState> {
  if (condition.condition === "energyMissing") {
    return (state) =>
      state.energy.maxEnergy - state.energy.currentEnergy >= condition.value;
  }
  return () => false;
}

function compileEffect(
  effect: NonNullable<ItemData["autoUse"]>["effects"][number],
): StateEffect<GeneratedGameState> {
  if (effect.effect === "restoreEnergy") {
    return (state) => {
      state.energy.currentEnergy = Math.min(
        state.energy.maxEnergy,
        state.energy.currentEnergy + effect.value,
      );
      return state;
    };
  }
  return (state) => state;
}

export function createRuntimeItems(items: ItemData[]) {
  return Object.fromEntries(items.map((item) => {
    const autoUse = item.autoUse;
    const runtime: CoreItemDefinition<GeneratedGameState> = {
      capacity: item.capacity,
      consumable: autoUse !== null,
      cooldownMs: autoUse?.cooldownMs,
      consumeRequirements: autoUse?.conditions.map(compileCondition) ?? [],
      onConsume: autoUse?.effects.map(compileEffect) ?? [],
    };
    return [item.uuid, runtime];
  }));
}
