import { nearest_point_on_rounded_edge, transform_point } from "./geometry";
import type { Glass_target, Resolved_glass_options } from "./types";

function create_target_path(
  target: Glass_target,
  options: Resolved_glass_options,
  origin_x: number,
  origin_y: number,
): Path2D | null {
  if (!target.local_rect || !target.transform) return null;
  const path = new Path2D();
  const inset = options.edge_width / 2;
  path.roundRect(
    inset,
    inset,
    Math.max(0, target.local_rect.width - options.edge_width),
    Math.max(0, target.local_rect.height - options.edge_width),
    target.radii,
  );
  const canvas_path = new Path2D();
  const transform = target.transform;
  canvas_path.addPath(
    path,
    new DOMMatrix([
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.e - origin_x,
      transform.f - origin_y,
    ]),
  );
  return canvas_path;
}

function paint_interior(
  context: CanvasRenderingContext2D,
  path: Path2D,
  point: { x: number; y: number },
  accent: [number, number, number],
  strength: number,
  radius: number,
): void {
  const [red, green, blue] = accent;
  const gradient = context.createRadialGradient(
    point.x, point.y, 0, point.x, point.y, radius,
  );
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${0.06 * strength})`);
  gradient.addColorStop(0.44, `rgba(${red}, ${green}, ${blue}, ${0.024 * strength})`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
  context.save();
  context.clip(path);
  context.fillStyle = gradient;
  context.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
  context.restore();
}

function paint_edge(
  context: CanvasRenderingContext2D,
  path: Path2D,
  accent: [number, number, number],
  options: Resolved_glass_options,
): void {
  const [red, green, blue] = accent;
  const center = options.glow_radius;
  const gradient = context.createRadialGradient(
    center, center, 0, center, center, center,
  );
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.34)`);
  gradient.addColorStop(0.38, `rgba(${red}, ${green}, ${blue}, 0.17)`);
  gradient.addColorStop(0.72, `rgba(${red}, ${green}, ${blue}, 0.055)`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
  context.lineWidth = options.edge_width;
  context.strokeStyle = gradient;
  context.stroke(path);
}

export function paint_target(
  context: CanvasRenderingContext2D,
  target: Glass_target,
  pointer: { x: number; y: number },
  options: Resolved_glass_options,
  pixel_ratio: number,
): void {
  const { bounds, local_rect, transform, inverse_transform, visible_rect } = target;
  if (!bounds || !local_rect || !transform || !inverse_transform || !visible_rect) return;
  const origin_x = pointer.x - options.glow_radius;
  const origin_y = pointer.y - options.glow_radius;
  const canvas_size = options.glow_radius * 2;
  const left = Math.max(bounds.left, visible_rect.left);
  const top = Math.max(bounds.top, visible_rect.top);
  const right = Math.min(bounds.right, visible_rect.right);
  const bottom = Math.min(bounds.bottom, visible_rect.bottom);
  if (
    right <= left || bottom <= top || right < origin_x ||
    left > origin_x + canvas_size || bottom < origin_y || top > origin_y + canvas_size
  ) return;

  context.save();
  context.beginPath();
  context.rect(left - origin_x, top - origin_y, right - left, bottom - top);
  context.clip();
  const path = create_target_path(target, options, origin_x, origin_y);
  if (!path) {
    context.restore();
    return;
  }
  if (target.occludes_reflection) {
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "#000";
    context.fill(path);
    context.restore();
  }

  const local_pointer = transform_point(inverse_transform, pointer.x, pointer.y);
  const local_point = nearest_point_on_rounded_edge(
    local_pointer.x, local_pointer.y, local_rect, target.radii,
  );
  const reflection = transform_point(transform, local_point.x, local_point.y);
  const distance = Math.hypot(pointer.x - reflection.x, pointer.y - reflection.y);
  const proximity = Math.max(0, 1 - distance / options.glow_radius);
  const strength = proximity * proximity;
  if (strength === 0) {
    context.restore();
    return;
  }

  context.setTransform(pixel_ratio, 0, 0, pixel_ratio, 0, 0);
  const canvas_point = { x: reflection.x - origin_x, y: reflection.y - origin_y };
  paint_interior(
    context, path, canvas_point, target.accent, strength, options.interior_radius,
  );
  context.setTransform(pixel_ratio, 0, 0, pixel_ratio, 0, 0);
  paint_edge(context, path, target.accent, options);
  context.restore();
}
