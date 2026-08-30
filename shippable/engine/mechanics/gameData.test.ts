import { describe, expect, test } from "bun:test";
import { changeGameDataNumber, compareGameData, readGameDataField } from "./gameData";

const state = {
  energy: { currentEnergy: 7.5 },
  runtime: { completedActions: ["mine"], currentAction: null },
  flags: { "ore-found": true },
};

describe("active run game data checks", () => {
  test("reads nested object, array, and quoted-key paths", () => {
    expect(readGameDataField(state, "$.energy.currentEnergy")).toBe(7.5);
    expect(readGameDataField(state, "$.runtime.completedActions[0]")).toBe("mine");
    expect(readGameDataField(state, '$.flags["ore-found"]')).toBeTrue();
  });

  test("supports equality and ordered scalar checks", () => {
    expect(compareGameData(state, "$.energy.currentEnergy", ">=", 7)).toBeTrue();
    expect(compareGameData(state, "$.energy.currentEnergy", "<=", 7)).toBeFalse();
    expect(compareGameData(state, "$.runtime.currentAction", "=", null)).toBeTrue();
  });

  test("rejects missing and unsafe paths", () => {
    expect(readGameDataField(state, "$.energy.missing")).toBeUndefined();
    expect(readGameDataField(state, "$.__proto__.polluted")).toBeUndefined();
  });

  test("adds and subtracts numeric fields", () => {
    const mutable = { energy: { currentEnergy: 10 }, label: "energy" };
    expect(changeGameDataNumber(mutable, "$.energy.currentEnergy", "subtract", 2.5))
      .toBe(mutable);
    expect(mutable.energy.currentEnergy).toBe(7.5);
    changeGameDataNumber(mutable, "$.energy.currentEnergy", "add", 1);
    expect(mutable.energy.currentEnergy).toBe(8.5);
    changeGameDataNumber(mutable, "$.label", "add", 1);
    expect(mutable.label).toBe("energy");
  });
});
