import { describe, expect, test } from "bun:test";
import { shouldAutoRepeatAction } from "./actions";

describe("action repetition", () => {
  test("reusable actions stop after each completion", () => {
    const reusable = { repeatable: true, stopOnRepeat: true };
    expect(shouldAutoRepeatAction(reusable, "max", true)).toBeFalse();
  });

  test("repeatable actions loop only while available", () => {
    const repeatable = { repeatable: true, stopOnRepeat: false };
    expect(shouldAutoRepeatAction(repeatable, "max", true)).toBeTrue();
    expect(shouldAutoRepeatAction(repeatable, "once", true)).toBeFalse();
    expect(shouldAutoRepeatAction(repeatable, "max", false)).toBeFalse();
  });
});
