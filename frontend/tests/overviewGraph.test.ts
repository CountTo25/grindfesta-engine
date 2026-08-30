import { describe, expect, test } from "bun:test";
import type { ActionDefinition } from "../src/lib/api/actions";
import { buildOverviewGraph, type OverviewSources } from "../src/lib/overviewGraph";

const locations = [
  { uuid: "mine", title: "Mines", flavour: "Underground" },
  { uuid: "town", title: "Town", flavour: "Safe" },
];

function action(input: Partial<ActionDefinition> & Pick<ActionDefinition, "uuid" | "title">) {
  return {
    uuid: input.uuid, title: input.title, flavour: "", weight: 1,
    repeatable: false, stopOnRepeat: false, requiredSkill: "mining",
    conditionJoin: "and", conditions: [], revealConditions: [], completionEffects: [],
    ...input,
  } satisfies ActionDefinition;
}

function sources(actions: ActionDefinition[]): OverviewSources {
  return {
    actions,
    locations,
    skills: [{ uuid: "mining", name: "Mining", icon: "" }],
    items: [{ uuid: "rock", name: "Rock", description: "", capacity: null, autoUse: null }],
    flags: [{ uuid: "door", name: "Door", valueType: "boolean" }],
  };
}

describe("overview graph", () => {
  test("connects locations, action dependencies, travel, and produced items", () => {
    const mine = action({
      uuid: "mine-action", title: "Mine",
      conditions: [{ condition: "location", value: "mine", not: false }],
      completionEffects: [
        { effect: "addItem", value: "rock", amount: 1 },
        { effect: "changeLocation", value: "town" },
      ],
    });
    const trade = action({
      uuid: "trade", title: "Trade",
      conditions: [
        { condition: "location", value: "town", not: false },
        { condition: "actionDoneThisRun", value: "mine-action", not: false },
        { condition: "hasItem", value: "rock", amount: 1, not: false },
      ],
    });
    const graph = buildOverviewGraph(sources([mine, trade]));

    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "location:mine", to: "action:mine-action", kind: "requirement" }),
      expect.objectContaining({ from: "action:mine-action", to: "location:town", kind: "travel" }),
      expect.objectContaining({ from: "action:mine-action", to: "action:trade", kind: "requirement" }),
      expect.objectContaining({ from: "action:mine-action", to: "action:trade", kind: "resource" }),
    ]));
  });

  test("connects reveal checks and reports impossible location requirements", () => {
    const hidden = action({
      uuid: "hidden", title: "Hidden route",
      conditions: [
        { condition: "location", value: "mine", not: false },
        { condition: "location", value: "town", not: false },
      ],
      revealConditions: [{
        condition: "actionDoneHistorically", value: "intro", not: false,
        description: "Remember the way",
      }],
    });
    const intro = action({ uuid: "intro", title: "Introduction" });
    const graph = buildOverviewGraph(sources([intro, hidden]));

    expect(graph.edges).toContainEqual(expect.objectContaining({
      from: "action:intro", to: "action:hidden", kind: "reveal",
    }));
    expect(graph.warnings).toContain("Hidden route requires multiple locations simultaneously.");
  });
});
