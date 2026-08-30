import type { FlagTypeChange, SaveMigration } from "./types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function convertedFlag(value: unknown, change: FlagTypeChange) {
  if (value === null) return null;
  if (change.to === "boolean") return "1";
  if (change.to === "text") return String(value);
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.min(parsed, 1_000_000).toString()
    : "0";
}

function applyMigration(value: unknown, migration: SaveMigration) {
  const state = record(value);
  const flags = record(state.flags);
  for (const change of migration.changes) {
    if (change.kind !== "flagTypeChange" || !Object.hasOwn(flags, change.flagUuid)) continue;
    flags[change.flagUuid] = convertedFlag(flags[change.flagUuid], change);
  }
  state.flags = flags;
  return state;
}

export function applySaveMigrations(
  value: unknown,
  latestMigration: string | null | undefined,
  migrations: SaveMigration[],
) {
  const latestIndex = latestMigration == null
    ? -1
    : migrations.findIndex((migration) => migration.migrationId === latestMigration);
  return migrations.slice(latestIndex + 1).reduce(applyMigration, value);
}
