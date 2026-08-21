import type { Scroll_fade_region } from "./types";

function erase_fade(
  context: CanvasRenderingContext2D,
  region: Scroll_fade_region,
  origin_x: number,
  origin_y: number,
  edge: "before" | "after",
): void {
  const left = region.rect.left - origin_x;
  const top =
    (edge === "before" ? region.rect.top : region.rect.bottom - region.size) -
    origin_y;
  const gradient = context.createLinearGradient(0, top, 0, top + region.size);
  if (edge === "before") {
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.48, "rgba(0, 0, 0, 0.62)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  } else {
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.52, "rgba(0, 0, 0, 0.62)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
  }
  context.fillStyle = gradient;
  context.fillRect(left, top, region.rect.width, region.size);
}

export function erase_scroll_fades(
  context: CanvasRenderingContext2D,
  regions: Scroll_fade_region[],
  origin_x: number,
  origin_y: number,
  canvas_size: number,
): void {
  context.save();
  context.globalCompositeOperation = "destination-out";
  for (const region of regions) {
    if (
      region.rect.right < origin_x ||
      region.rect.left > origin_x + canvas_size ||
      region.rect.bottom < origin_y ||
      region.rect.top > origin_y + canvas_size
    ) continue;
    if (region.before) erase_fade(context, region, origin_x, origin_y, "before");
    if (region.after) erase_fade(context, region, origin_x, origin_y, "after");
  }
  context.restore();
}
