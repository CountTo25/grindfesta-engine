import { mountGlassReflections } from "./glassController";
import type { ResolvedGlassOptions } from "./glassTypes";

export type GlassGlowOptions = {
  enabled?: boolean;
  selector?: string;
  radius?: number;
};

const accessibilityQuery =
  "(prefers-reduced-transparency: reduce), (prefers-contrast: more)";

function resolveOptions(
  root: HTMLElement,
  options: GlassGlowOptions,
): ResolvedGlassOptions {
  const glowRadius = options.radius ?? 112;
  return {
    root,
    selector:
      options.selector ??
      ".glass-surface, .glass-menu, .glass-card, .glass-control",
    occluderSelector: ".glass-menu, [data-glass-occluder]",
    scrollFadeSelector: ".glass-scroll-fade",
    canvasClass: "glass-reflection-canvas",
    accentProperty: "--ui-accent",
    glowRadius,
    interiorRadius: glowRadius * (72 / 112),
    edgeWidth: 2,
    maxPixelRatio: 1.5,
  };
}

export function glassGlow(node: HTMLElement, initial: GlassGlowOptions = {}) {
  let options = { enabled: true, ...initial };
  let teardown: (() => void) | undefined;
  const accessibility = window.matchMedia(accessibilityQuery);

  const reconcile = () => {
    teardown?.();
    teardown = options.enabled && !accessibility.matches
      ? mountGlassReflections(resolveOptions(node, options))
      : undefined;
  };
  accessibility.addEventListener("change", reconcile);
  reconcile();

  return {
    update(next: GlassGlowOptions) {
      options = { enabled: true, ...next };
      reconcile();
    },
    destroy() {
      accessibility.removeEventListener("change", reconcile);
      teardown?.();
      teardown = undefined;
    },
  };
}
