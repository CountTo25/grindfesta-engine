import type { SkillProgressionConfig } from "../../../shippable/engine/mechanics/skills";
import type { EngineVariables } from "./api/projects";

export type EngineVariableGroup = "Action timing" | "Energy" | "Persistent skill" | "Run skill";
export type EngineVariableKey = keyof EngineVariables;
export type EngineVariableDefinition = {
  key: EngineVariableKey;
  group: EngineVariableGroup;
  name: string;
  flavour: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
};

export const engineVariableGroups: EngineVariableGroup[] = [
  "Energy",
  "Action timing",
  "Run skill",
  "Persistent skill",
];

export const engineVariableDefinitions: EngineVariableDefinition[] = [
  {
    key: "baseEnergyCapacity", group: "Energy", name: "Base energy capacity",
    flavour: "Runs begin full at this capacity.", min: 0.0001, max: 1_000_000, step: 0.1,
  },
  {
    key: "initialEnergyDecayRate", group: "Energy", name: "Initial decay per second",
    flavour: "Energy drained per second at the beginning of a run.",
    min: 0, max: 1_000_000, step: 0.001,
  },
  {
    key: "energyDecayDoublingSeconds", group: "Energy", name: "Decay doubling time",
    flavour: "Seconds required for the current decay rate to double.",
    min: 0.1, max: 31_536_000, step: 1,
  },
  {
    key: "energyDrainMultiplier", group: "Energy", name: "Drain multiplier",
    flavour: "Global multiplier applied when energy is drained.",
    min: 0, max: 1_000_000, step: 0.01,
  },
  {
    key: "baseActionProgressPerSecond", group: "Action timing", name: "Base progress per second",
    flavour: "Action weight completed per second at level one.",
    min: 0.0001, max: 1_000_000, step: 0.01,
  },
  {
    key: "ticksPerSecond", group: "Action timing", name: "Ticks per second",
    flavour: "How often actions, energy, and items are evaluated.",
    min: 1, max: 240, step: 1, integer: true,
  },
  {
    key: "runSkillBaseExperience", group: "Run skill", name: "First level experience",
    flavour: "Experience required to reach run level two.",
    min: 0.0001, max: 1_000_000, step: 0.1,
  },
  {
    key: "runSkillExperienceGrowth", group: "Run skill", name: "Requirement growth",
    flavour: "Multiplier applied to each following level requirement.",
    min: 1, max: 100, step: 0.001,
  },
  {
    key: "runSkillLevelModifier", group: "Run skill", name: "Per-level modifier",
    flavour: "Compounding action-speed multiplier for each run level.",
    min: 0.0001, max: 100, step: 0.001,
  },
  {
    key: "persistentSkillBaseExperience", group: "Persistent skill",
    name: "First level experience", flavour: "Experience required to reach persistent level two.",
    min: 0.0001, max: 1_000_000, step: 0.1,
  },
  {
    key: "persistentSkillExperienceGrowth", group: "Persistent skill",
    name: "Requirement growth",
    flavour: "Multiplier applied to each following persistent level requirement.",
    min: 1, max: 100, step: 0.001,
  },
  {
    key: "persistentSkillLevelModifier", group: "Persistent skill", name: "Per-level modifier",
    flavour: "Compounding action-speed multiplier for each persistent level.",
    min: 0.0001, max: 100, step: 0.001,
  },
];

export function engineVariableForm(variables: EngineVariables) {
  return Object.fromEntries(
    engineVariableDefinitions.map(({ key }) => [key, String(variables[key])]),
  ) as Record<EngineVariableKey, string>;
}

export function parseEngineVariables(
  form: Record<EngineVariableKey, string>,
): EngineVariables | null {
  const parsed: Partial<Record<EngineVariableKey, number>> = {};
  for (const definition of engineVariableDefinitions) {
    const value = Number(form[definition.key]);
    const valid = Number.isFinite(value) && value >= definition.min && value <= definition.max &&
      (!definition.integer || Number.isInteger(value));
    if (!valid) return null;
    parsed[definition.key] = value;
  }
  return parsed as EngineVariables;
}

export function previewSkillConfig(variables: EngineVariables): SkillProgressionConfig {
  return {
    run: {
      experienceCurve: { baseExperience: variables.runSkillBaseExperience,
        growthRatio: variables.runSkillExperienceGrowth, floorRequirements: false },
      levelModifierRatio: variables.runSkillLevelModifier,
    },
    timeCompression: {
      experienceCurve: { baseExperience: variables.persistentSkillBaseExperience,
        growthRatio: variables.persistentSkillExperienceGrowth, floorRequirements: false },
      levelModifierRatio: variables.persistentSkillLevelModifier,
    },
  };
}
