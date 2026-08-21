import { writable, type Readable } from "svelte/store";

const storage_key = "simple-rust-svelte:glass-reflections";

function read_preference(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(storage_key) !== "off";
  } catch {
    return true;
  }
}

const preference = writable(read_preference(), (set) => {
  if (typeof window === "undefined") return;
  const handle_storage = (event: StorageEvent) => {
    if (event.key === storage_key) set(event.newValue !== "off");
  };
  window.addEventListener("storage", handle_storage);
  return () => window.removeEventListener("storage", handle_storage);
});

export const glass_reflections_enabled: Readable<boolean> = {
  subscribe: preference.subscribe,
};

export function set_glass_reflections_enabled(enabled: boolean): void {
  preference.set(enabled);
  try {
    localStorage.setItem(storage_key, enabled ? "on" : "off");
  } catch {
    // The in-memory preference remains usable when storage is unavailable.
  }
}
