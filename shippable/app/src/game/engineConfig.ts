import type { EnergyDrainConfig } from "../engine/mechanics/energy";
import type { SkillProgressionConfig } from "../engine/mechanics/skills";
import type { EngineVariablesData } from "./types";

export function energyDrainConfig(variables: EngineVariablesData): EnergyDrainConfig {
  return {
    doublingSeconds: variables.energyDecayDoublingSeconds,
    multiplier: variables.energyDrainMultiplier,
  };
}

export function skillProgressionConfig(
  variables: EngineVariablesData,
): SkillProgressionConfig {
  return {
    run: {
      experienceCurve: {
        baseExperience: variables.runSkillBaseExperience,
        growthRatio: variables.runSkillExperienceGrowth,
        floorRequirements: false,
      },
      levelModifierRatio: variables.runSkillLevelModifier,
    },
    timeCompression: {
      experienceCurve: {
        baseExperience: variables.persistentSkillBaseExperience,
        growthRatio: variables.persistentSkillExperienceGrowth,
        floorRequirements: false,
      },
      levelModifierRatio: variables.persistentSkillLevelModifier,
    },
  };
}
