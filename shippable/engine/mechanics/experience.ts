import type { StateEffect } from "../hooks";

export type ExperienceCurve = {
  baseExperience: number;
  growthRatio?: number;
  floorRequirements?: boolean;
};

export type LevelProgress = {
  level: number;
  totalExperience: number;
  experienceToCurrentLevel: number;
  experienceForNextLevel: number;
  experienceIntoLevel: number;
  experienceToNextLevel: number;
  progress: number;
};

export type ExperienceMechanicsOptions<State> = {
  curve: ExperienceCurve;
  getExperience: (state: State) => number;
  setExperience: (state: State, experience: number) => State;
};

export type ExperienceMechanics<State> = {
  getLevelProgress: (state: State) => LevelProgress;
  setExperience: (experience: number) => StateEffect<State>;
  addExperience: (experience: number) => StateEffect<State>;
};

function requireNonNegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
}

function normalizeCurve(curve: ExperienceCurve) {
  const growthRatio = curve.growthRatio ?? 1.2;
  if (!Number.isFinite(curve.baseExperience) || curve.baseExperience <= 0) {
    throw new RangeError("Base experience must be a positive finite number");
  }
  if (!Number.isFinite(growthRatio) || growthRatio < 1) {
    throw new RangeError("Experience growth ratio must be at least 1");
  }
  return {
    baseExperience: curve.baseExperience,
    growthRatio,
    floorRequirements: curve.floorRequirements ?? true,
  };
}

export function experienceToLevel(
  totalExperience: number,
  curve: ExperienceCurve,
): LevelProgress {
  requireNonNegativeFinite(totalExperience, "Experience");
  const normalized = normalizeCurve(curve);
  let level = 1;
  let remainingExperience = totalExperience;
  let experienceForNextLevel = normalized.baseExperience;
  let experienceToCurrentLevel = 0;

  while (remainingExperience >= experienceForNextLevel) {
    remainingExperience -= experienceForNextLevel;
    experienceToCurrentLevel += experienceForNextLevel;
    level += 1;
    const nextRequirement = experienceForNextLevel * normalized.growthRatio;
    experienceForNextLevel = normalized.floorRequirements
      ? Math.max(1, Math.floor(nextRequirement))
      : nextRequirement;
  }

  return {
    level,
    totalExperience,
    experienceToCurrentLevel,
    experienceForNextLevel,
    experienceIntoLevel: remainingExperience,
    experienceToNextLevel: experienceForNextLevel - remainingExperience,
    progress: remainingExperience / experienceForNextLevel,
  };
}

export function getLevelModifier(
  level: number,
  growthRatio: number,
  precision = 4,
) {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError("Level must be a positive safe integer");
  }
  if (!Number.isFinite(growthRatio) || growthRatio <= 0) {
    throw new RangeError("Modifier growth ratio must be positive and finite");
  }
  if (!Number.isSafeInteger(precision) || precision < 0 || precision > 15) {
    throw new RangeError("Modifier precision must be a safe integer from 0 to 15");
  }
  const scale = 10 ** precision;
  return Math.round(growthRatio ** (level - 1) * scale) / scale;
}

export function createExperienceMechanics<State>(
  options: ExperienceMechanicsOptions<State>,
): ExperienceMechanics<State> {
  normalizeCurve(options.curve);
  const getLevelProgress = (state: State) =>
    experienceToLevel(options.getExperience(state), options.curve);
  const setExperience = (experience: number): StateEffect<State> => {
    requireNonNegativeFinite(experience, "Experience");
    return (state) => options.setExperience(state, experience);
  };
  const addExperience = (experience: number): StateEffect<State> => {
    requireNonNegativeFinite(experience, "Experience gain");
    return (state) => {
      const nextExperience = options.getExperience(state) + experience;
      requireNonNegativeFinite(nextExperience, "Resulting experience");
      return options.setExperience(state, nextExperience);
    };
  };
  return { getLevelProgress, setExperience, addExperience };
}
