import type { Readable } from "svelte/store";
import { restoreGameState } from "./saveState";
import { applySaveMigrations } from "./migrations";
import type { GameDefinition, GameSave, GeneratedGameState } from "./types";

const SAVE_VERSION = 1;
const AUTOSAVE_INTERVAL_MS = 1_000;

function storageKey(data: GameDefinition) {
  return `grindfesta:${data.project.uuid}`;
}

function savedState(data: GameDefinition, parsed: unknown) {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Partial<GameSave>;
  if (candidate.version === undefined) {
    return { state: parsed, latestMigration: null };
  }
  return candidate.version === SAVE_VERSION && candidate.projectUuid === data.project.uuid
    ? { state: candidate.state, latestMigration: candidate.latestMigration }
    : null;
}

export function loadGameState(
  data: GameDefinition,
  fallback: GeneratedGameState,
) {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(data));
    if (!raw) return fallback;
    const state = savedState(data, JSON.parse(raw));
    return state ? restoreGameState(
      data,
      fallback,
      applySaveMigrations(state.state, state.latestMigration, data.migrations),
    ) : fallback;
  } catch {
    return fallback;
  }
}

export function saveGameState(
  data: GameDefinition,
  state: GeneratedGameState,
) {
  const save: GameSave = {
    version: SAVE_VERSION,
    projectUuid: data.project.uuid,
    projectSchemaVersion: data.schemaVersion,
    savedAt: Date.now(),
    latestMigration: data.migrations.at(-1)?.migrationId ?? null,
    state,
  };
  try {
    globalThis.localStorage?.setItem(storageKey(data), JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function createSaveController(
  data: GameDefinition,
  state: Readable<GeneratedGameState>,
) {
  let latest: GeneratedGameState;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!dirty || !latest) return;
    if (saveGameState(data, latest)) dirty = false;
  };
  const schedule = () => {
    if (timer === undefined) timer = setTimeout(flush, AUTOSAVE_INTERVAL_MS);
  };
  const unsubscribe = state.subscribe((snapshot) => {
    latest = snapshot;
    dirty = true;
    schedule();
  });
  const onVisibilityChange = () => {
    if (globalThis.document?.visibilityState === "hidden") flush();
  };
  globalThis.addEventListener?.("pagehide", flush);
  globalThis.document?.addEventListener("visibilitychange", onVisibilityChange);
  flush();
  return {
    flush,
    destroy: () => {
      unsubscribe();
      flush();
      globalThis.removeEventListener?.("pagehide", flush);
      globalThis.document?.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
