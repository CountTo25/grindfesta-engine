import { describe, expect, test } from "bun:test";
import { restoreRunSummary } from "./restoreRunSummary";
import type { GameDefinition } from "./types";

const data = {
  skills: [{ uuid: "mining" }],
  locations: [{ uuid: "mines" }],
  actions: { mine: {} },
} as unknown as GameDefinition;

describe("saved run summaries", () => {
  test("infers the persistent baseline for summaries from older builds", () => {
    const summary = restoreRunSummary({
      elapsedMs: 5_000,
      locationUuid: "mines",
      completedActions: ["mine"],
      runExperience: { mining: 4 },
      timeline: [{ ts: 4_000, text: "Mined" }],
    }, data, null, { mining: 12 });

    expect(summary?.persistentExperience.mining).toBe(12);
    expect(summary?.initialPersistentExperience.mining).toBe(8);
  });
});
