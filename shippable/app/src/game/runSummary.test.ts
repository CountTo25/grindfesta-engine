import { describe, expect, test } from "bun:test";
import { compareTimelines } from "./runTimelineComparison";

describe("run summary comparisons", () => {
  test("compares repeated timeline entries by occurrence", () => {
    const rows = compareTimelines(
      [{ ts: 800, text: "Mine" }, { ts: 2_000, text: "Mine" }],
      [{ ts: 1_000, text: "Mine" }, { ts: 2_000, text: "Wait" }],
    );
    expect(rows.map(({ status }) => status)).toEqual(["same", "new", "missing"]);
    expect(rows[0]?.deltaMs).toBe(-200);
  });

  test("shows only differences of at least one second", () => {
    const [changed] = compareTimelines(
      [{ ts: 1_000, text: "Mine" }],
      [{ ts: 2_500, text: "Mine" }],
    );
    expect(changed.status).toBe("changed");
    expect(changed.deltaMs).toBe(-1_500);
  });
});
