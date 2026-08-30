import type { CoreRuntimeState } from "../engine/core";
import type { ActionDefinition } from "../engine/actions";
import type { EnergyState } from "../engine/mechanics/energy";
import type { SkillExperience } from "../engine/mechanics/skills";

export type ProjectData = {
  uuid: string;
  schemaVersion: number;
  name: string;
  description: string;
  ui: {
    componentSet: string;
    controls: ProjectUiControls;
    variables: Record<string, string>;
  };
};

export type ProjectUiControl = { mode: "text" | "icon"; icon: string };
export type ProjectUiControls = {
  play: ProjectUiControl;
  pause: ProjectUiControl;
  queue: ProjectUiControl;
  energy: ProjectUiControl;
};

export type EngineVariablesData = {
  baseEnergyCapacity: number;
  initialEnergyDecayRate: number;
  energyDecayDoublingSeconds: number;
  energyDrainMultiplier: number;
  ticksPerSecond: number;
  baseActionProgressPerSecond: number;
  runSkillBaseExperience: number;
  runSkillExperienceGrowth: number;
  runSkillLevelModifier: number;
  persistentSkillBaseExperience: number;
  persistentSkillExperienceGrowth: number;
  persistentSkillLevelModifier: number;
};

export type SkillData = {
  uuid: string;
  name: string;
  icon: string;
};

export type LocationData = {
  uuid: string;
  title: string;
  flavour: string;
};

export type ItemData = {
  uuid: string;
  name: string;
  description: string;
  capacity: number | null;
  autoUse: ItemAutoUseData | null;
};

export type ItemAutoUseData = {
  cooldownMs: number;
  conditions: Array<{ condition: "energyMissing"; value: number }>;
  effects: Array<{ effect: "restoreEnergy"; value: number }>;
};

export type FlagData = {
  uuid: string;
  name: string;
  valueType: "boolean" | "number" | "text";
};

export type FlagTypeChange = {
  kind: "flagTypeChange";
  flagUuid: string;
  from: FlagData["valueType"];
  to: FlagData["valueType"];
};

export type SaveMigration = {
  migrationId: string;
  changes: FlagTypeChange[];
};

export type RuntimeAction = ActionDefinition<GeneratedGameState> & {
  uuid: string;
  title: string;
  flavour: string;
  requiredSkill: string;
  movementDestination: string | null;
};

export type GameDefinition = {
  schemaVersion: number;
  project: ProjectData;
  engineVariables: EngineVariablesData;
  skills: SkillData[];
  locations: LocationData[];
  items: ItemData[];
  flags: FlagData[];
  migrations: SaveMigration[];
  actions: Record<string, RuntimeAction>;
};

export type GeneratedGameState = {
  runtime: CoreRuntimeState<string, string>;
  currentLocation: string;
  energy: EnergyState;
  runExperience: Record<string, number>;
  persistentExperience: Record<string, number>;
  runStartPersistentExperience: Record<string, number>;
  historicalActions: string[];
  flags: Partial<Record<string, string | null>>;
  timeline: TimelineEntry[];
  endedRun: RunSummary | null;
  previousRun: RunSummary | null;
};

export type TimelineEntry = { ts: number; text: string };

export type RunSummary = {
  elapsedMs: number;
  locationUuid: string;
  completedActions: string[];
  runExperience: Record<string, number>;
  initialPersistentExperience: Record<string, number>;
  persistentExperience: Record<string, number>;
  timeline: TimelineEntry[];
};

export type GameSave = {
  version: 1;
  projectUuid: string;
  projectSchemaVersion: number;
  savedAt: number;
  latestMigration?: string | null;
  state: GeneratedGameState;
};

export function skillExperience(
  state: GeneratedGameState,
  skillUuid: string,
): SkillExperience {
  return {
    run: state.runExperience[skillUuid] ?? 0,
    timeCompression: state.persistentExperience[skillUuid] ?? 0,
  };
}
