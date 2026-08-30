import type { GameDefinition, GeneratedGameState } from "./types";

export function restoreFlags(
  value: unknown,
  data: GameDefinition,
): GeneratedGameState["flags"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const knownFlags = new Set(data.flags.map((flag) => flag.uuid));
  return Object.fromEntries(Object.entries(value)
    .filter(([uuid, flagValue]) =>
      knownFlags.has(uuid) && (typeof flagValue === "string" || flagValue === null))
    .slice(0, 5_000));
}
