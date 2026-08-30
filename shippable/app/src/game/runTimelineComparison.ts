import type { TimelineEntry } from "./types";

export type TimelineComparison = {
  key: string;
  text: string;
  currentMs: number | null;
  previousMs: number | null;
  deltaMs: number | null;
  status: "new" | "missing" | "same" | "changed";
};

export function compareTimelines(
  current: TimelineEntry[],
  previous: TimelineEntry[] = [],
): TimelineComparison[] {
  const previousEntries = indexedTimeline(previous);
  const previousByKey = new Map(previousEntries.map((entry) => [entry.key, entry]));
  const currentEntries = indexedTimeline(current);
  const currentKeys = new Set(currentEntries.map((entry) => entry.key));
  const rows: TimelineComparison[] = currentEntries.map((entry) => {
    const prior = previousByKey.get(entry.key);
    const deltaMs = prior ? entry.ts - prior.ts : null;
    return {
      key: entry.key,
      text: entry.text,
      currentMs: entry.ts,
      previousMs: prior?.ts ?? null,
      deltaMs,
      status: !prior ? "new" as const
        : Math.abs(deltaMs ?? 0) < 1_000 ? "same" as const : "changed" as const,
    };
  });
  return rows.concat(previousEntries.flatMap((entry) => currentKeys.has(entry.key) ? [] : [{
    key: entry.key,
    text: entry.text,
    currentMs: null,
    previousMs: entry.ts,
    deltaMs: null,
    status: "missing" as const,
  }]));
}

function indexedTimeline(entries: TimelineEntry[]) {
  const counts = new Map<string, number>();
  return entries.map((entry) => {
    const occurrence = counts.get(entry.text) ?? 0;
    counts.set(entry.text, occurrence + 1);
    return { ...entry, key: `${entry.text}\u0000${occurrence}` };
  });
}
