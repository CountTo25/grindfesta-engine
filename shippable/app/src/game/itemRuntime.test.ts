import { describe, expect, test } from "bun:test";
import { createRuntimeItems } from "./itemRuntime";
import type { GeneratedGameState, ItemData } from "./types";

const battery: ItemData = {
  uuid: "battery",
  name: "Battery",
  description: "Restores energy",
  capacity: 10,
  autoUse: {
    cooldownMs: 5_000,
    conditions: [{ condition: "energyMissing", value: 2 }],
    effects: [{ effect: "restoreEnergy", value: 2 }],
  },
};

function state(currentEnergy: number) {
  return {
    energy: { currentEnergy, maxEnergy: 10, energyDrainRate: 0.1 },
  } as GeneratedGameState;
}

describe("generated item runtime", () => {
  test("compiles battery-style auto-use requirements and effects", () => {
    const item = createRuntimeItems([battery]).battery;
    const requirement = Array.isArray(item.consumeRequirements)
      ? item.consumeRequirements[0]
      : item.consumeRequirements;
    const effect = Array.isArray(item.onConsume) ? item.onConsume[0] : item.onConsume;
    expect(item.consumable).toBeTrue();
    expect(item.cooldownMs).toBe(5_000);
    expect(requirement(state(9))).toBeFalse();
    const depleted = state(7);
    expect(requirement(depleted)).toBeTrue();
    expect(effect(depleted).energy.currentEnergy).toBe(9);
  });
});
