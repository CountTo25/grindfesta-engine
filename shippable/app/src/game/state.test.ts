import { beforeEach, describe, expect, test } from "bun:test";
import { beginNextRun, endRun, initialState } from "./state";
import { saveGameState } from "./persistence";
import type { GameDefinition } from "./types";

const stored = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  },
});

const definition = {
  schemaVersion: 1,
  project: { uuid: "test-project", schemaVersion: 1 },
  engineVariables: {
    baseEnergyCapacity: 10,
    initialEnergyDecayRate: 0.05,
    energyDecayDoublingSeconds: 180,
    energyDrainMultiplier: 1,
    ticksPerSecond: 20,
    baseActionProgressPerSecond: 1,
    runSkillBaseExperience: 9,
    runSkillExperienceGrowth: 1.1,
    runSkillLevelModifier: 1.055,
    persistentSkillBaseExperience: 18,
    persistentSkillExperienceGrowth: 1.02,
    persistentSkillLevelModifier: 1.012,
  },
  skills: [{ uuid: "skill" }],
  locations: [{ uuid: "location" }],
  items: [],
  flags: [{ uuid: "flag", name: "Visits", valueType: "number" }],
  migrations: [],
  actions: {
    action: { uuid: "action", weight: 10, crossGeneration: true },
  },
} as unknown as GameDefinition;

describe("generated run state", () => {
  beforeEach(() => stored.clear());

  test("energy depletion produces a finished run and a fresh pending run", () => {
    const running = initialState(definition);
    running.energy.currentEnergy = 0;
    running.energy.energyDrainRate = 0.1;
    running.runtime.elapsedMs = 180_000;
    running.runtime.completedActions = ["action"];
    running.runExperience.skill = 4;
    running.timeline.push({ ts: 180_000, text: "Action" });

    expect(running.energy.currentEnergy).toBe(0);
    const ended = endRun(definition, running);
    expect(ended.endedRun).toEqual({
      elapsedMs: 180_000,
      locationUuid: "location",
      completedActions: ["action"],
      runExperience: { skill: 4 },
      initialPersistentExperience: { skill: 0 },
      persistentExperience: { skill: 0 },
      timeline: [{ ts: 180_000, text: "Action" }],
    });
    expect(ended.energy.currentEnergy).toBe(10);
    expect(ended.runtime.elapsedMs).toBe(0);
    const next = beginNextRun(definition, ended);
    expect(next.endedRun).toBeNull();
    expect(next.previousRun).toEqual(ended.endedRun);
  });

  test("restores the complete active run", () => {
    const running = initialState(definition);
    running.runtime.currentAction = { id: "action" };
    running.runtime.activeQueuedAction = { id: "action", mode: "max" };
    running.runtime.actionQueue = [{ id: "action", mode: "once" }];
    running.runtime.actionProgress.action = { progress: 4, complete: false };
    running.runtime.completedActions = ["action"];
    running.runtime.elapsedMs = 12_000;
    running.energy.currentEnergy = 7;
    running.runExperience.skill = 4;
    running.persistentExperience.skill = 9;
    running.historicalActions = ["action"];
    running.timeline = [{ ts: 12_000, text: "Still running" }];

    expect(saveGameState(definition, running)).toBeTrue();
    const restored = initialState(definition);

    expect(restored).toEqual(running);
  });

  test("migrates the old persistent-only save into a fresh run", () => {
    stored.set("grindfesta:test-project", JSON.stringify({
      persistentExperience: { skill: 9 },
      historicalActions: ["action"],
    }));

    const restored = initialState(definition);

    expect(restored.persistentExperience.skill).toBe(9);
    expect(restored.historicalActions).toEqual(["action"]);
    expect(restored.runtime.elapsedMs).toBe(0);
    expect(restored.energy.currentEnergy).toBe(10);
  });

  test("drops references that no longer exist after a rebuild", () => {
    const running = initialState(definition);
    running.runtime.currentAction = { id: "action" };
    running.runtime.actionQueue = [{ id: "action", mode: "once" }];
    running.runtime.actionProgress.action = { progress: 4, complete: false };
    running.historicalActions = ["action"];
    saveGameState(definition, running);
    const rebuilt = { ...definition, actions: {} };

    const restored = initialState(rebuilt);

    expect(restored.runtime.currentAction).toBeNull();
    expect(restored.runtime.actionQueue).toEqual([]);
    expect(restored.runtime.actionProgress).toEqual({});
    expect(restored.historicalActions).toEqual([]);
  });

  test("restores known run flags and drops removed definitions", () => {
    const running = initialState(definition);
    running.flags = { flag: "3", removed: "1" };
    saveGameState(definition, running);

    expect(initialState(definition).flags).toEqual({ flag: "3" });
    expect(initialState({ ...definition, flags: [] }).flags).toEqual({});
  });

  test("applies ordered flag type migrations to existing saves", () => {
    const running = initialState(definition);
    running.flags.flag = "not-a-number";
    saveGameState(definition, running);
    const migrated = {
      ...definition,
      migrations: [{
        migrationId: "number-migration",
        changes: [{
          kind: "flagTypeChange" as const,
          flagUuid: "flag",
          from: "text" as const,
          to: "number" as const,
        }],
      }],
    };

    expect(initialState(migrated).flags.flag).toBe("0");
  });

  test("clamps saved inventory to an edited item capacity", () => {
    const withItem = {
      ...definition,
      items: [{
        uuid: "item",
        name: "Battery",
        description: "Stored charge",
        capacity: 2,
        autoUse: null,
      }],
    };
    const running = initialState(withItem);
    running.runtime.inventory.item = { amount: 5, cooldownMs: 0 };
    saveGameState(withItem, running);

    expect(initialState(withItem).runtime.inventory.item?.amount).toBe(2);
  });

  test("cross-generation actions survive the run transition", () => {
    const running = initialState(definition);
    running.runtime.persistentActions = ["action"];

    expect(endRun(definition, running).runtime.persistentActions).toEqual(["action"]);
  });

  test("keeps the prior summary when the following run ends", () => {
    const first = initialState(definition);
    first.timeline = [{ ts: 1_000, text: "First run" }];
    const second = beginNextRun(definition, endRun(definition, first));
    second.timeline = [{ ts: 800, text: "Second run" }];

    const ended = endRun(definition, second);

    expect(ended.endedRun?.timeline[0]?.text).toBe("Second run");
    expect(ended.previousRun?.timeline[0]?.text).toBe("First run");
  });
});
