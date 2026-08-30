import { describe, expect, test } from "bun:test";
import { COMPLETION_EFFECTS } from "./effects";
import type { GeneratedGameState } from "./types";

function state() {
  return {
    currentLocation: "mine",
    runtime: { elapsedMs: 1_500, inventory: {} },
    timeline: [],
    energy: { currentEnergy: 5, maxEnergy: 10, energyDrainRate: 0.1 },
  } as unknown as GeneratedGameState;
}

describe("completion effects", () => {
  test("timeline entries are only written by addLog", () => {
    const snapshot = state();
    COMPLETION_EFFECTS.restoreEnergy(1)(snapshot);
    expect(snapshot.timeline).toEqual([]);
    COMPLETION_EFFECTS.addLog("The gate opens.")(snapshot);
    expect(snapshot.timeline).toEqual([{ ts: 1_500, text: "The gate opens." }]);
  });

  test("location effects move the current run", () => {
    const snapshot = state();
    COMPLETION_EFFECTS.changeLocation("forest")(snapshot);
    expect(snapshot.currentLocation).toBe("forest");
  });

  test("energy effects respect run bounds", () => {
    const snapshot = state();
    COMPLETION_EFFECTS.restoreEnergy(20)(snapshot);
    expect(snapshot.energy.currentEnergy).toBe(10);
    COMPLETION_EFFECTS.spendEnergy(20)(snapshot);
    expect(snapshot.energy.currentEnergy).toBe(0);
    COMPLETION_EFFECTS.setEnergy(50)(snapshot);
    expect(snapshot.energy.currentEnergy).toBe(10);
    COMPLETION_EFFECTS.cutDecay(2)(snapshot);
    expect(snapshot.energy.energyDrainRate).toBeCloseTo(0.05);
  });

  test("item effects respect capacity and never underflow", () => {
    const snapshot = state();
    COMPLETION_EFFECTS.addItem("battery", 4, 3)(snapshot);
    expect(snapshot.runtime.inventory.battery?.amount).toBe(3);
    COMPLETION_EFFECTS.useItem("battery", 5)(snapshot);
    expect(snapshot.runtime.inventory.battery?.amount).toBe(0);
  });
});
