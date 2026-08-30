import { mountGlassReflections } from "./controller";
import { glassReflectionsEnabled } from "./preference";
import {
  resolveGlassOptions,
  type GlassReflectionOptions,
} from "./types";

type GlassHost = Window & {
  grindfestaGlassCleanup?: () => void;
};

const accessibilityQuery =
  "(prefers-reduced-transparency: reduce), (prefers-contrast: more)";

export function initGlassReflections(
  options: GlassReflectionOptions = {},
): () => void {
  const host = window as GlassHost;
  host.grindfestaGlassCleanup?.();
  const resolved = resolveGlassOptions(options);
  const rootElement = resolved.root instanceof Document
    ? resolved.root.documentElement
    : resolved.root;
  const hadLowEffectsClass = rootElement.classList.contains(
    resolved.lowEffectsClass,
  );
  const accessibility = window.matchMedia(accessibilityQuery);
  let enabled = true;
  let teardown: (() => void) | undefined;

  const reconcile = () => {
    rootElement.classList.toggle(resolved.lowEffectsClass, !enabled);
    teardown?.();
    teardown = enabled && !accessibility.matches
      ? mountGlassReflections(resolved)
      : undefined;
  };
  const unsubscribe = (options.enabled ?? glassReflectionsEnabled).subscribe(
    (nextEnabled) => {
      enabled = nextEnabled;
      reconcile();
    },
  );
  accessibility.addEventListener("change", reconcile);

  const cleanup = () => {
    unsubscribe();
    accessibility.removeEventListener("change", reconcile);
    teardown?.();
    teardown = undefined;
    rootElement.classList.toggle(
      resolved.lowEffectsClass,
      hadLowEffectsClass,
    );
    if (host.grindfestaGlassCleanup === cleanup) {
      delete host.grindfestaGlassCleanup;
    }
  };
  host.grindfestaGlassCleanup = cleanup;
  return cleanup;
}

export function glassReflections(
  node: HTMLElement,
  options: Omit<GlassReflectionOptions, "root"> = {},
) {
  let cleanup = initGlassReflections({ ...options, root: node });
  return {
    update(nextOptions: Omit<GlassReflectionOptions, "root">) {
      cleanup();
      cleanup = initGlassReflections({ ...nextOptions, root: node });
    },
    destroy() {
      cleanup();
    },
  };
}
