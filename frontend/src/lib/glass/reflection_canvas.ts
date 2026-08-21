import { erase_scroll_fades } from "./fade_painter";
import { paint_target } from "./reflection_painter";
import type {
  Glass_target,
  Resolved_glass_options,
  Scroll_fade_region,
} from "./types";

export type Reflection_canvas = {
  render: (
    pointer: { x: number; y: number } | null,
    targets: Glass_target[],
    fades: Scroll_fade_region[],
  ) => void;
  resize: () => void;
  destroy: () => void;
};

export function create_reflection_canvas(
  options: Resolved_glass_options,
): Reflection_canvas | null {
  const canvas = document.createElement("canvas");
  canvas.className = options.canvas_class;
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) {
    canvas.remove();
    return null;
  }
  const canvas_size = options.glow_radius * 2;
  let pixel_ratio = 1;

  const resize = () => {
    pixel_ratio = Math.min(window.devicePixelRatio || 1, options.max_pixel_ratio);
    canvas.width = Math.round(canvas_size * pixel_ratio);
    canvas.height = Math.round(canvas_size * pixel_ratio);
    canvas.style.width = `${canvas_size}px`;
    canvas.style.height = `${canvas_size}px`;
  };

  const render = (
    pointer: { x: number; y: number } | null,
    targets: Glass_target[],
    fades: Scroll_fade_region[],
  ) => {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!pointer) return;
    const origin_x = pointer.x - options.glow_radius;
    const origin_y = pointer.y - options.glow_radius;
    canvas.style.transform = `translate3d(${origin_x}px, ${origin_y}px, 0)`;
    context.setTransform(pixel_ratio, 0, 0, pixel_ratio, 0, 0);
    for (const target of targets) {
      paint_target(context, target, pointer, options, pixel_ratio);
    }
    erase_scroll_fades(context, fades, origin_x, origin_y, canvas_size);
  };

  resize();
  return { render, resize, destroy: () => canvas.remove() };
}
