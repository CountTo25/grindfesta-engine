import type { Readable } from "svelte/store";

export type Corner_radii = [number, number, number, number];

export type Affine_transform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type Rounded_rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type Glass_target = {
  element: HTMLElement;
  bounds: DOMRect | null;
  local_rect: Rounded_rect | null;
  transform: Affine_transform | null;
  inverse_transform: Affine_transform | null;
  visible_rect: DOMRectReadOnly | null;
  radii: Corner_radii;
  accent: [number, number, number];
  occludes_reflection: boolean;
};

export type Scroll_fade_region = {
  rect: DOMRect;
  size: number;
  before: boolean;
  after: boolean;
};

export type Glass_reflection_options = {
  root?: Document | HTMLElement;
  selector?: string;
  occluder_selector?: string;
  scroll_fade_selector?: string;
  canvas_class?: string;
  low_effects_class?: string;
  accent_property?: string;
  glow_radius?: number;
  interior_radius?: number;
  edge_width?: number;
  max_pixel_ratio?: number;
  enabled?: Readable<boolean>;
};

export type Resolved_glass_options = Required<
  Omit<Glass_reflection_options, "root" | "enabled">
> & {
  root: Document | HTMLElement;
};

export const default_glass_options = {
  selector: ".glass_surface, .glass_menu, .glass_card, .glass_control",
  occluder_selector: ".glass_menu, [data-glass-occluder]",
  scroll_fade_selector: ".glass_scroll_fade",
  canvas_class: "glass_reflection_canvas",
  low_effects_class: "no_glass",
  accent_property: "--ui_accent",
  glow_radius: 112,
  interior_radius: 72,
  edge_width: 2,
  max_pixel_ratio: 1.5,
} satisfies Omit<Resolved_glass_options, "root">;

export function resolve_glass_options(
  options: Glass_reflection_options,
): Resolved_glass_options {
  return {
    ...default_glass_options,
    ...options,
    root: options.root ?? document,
  };
}
