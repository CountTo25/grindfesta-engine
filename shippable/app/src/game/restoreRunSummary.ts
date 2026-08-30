import type { GameDefinition, RunSummary, TimelineEntry } from "./types";

type UnknownRecord = Record<string, unknown>;
const MAX_SAVED_ENTRIES = 5_000;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function experience(
  value: unknown,
  data: GameDefinition,
  fallback: Record<string, number>,
) {
  const source = record(value);
  return Object.fromEntries(data.skills.map((skill) => [
    skill.uuid,
    number(source[skill.uuid], fallback[skill.uuid] ?? 0),
  ]));
}

export function restoreTimeline(value: unknown): TimelineEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const source = record(entry);
    return typeof source.text === "string"
      ? [{ ts: number(source.ts), text: source.text.slice(0, 2_000) }]
      : [];
  }).slice(-MAX_SAVED_ENTRIES);
}

export function restoreRunSummary(
  value: unknown,
  data: GameDefinition,
  fallback: RunSummary | null,
  persistentFallback: Record<string, number> = {},
): RunSummary | null {
  if (value === null) return null;
  const source = record(value);
  if (Object.keys(source).length === 0) return fallback;
  const hasAction = (uuid: string) => Object.hasOwn(data.actions, uuid);
  const hasLocation = (uuid: string) =>
    data.locations.some((location) => location.uuid === uuid);
  const runExperience = experience(source.runExperience, data, {});
  const persistentExperience = experience(
    source.persistentExperience,
    data,
    persistentFallback,
  );
  const inferredInitial = Object.fromEntries(data.skills.map(({ uuid }) => [
    uuid,
    Math.max(0, (persistentExperience[uuid] ?? 0) - (runExperience[uuid] ?? 0)),
  ]));
  return {
    elapsedMs: number(source.elapsedMs),
    locationUuid: typeof source.locationUuid === "string" && hasLocation(source.locationUuid)
      ? source.locationUuid
      : data.locations[0]?.uuid ?? "",
    completedActions: Array.isArray(source.completedActions)
      ? source.completedActions.filter(
        (entry): entry is string => typeof entry === "string" && hasAction(entry),
      ).slice(-MAX_SAVED_ENTRIES)
      : [],
    runExperience,
    initialPersistentExperience: experience(
      source.initialPersistentExperience,
      data,
      inferredInitial,
    ),
    persistentExperience,
    timeline: restoreTimeline(source.timeline),
  };
}
