import { describe, expect, test } from "bun:test";
import { allConditions, anyConditions, notCondition } from "./hooks";

type TestState = { value: number };

const above = (threshold: number) => (state: TestState) => state.value > threshold;

describe("condition composition", () => {
  test("joins conditions with and", () => {
    const condition = allConditions([above(1), above(3)]);
    expect(condition({ value: 4 })).toBe(true);
    expect(condition({ value: 2 })).toBe(false);
  });

  test("joins conditions with or", () => {
    const condition = anyConditions([above(5), notCondition(above(0))]);
    expect(condition({ value: 6 })).toBe(true);
    expect(condition({ value: 0 })).toBe(true);
    expect(condition({ value: 2 })).toBe(false);
  });
});
