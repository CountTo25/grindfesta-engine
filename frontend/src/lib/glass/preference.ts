import { writable, type Readable } from "svelte/store";

const storageKey = "simple-rust-svelte:glass-reflections";

function readPreference(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

const preference = writable(readPreference(), (set) => {
  if (typeof window === "undefined") return;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) set(event.newValue !== "off");
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
});

export const glassReflectionsEnabled: Readable<boolean> = {
  subscribe: preference.subscribe,
};

export function setGlassReflectionsEnabled(enabled: boolean): void {
  preference.set(enabled);
  try {
    localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    // The in-memory preference remains usable when storage is unavailable.
  }
}
