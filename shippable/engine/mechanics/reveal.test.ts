import { describe, expect, test } from "bun:test";
import { evaluateActionAvailability } from "./reveal";

describe("action reveal", () => {
  test("keeps unmet reveal rules visible but locked with authored explanations", () => {
    const state = { hasPass: false };
    const action = {
      conditions: [() => true],
      repeatable: true,
      crossGeneration: false,
      revealConditions: [(value: typeof state) => value.hasPass],
      revealExplanations: ["Find a pass."],
    };
    const runtime = { actionProgress: {}, persistentActions: [] };

    const locked = evaluateActionAvailability(state, "leave", action, runtime);
    expect(locked.status).toBe("locked");
    expect(locked.visible).toBeTrue();
    expect(locked.available).toBeFalse();
    expect(locked.failures[0]?.explanation).toBe("Find a pass.");

    state.hasPass = true;
    expect(evaluateActionAvailability(state, "leave", action, runtime).available).toBeTrue();
  });
});
