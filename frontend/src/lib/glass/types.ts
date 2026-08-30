import type { Readable } from "svelte/store";

export type CornerRadii = [number, number, number, number];

export type AffineTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type RoundedRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type GlassTarget = {
  element: HTMLElement;
  bounds: DOMRect | null;
  localRect: RoundedRect | null;
  transform: AffineTransform | null;
  inverseTransform: AffineTransform | null;
  visibleRect: DOMRectReadOnly | null;
  radii: CornerRadii;
  accent: [number, number, number];
  occludesReflection: boolean;
  renderable: boolean;
};

export type ScrollFadeRegion = {
  rect: DOMRect;
  size: number;
  before: boolean;
  after: boolean;
};

export type GlassReflectionOptions = {
  root?: Document | HTMLElement;
  selector?: string;
  occluderSelector?: string;
  scrollFadeSelector?: string;
  canvasClass?: string;
  lowEffectsClass?: string;
  accentProperty?: string;
  glowRadius?: number;
  interiorRadius?: number;
  edgeWidth?: number;
  maxPixelRatio?: number;
  enabled?: Readable<boolean>;
};

export type ResolvedGlassOptions = Required<
  Omit<GlassReflectionOptions, "root" | "enabled">
> & {
  root: Document | HTMLElement;
};

export const defaultGlassOptions = {
  selector: ".glass-surface, .glass-menu, .glass-card, .glass-control",
  occluderSelector: ".glass-menu, [data-glass-occluder]",
  scrollFadeSelector: ".glass-scroll-fade",
  canvasClass: "glass-reflection-canvas",
  lowEffectsClass: "no-glass",
  accentProperty: "--ui-accent",
  glowRadius: 112,
  interiorRadius: 72,
  edgeWidth: 2,
  maxPixelRatio: 1.5,
} satisfies Omit<ResolvedGlassOptions, "root">;

export function resolveGlassOptions(
  options: GlassReflectionOptions,
): ResolvedGlassOptions {
  return {
    ...defaultGlassOptions,
    ...options,
    root: options.root ?? document,
  };
}
