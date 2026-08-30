import { describe, expect, test } from "bun:test";
import {
  addSkillExperience,
  getSkillLevelModifiers,
  getSkillProgressGain,
  getSkillProgression,
} from "./skills";

describe("dual-track skill progression", () => {
  test("starts both tracks at level one", () => {
    const progression = getSkillProgression({ run: 0, timeCompression: 0 });

    expect(progression.levels.run.level).toBe(1);
    expect(progression.levels.timeCompression.level).toBe(1);
    expect(progression.modifiers).toEqual({ run: 1, timeCompression: 1, total: 1 });
  });

  test("uses the Grindfesta run and time-compression curves", () => {
    const progression = getSkillProgression({ run: 9, timeCompression: 18 });

    expect(progression.levels.run.level).toBe(2);
    expect(progression.levels.timeCompression.level).toBe(2);
    expect(progression.modifiers).toEqual({
      run: 1.055,
      timeCompression: 1.012,
      total: 1.06766,
    });
  });

  test("multiplies both level modifiers into tick progress", () => {
    const levels = { run: 2, timeCompression: 2 };

    expect(getSkillLevelModifiers(levels).total).toBe(1.06766);
    expect(getSkillProgressGain(levels, 50)).toBeCloseTo(0.053383, 8);
  });

  test("awards the same action gain to both tracks", () => {
    expect(addSkillExperience({ run: 4, timeCompression: 12 }, 0.5)).toEqual({
      run: 4.5,
      timeCompression: 12.5,
    });
  });
});
