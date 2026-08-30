import {
  experienceToLevel,
  getLevelModifier,
  type ExperienceCurve,
  type LevelProgress,
} from "./experience";

export type SkillLevels = {
  run: number;
  timeCompression: number;
};

export type SkillExperience = {
  run: number;
  timeCompression: number;
};

export type SkillTrackConfig = {
  experienceCurve: ExperienceCurve;
  levelModifierRatio: number;
};

export type SkillProgressionConfig = {
  run: SkillTrackConfig;
  timeCompression: SkillTrackConfig;
};

export type SkillProgression = {
  levels: {
    run: LevelProgress;
    timeCompression: LevelProgress;
  };
  modifiers: {
    run: number;
    timeCompression: number;
    total: number;
  };
};

export const defaultSkillProgressionConfig: Readonly<SkillProgressionConfig> = {
  run: {
    experienceCurve: {
      baseExperience: 9,
      growthRatio: 1.1,
      floorRequirements: false,
    },
    levelModifierRatio: 1.055,
  },
  timeCompression: {
    experienceCurve: {
      baseExperience: 18,
      growthRatio: 1.02,
      floorRequirements: false,
    },
    levelModifierRatio: 1.012,
  },
};

function requireNonNegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
}

export function getSkillLevelModifiers(
  levels: SkillLevels,
  config: SkillProgressionConfig = defaultSkillProgressionConfig,
) {
  const run = getLevelModifier(levels.run, config.run.levelModifierRatio);
  const timeCompression = getLevelModifier(
    levels.timeCompression,
    config.timeCompression.levelModifierRatio,
  );
  return { run, timeCompression, total: run * timeCompression };
}

export function getSkillProgression(
  experience: SkillExperience,
  config: SkillProgressionConfig = defaultSkillProgressionConfig,
): SkillProgression {
  const run = experienceToLevel(experience.run, config.run.experienceCurve);
  const timeCompression = experienceToLevel(
    experience.timeCompression,
    config.timeCompression.experienceCurve,
  );
  return {
    levels: { run, timeCompression },
    modifiers: getSkillLevelModifiers(
      { run: run.level, timeCompression: timeCompression.level },
      config,
    ),
  };
}

export function getSkillProgressGain(
  levels: SkillLevels,
  tickMs: number,
  baseGainRate = 1,
  config: SkillProgressionConfig = defaultSkillProgressionConfig,
) {
  requireNonNegativeFinite(tickMs, "Tick duration");
  requireNonNegativeFinite(baseGainRate, "Base gain rate");
  return (tickMs / 1000) * baseGainRate * getSkillLevelModifiers(levels, config).total;
}

export function addSkillExperience(
  experience: SkillExperience,
  gain: number,
): SkillExperience {
  requireNonNegativeFinite(gain, "Skill experience gain");
  return {
    run: experience.run + gain,
    timeCompression: experience.timeCompression + gain,
  };
}
