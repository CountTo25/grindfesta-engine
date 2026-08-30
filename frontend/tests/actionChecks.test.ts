import { describe, expect, test } from "bun:test";
import {
  actionConditionIsComplete,
  actionEffectIsComplete,
  type ActionCondition,
} from "../src/lib/api/actions";

function custom(value: ActionCondition["check"]): ActionCondition {
  return {
    condition: "custom",
    value: "$.energy.currentEnergy",
    not: false,
    check: value,
  };
}

describe("custom action checks", () => {
  test("accepts typed equality and ordered checks", () => {
    expect(actionConditionIsComplete(custom({ operator: "=", value: null }))).toBeTrue();
    expect(actionConditionIsComplete(custom({ operator: "=", value: true }))).toBeTrue();
    expect(actionConditionIsComplete(custom({ operator: "<=", value: 10 }))).toBeTrue();
    expect(actionConditionIsComplete(custom({ operator: ">=", value: "mine" }))).toBeTrue();
  });

  test("rejects ordering for boolean and null values", () => {
    expect(actionConditionIsComplete(custom({ operator: "<=", value: true }))).toBeFalse();
    expect(actionConditionIsComplete(custom({ operator: ">=", value: null }))).toBeFalse();
  });
});

describe("custom number effects", () => {
  test("requires a numeric operation and positive amount", () => {
    expect(actionEffectIsComplete({
      effect: "custom", value: "$.energy.currentEnergy", operation: "add", operand: 2.5,
    })).toBeTrue();
    expect(actionEffectIsComplete({
      effect: "custom", value: "$.energy.currentEnergy", operation: "subtract", operand: 0,
    })).toBeFalse();
  });
});
