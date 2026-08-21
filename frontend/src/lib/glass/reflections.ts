import { mount_glass_reflections } from "./controller";
import { glass_reflections_enabled } from "./preference";
import {
  resolve_glass_options,
  type Glass_reflection_options,
} from "./types";

type Glass_host = Window & {
  __simple_rust_svelte_glass_cleanup__?: () => void;
};

const accessibility_query =
  "(prefers-reduced-transparency: reduce), (prefers-contrast: more)";

export function init_glass_reflections(
  options: Glass_reflection_options = {},
): () => void {
  const host = window as Glass_host;
  host.__simple_rust_svelte_glass_cleanup__?.();
  const resolved = resolve_glass_options(options);
  const root_element = resolved.root instanceof Document
    ? resolved.root.documentElement
    : resolved.root;
  const had_low_effects_class = root_element.classList.contains(
    resolved.low_effects_class,
  );
  const accessibility = window.matchMedia(accessibility_query);
  let enabled = true;
  let teardown: (() => void) | undefined;

  const reconcile = () => {
    root_element.classList.toggle(resolved.low_effects_class, !enabled);
    teardown?.();
    teardown = enabled && !accessibility.matches
      ? mount_glass_reflections(resolved)
      : undefined;
  };
  const unsubscribe = (options.enabled ?? glass_reflections_enabled).subscribe(
    (next_enabled) => {
      enabled = next_enabled;
      reconcile();
    },
  );
  accessibility.addEventListener("change", reconcile);

  const cleanup = () => {
    unsubscribe();
    accessibility.removeEventListener("change", reconcile);
    teardown?.();
    teardown = undefined;
    root_element.classList.toggle(
      resolved.low_effects_class,
      had_low_effects_class,
    );
    if (host.__simple_rust_svelte_glass_cleanup__ === cleanup) {
      delete host.__simple_rust_svelte_glass_cleanup__;
    }
  };
  host.__simple_rust_svelte_glass_cleanup__ = cleanup;
  return cleanup;
}

export function glass_reflections(
  node: HTMLElement,
  options: Omit<Glass_reflection_options, "root"> = {},
) {
  let cleanup = init_glass_reflections({ ...options, root: node });
  return {
    update(next_options: Omit<Glass_reflection_options, "root">) {
      cleanup();
      cleanup = init_glass_reflections({ ...next_options, root: node });
    },
    destroy() {
      cleanup();
    },
  };
}
