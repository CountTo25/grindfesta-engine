import type { StateEffect } from "../hooks";

export type EnergyState = {
  currentEnergy: number;
  maxEnergy: number;
  energyDrainRate: number;
};

export type EnergyDrainConfig = {
  doublingSeconds?: number | null;
  multiplier?: number;
};

export type EnergyDrainResult = {
  energy: EnergyState;
  drainedEnergy: number;
  depleted: boolean;
};

export type EnergyMechanicsOptions<State> = {
  drain?: EnergyDrainConfig;
  getEnergy: (state: State) => EnergyState;
  setEnergy: (state: State, energy: EnergyState) => State;
};

export type EnergyMechanics<State> = {
  getEnergy: (state: State) => EnergyState;
  isDepleted: (state: State) => boolean;
  drain: (tickMs: number) => StateEffect<State>;
  restoreEnergy: (amount: number) => StateEffect<State>;
  spendEnergy: (amount: number) => StateEffect<State>;
  setCurrentEnergy: (amount: number) => StateEffect<State>;
  setEnergyDrainRate: (rate: number) => StateEffect<State>;
  scaleEnergyDrainRate: (factor: number) => StateEffect<State>;
};

const defaultDoublingSeconds = 180;

export function estimateEnergyRemainingMs(
  energy: EnergyState,
  config: EnergyDrainConfig = {},
): number {
  validateEnergy(energy);
  const { doublingSeconds, multiplier } = normalizeDrain(config);
  if (energy.currentEnergy <= 0) return 0;
  const drainRate = energy.energyDrainRate * multiplier;
  if (drainRate <= 0) return Number.POSITIVE_INFINITY;
  if (doublingSeconds === null) {
    return (energy.currentEnergy / drainRate) * 1000;
  }
  const growthRate = Math.LN2 / doublingSeconds;
  const remainingSeconds = Math.log1p(
    (energy.currentEnergy * growthRate) / drainRate,
  ) / growthRate;
  return remainingSeconds * 1000;
}

function requireNonNegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
}

function validateEnergy(energy: EnergyState) {
  requireNonNegativeFinite(energy.currentEnergy, "Current energy");
  requireNonNegativeFinite(energy.maxEnergy, "Maximum energy");
  requireNonNegativeFinite(energy.energyDrainRate, "Energy drain rate");
  return energy;
}

function normalizeDrain(config: EnergyDrainConfig = {}) {
  const doublingSeconds = config.doublingSeconds === undefined
    ? defaultDoublingSeconds
    : config.doublingSeconds;
  const multiplier = config.multiplier ?? 1;
  if (
    doublingSeconds !== null &&
    (!Number.isFinite(doublingSeconds) || doublingSeconds <= 0)
  ) {
    throw new RangeError("Energy drain doubling time must be positive or null");
  }
  requireNonNegativeFinite(multiplier, "Energy drain multiplier");
  return { doublingSeconds, multiplier };
}

export function applyEnergyDrain(
  energy: EnergyState,
  tickMs: number,
  config: EnergyDrainConfig = {},
): EnergyDrainResult {
  validateEnergy(energy);
  requireNonNegativeFinite(tickMs, "Tick duration");
  const normalized = normalizeDrain(config);
  const elapsedSeconds = tickMs / 1000;
  const growth = normalized.doublingSeconds === null
    ? 1
    : 2 ** (elapsedSeconds / normalized.doublingSeconds);
  const energyDrainRate = energy.energyDrainRate * growth;
  const requestedDrain = energyDrainRate * elapsedSeconds * normalized.multiplier;
  const currentEnergy = Math.max(0, energy.currentEnergy - requestedDrain);
  return {
    energy: { ...energy, currentEnergy, energyDrainRate },
    drainedEnergy: energy.currentEnergy - currentEnergy,
    depleted: currentEnergy <= 0,
  };
}

export function createEnergyMechanics<State>(
  options: EnergyMechanicsOptions<State>,
): EnergyMechanics<State> {
  normalizeDrain(options.drain);
  const getEnergy = (state: State) => validateEnergy(options.getEnergy(state));
  const update = (change: (energy: EnergyState) => EnergyState): StateEffect<State> =>
    (state) => options.setEnergy(state, validateEnergy(change(getEnergy(state))));
  const isDepleted = (state: State) => getEnergy(state).currentEnergy <= 0;
  const drain = (tickMs: number): StateEffect<State> => {
    requireNonNegativeFinite(tickMs, "Tick duration");
    return update((energy) => applyEnergyDrain(energy, tickMs, options.drain).energy);
  };
  const restoreEnergy = (amount: number): StateEffect<State> => {
    requireNonNegativeFinite(amount, "Energy restoration");
    return update((energy) => ({
      ...energy,
      currentEnergy: Math.min(energy.currentEnergy + amount, energy.maxEnergy),
    }));
  };
  const spendEnergy = (amount: number): StateEffect<State> => {
    requireNonNegativeFinite(amount, "Energy cost");
    return update((energy) => ({
      ...energy,
      currentEnergy: Math.max(0, energy.currentEnergy - amount),
    }));
  };
  const setCurrentEnergy = (amount: number): StateEffect<State> => {
    requireNonNegativeFinite(amount, "Energy");
    return update((energy) => ({
      ...energy,
      currentEnergy: Math.min(amount, energy.maxEnergy),
    }));
  };
  const setEnergyDrainRate = (rate: number): StateEffect<State> => {
    requireNonNegativeFinite(rate, "Energy drain rate");
    return update((energy) => ({ ...energy, energyDrainRate: rate }));
  };
  const scaleEnergyDrainRate = (factor: number): StateEffect<State> => {
    requireNonNegativeFinite(factor, "Energy drain scale");
    return update((energy) => ({
      ...energy,
      energyDrainRate: energy.energyDrainRate * factor,
    }));
  };
  return {
    getEnergy,
    isDepleted,
    drain,
    restoreEnergy,
    spendEnergy,
    setCurrentEnergy,
    setEnergyDrainRate,
    scaleEnergyDrainRate,
  };
}
