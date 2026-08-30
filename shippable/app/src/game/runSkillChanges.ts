import { getSkillProgression } from "../engine/mechanics/skills";
import { skillProgressionConfig } from "./engineConfig";
import type { GameDefinition, RunSummary } from "./types";

export type RunSkillChange = {
  uuid: string;
  name: string;
  icon: string;
  gainedExperience: number;
  runLevel: [number, number];
  persistentLevel: [number, number];
  modifier: [number, number];
};

export function runSkillChanges(
  data: GameDefinition,
  summary: RunSummary,
): RunSkillChange[] {
  const config = skillProgressionConfig(data.engineVariables);
  return data.skills.flatMap((skill) => {
    const gainedExperience = summary.runExperience[skill.uuid] ?? 0;
    const persistentAfter = summary.persistentExperience[skill.uuid] ?? 0;
    const persistentBefore = summary.initialPersistentExperience[skill.uuid] ?? 0;
    if (gainedExperience <= 0 && persistentAfter === persistentBefore) return [];
    const before = getSkillProgression(
      { run: 0, timeCompression: persistentBefore },
      config,
    );
    const after = getSkillProgression(
      { run: gainedExperience, timeCompression: persistentAfter },
      config,
    );
    return [{
      uuid: skill.uuid,
      name: skill.name,
      icon: skill.icon,
      gainedExperience,
      runLevel: [before.levels.run.level, after.levels.run.level],
      persistentLevel: [
        before.levels.timeCompression.level,
        after.levels.timeCompression.level,
      ],
      modifier: [before.modifiers.total, after.modifiers.total],
    }];
  });
}
