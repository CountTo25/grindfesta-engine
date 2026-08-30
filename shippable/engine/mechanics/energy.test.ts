import { describe, expect, test } from "bun:test";
import {
  applyEnergyDrain,
  createEnergyMechanics,
  estimateEnergyRemainingMs,
  type EnergyState,
} from "./energy";

describe("energy mechanics", () => {
  test("drain rate doubles over the configured interval", () => {
    const result = applyEnergyDrain(
      { currentEnergy: 10, maxEnergy: 10, energyDrainRate: 0.05 },
      180_000,
    );
    expect(result.energy.energyDrainRate).toBeCloseTo(0.1);
    expect(result.energy.currentEnergy).toBe(0);
    expect(result.depleted).toBe(true);
  });

  test("remaining time accounts for the increasing drain rate", () => {
    const energy = { currentEnergy: 10, maxEnergy: 10, energyDrainRate: 0.05 };
    const remainingMs = estimateEnergyRemainingMs(energy);
    expect(remainingMs).toBeGreaterThan(140_000);
    expect(remainingMs).toBeLessThan(150_000);
  });

  test("restoration and spending stay inside the energy bounds", () => {
    type State = { energy: EnergyState };
    const mechanics = createEnergyMechanics<State>({
      getEnergy: (state) => state.energy,
      setEnergy: (state, energy) => ({ ...state, energy }),
    });
    const state = {
      energy: { currentEnergy: 4, maxEnergy: 10, energyDrainRate: 0.05 },
    };
    expect(mechanics.restoreEnergy(20)(state).energy.currentEnergy).toBe(10);
    expect(mechanics.spendEnergy(20)(state).energy.currentEnergy).toBe(0);
  });
});
