import { describe, expect, test } from "bun:test";
import { appendGameDataPath, buildActiveRunGameData } from "../src/lib/gameData";

describe("game data field paths", () => {
  test("builds the mutable active-run state shape", () => {
    const project = {
      uuid: "project-id", schemaVersion: 2, name: "Game", description: "Test",
      engineVariables: { baseEnergyCapacity: 10 },
      ui: { componentSet: "glass", controls: {}, variables: {} },
    } as never;
    const snapshot = buildActiveRunGameData(project, [], [], [], [], []);
    expect(Object.keys(snapshot)).toEqual([
      "runtime", "currentLocation", "energy", "runExperience", "flags", "timeline",
    ]);
    expect(snapshot.energy).toEqual({ currentEnergy: 10, maxEnergy: 10 });
  });

  test("uses readable JSON-style object and array paths", () => {
    expect(appendGameDataPath("$.timeline", "0", true)).toBe("$.timeline[0]");
    expect(appendGameDataPath("$.energy", "currentEnergy")).toBe("$.energy.currentEnergy");
    expect(appendGameDataPath("$.flags", "odd key")).toBe('$.flags["odd key"]');
  });
});
